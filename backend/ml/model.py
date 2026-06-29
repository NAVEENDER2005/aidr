import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision.models as models
import numpy as np
import cv2
import base64
import os
from PIL import Image
import io
import traceback

STAGES = ["No DR", "Mild DR", "Moderate DR", "Severe DR", "Proliferative DR"]
STAGE_COLORS = ["#22c55e", "#84cc16", "#f59e0b", "#f97316", "#ef4444"]
STAGE_DESCRIPTIONS = {
    "No DR":            "No signs of diabetic retinopathy detected. Continue regular annual screening.",
    "Mild DR":          "Microaneurysms only. Monitor closely and maintain good blood sugar control.",
    "Moderate DR":      "More than just microaneurysms. Early treatment may be recommended.",
    "Severe DR":        "Severe non-proliferative DR. Prompt referral to a retinal specialist advised.",
    "Proliferative DR": "Advanced stage with neovascularization. Urgent treatment required.",
}

MODEL_PATH  = os.path.join(os.path.dirname(__file__), "model_weights.pth")
UPLOAD_DIR  = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


class DRModel:
    def __init__(self):
        self.device      = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model       = self._build_model()
        self.gradients   = None
        self.activations = None
        self._hooks      = []
        self._register_hooks()
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225]),
        ])
        print(f"[DRModel] Ready on {self.device}")

    # ── Model construction ────────────────────────────────────────────────────

    def _build_model(self):
        model = models.efficientnet_b0(weights=None)
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.3, inplace=True),
            nn.Linear(model.classifier[1].in_features, 5),
        )
        if os.path.exists(MODEL_PATH):
            try:
                state = torch.load(MODEL_PATH, map_location=self.device)
                model.load_state_dict(state)
                print("[DRModel] Loaded pre-trained weights.")
            except Exception as e:
                print(f"[DRModel] Weight load failed ({e}) — using demo mode.")
        else:
            print("[DRModel] No weights found — demo mode active.")
        # Keep model in train mode so batch-norm layers track gradients
        # (eval freezes BN but grad flow still works)
        model.eval()
        return model.to(self.device)

    # ── Grad-CAM hooks ────────────────────────────────────────────────────────

    def _register_hooks(self):
        for h in self._hooks:
            h.remove()
        self._hooks = []

        def fwd_hook(module, inp, out):
            self.activations = out.clone().detach()

        def bwd_hook(module, grad_in, grad_out):
            if grad_out and grad_out[0] is not None:
                self.gradients = grad_out[0].clone().detach()

        target = self.model.features[-1]
        self._hooks.append(target.register_forward_hook(fwd_hook))
        self._hooks.append(target.register_full_backward_hook(bwd_hook))

    # ── CLAHE preprocessing ───────────────────────────────────────────────────

    def apply_clahe(self, img_pil: Image.Image) -> Image.Image:
        img_np = np.array(img_pil.convert("RGB"))
        try:
            lab    = cv2.cvtColor(img_np, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            clahe  = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            merged = cv2.merge([clahe.apply(l), a, b])
            return Image.fromarray(cv2.cvtColor(merged, cv2.COLOR_LAB2RGB))
        except Exception as e:
            print(f"[DRModel] CLAHE failed ({e}), using raw image.")
            return img_pil

    # ── Main prediction pipeline ──────────────────────────────────────────────

    def predict(self, image_bytes: bytes, patient_name: str = "Anonymous"):
        # 1. Load image
        img_pil   = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_clahe = self.apply_clahe(img_pil)

        # 2. Forward pass — MUST be inside enable_grad for backward to work
        self.gradients   = None
        self.activations = None

        with torch.enable_grad():
            input_t = self.transform(img_clahe).unsqueeze(0).to(self.device)
            input_t.requires_grad_(True)

            self.model.zero_grad()
            output = self.model(input_t)
            probs  = torch.softmax(output, dim=1)[0]
            pred_idx = int(probs.argmax().item())

            # 3. In demo mode override probabilities (but keep real forward pass for Grad-CAM)
            if not os.path.exists(MODEL_PATH):
                rng     = np.random.default_rng(seed=int(sum(image_bytes[:16])))
                weights = rng.dirichlet(np.ones(5) * 0.5)
                weights = weights * np.array([3.0, 2.0, 1.5, 1.0, 0.5])
                weights /= weights.sum()
                pred_idx   = int(np.argmax(weights))
                probs_list = weights.tolist()
            else:
                probs_list = probs.detach().cpu().tolist()

            # 4. Backward pass for Grad-CAM
            try:
                score = output[0, pred_idx]
                score.backward()
            except Exception as e:
                print(f"[DRModel] Backward pass failed: {e}")

        # 5. Generate Grad-CAM (with graceful fallback)
        gradcam_b64, overlay_b64 = self._generate_gradcam(img_clahe)

        stage_name = STAGES[pred_idx]
        confidence = float(max(probs_list)) * 100

        return {
            "stage_index":    pred_idx,
            "stage":          stage_name,
            "confidence":     round(confidence, 2),
            "description":    STAGE_DESCRIPTIONS[stage_name],
            "color":          STAGE_COLORS[pred_idx],
            "all_confidences": {
                STAGES[i]: round(float(p) * 100, 2)
                for i, p in enumerate(probs_list)
            },
            "gradcam_b64":  gradcam_b64,
            "overlay_b64":  overlay_b64,
        }

    # ── Grad-CAM heatmap ──────────────────────────────────────────────────────

    def _generate_gradcam(self, img_pil: Image.Image):
        try:
            if self.gradients is None or self.activations is None:
                print("[DRModel] No gradients — skipping Grad-CAM.")
                return None, None

            grads = self.gradients[0]       # (C, H, W)
            acts  = self.activations[0]     # (C, H, W)
            weights = grads.mean(dim=(1, 2))

            cam = torch.zeros(acts.shape[1:])
            for i, w in enumerate(weights):
                cam += w.item() * acts[i].cpu()
            cam = torch.relu(cam).numpy()

            # Normalise
            c_min, c_max = cam.min(), cam.max()
            if c_max > c_min:
                cam = (cam - c_min) / (c_max - c_min)
            else:
                cam = np.zeros_like(cam)

            img_np      = np.array(img_pil.resize((224, 224)))
            cam_resized = cv2.resize(cam.astype(np.float32), (224, 224))
            heatmap     = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
            heatmap     = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
            overlay     = np.uint8(0.5 * img_np + 0.5 * heatmap)

            def to_b64(arr):
                buf = io.BytesIO()
                Image.fromarray(arr).save(buf, format="PNG")
                return base64.b64encode(buf.getvalue()).decode()

            return to_b64(heatmap), to_b64(overlay)

        except Exception as e:
            print(f"[DRModel] Grad-CAM error: {e}\n{traceback.format_exc()}")
            return None, None


# ── Singleton ─────────────────────────────────────────────────────────────────

_model_instance: DRModel | None = None


def get_model() -> DRModel:
    global _model_instance
    if _model_instance is None:
        _model_instance = DRModel()
    return _model_instance
