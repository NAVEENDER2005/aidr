import json
import os
import uuid
import traceback
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from database import get_db, Prediction
from ml.model import get_model, UPLOAD_DIR
from routers.auth import get_current_user
from database import User

router = APIRouter(prefix="/api/predict", tags=["predict"])


@router.post("")
async def predict(
    file: UploadFile = File(...),
    patient_name: str = Form(default="Anonymous"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    image_bytes = await file.read()
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 20MB).")

    # Run inference
    try:
        model = get_model()
        result = model.predict(image_bytes, patient_name)
    except Exception as e:
        err_detail = traceback.format_exc()
        print("❌ Model inference error:\n", err_detail)
        raise HTTPException(status_code=500, detail=f"Model error: {str(e)}")

    # Save original image
    file_id = str(uuid.uuid4())
    orig_path = os.path.join(UPLOAD_DIR, f"{file_id}_original.png")
    try:
        with open(orig_path, "wb") as f:
            f.write(image_bytes)
    except Exception as e:
        print("❌ File save error:", e)
        orig_path = None

    # Save Grad-CAM overlay
    overlay_path = None
    if result.get("overlay_b64"):
        try:
            import base64
            overlay_path = os.path.join(UPLOAD_DIR, f"{file_id}_gradcam.png")
            with open(overlay_path, "wb") as f:
                f.write(base64.b64decode(result["overlay_b64"]))
        except Exception as e:
            print("❌ GradCAM save error:", e)

    # Store in DB
    try:
        pred = Prediction(
            user_id=current_user.id,
            patient_name=patient_name,
            filename=file.filename,
            stage=result["stage"],
            stage_index=result["stage_index"],
            confidence=result["confidence"],
            all_confidences=json.dumps(result["all_confidences"]),
            gradcam_path=overlay_path,
            original_path=orig_path,
        )
        db.add(pred)
        db.commit()
        db.refresh(pred)
    except Exception as e:
        err_detail = traceback.format_exc()
        print("❌ DB error:\n", err_detail)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return {
        "id": pred.id,
        "patient_name": patient_name,
        "stage": result["stage"],
        "stage_index": result["stage_index"],
        "confidence": result["confidence"],
        "description": result["description"],
        "color": result["color"],
        "all_confidences": result["all_confidences"],
        "gradcam_b64": result["gradcam_b64"],
        "overlay_b64": result["overlay_b64"],
        "created_at": pred.created_at.isoformat(),
    }
