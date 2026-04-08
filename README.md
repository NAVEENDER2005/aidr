# AI-Powered Diabetic Retinopathy Detection System (AIDR)

> Final Year B.E. Project — Rajalakshmi Institute of Technology  
> Computer & Communication Engineering, April 2026

---

## 🏗️ Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Recharts + react-dropzone |
| Backend | FastAPI (Python 3.10+) |
| ML Model | EfficientNet-B0 (PyTorch) + CLAHE preprocessing |
| Explainability | Grad-CAM (gradient-weighted class activation mapping) |
| Database | SQLite via SQLAlchemy |
| PDF Reports | ReportLab |
| Auth | JWT (python-jose + passlib bcrypt) |

---

## 🚀 Running the Application

### Prerequisites
- **Python 3.10+** — `python3 --version`
- **Node.js 18+** — `node --version`

Open **two terminals** and run one command in each:

### Terminal 1 — Backend

```bash
bash start_backend.sh
```

Backend runs at: **http://localhost:8000**  
API docs (Swagger): **http://localhost:8000/docs**

### Terminal 2 — Frontend

```bash
bash start_frontend.sh
```

Frontend runs at: **http://localhost:5173**

---

## 🔐 Default Login Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin |
| `doctor` | `doctor123` | Doctor |

---

## 📁 Project Structure

```
aidr/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLite models (User, Prediction)
│   ├── requirements.txt     # Python dependencies
│   ├── ml/
│   │   └── model.py         # EfficientNet-B0 + CLAHE + Grad-CAM
│   └── routers/
│       ├── auth.py          # Login / JWT
│       ├── predict.py       # Image upload + inference
│       └── history.py       # Prediction history + PDF report
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx          # Router
│       ├── api.js           # Axios client (JWT auto-inject)
│       ├── index.css        # Dark-mode glassmorphism design system
│       ├── components/
│       │   └── Layout.jsx   # Sidebar + navigation
│       └── pages/
│           ├── LoginPage.jsx
│           ├── Dashboard.jsx
│           ├── UploadPage.jsx
│           ├── ResultPage.jsx
│           └── HistoryPage.jsx
├── start_backend.sh
├── start_frontend.sh
└── README.md
```

---

## 🧠 ML Pipeline

1. **Upload** — User uploads a retinal fundus image (JPG/PNG/BMP/TIFF)
2. **CLAHE** — Contrast Limited Adaptive Histogram Equalization enhances vessel and lesion visibility
3. **EfficientNet-B0** — Extracts features via MBConv blocks and classifies into 5 DR severity stages
4. **Softmax** — Outputs probability distribution across all 5 stages
5. **Grad-CAM** — Computes gradient-weighted class activation map → heatmap overlay
6. **Result** — Stage prediction + confidence score + Grad-CAM overlay + downloadable PDF

### DR Severity Stages

| Stage | Description |
|---|---|
| No DR | No signs of diabetic retinopathy |
| Mild DR | Microaneurysms only |
| Moderate DR | More than just microaneurysms |
| Severe DR | Extensive haemorrhages, no proliferative changes |
| Proliferative DR | Advanced neovascularisation — urgent referral needed |

---

## 🔮 Using a Pre-trained Model

If you have a trained weights file (e.g. from APTOS 2019 or Kaggle DR dataset):

```bash
cp /path/to/your/model_weights.pth backend/ml/model_weights.pth
```

Without this file, the system runs in **demo mode**: real EfficientNet forward pass + real Grad-CAM from actual gradients, with demo stage probabilities for presentation purposes.

---

## 📄 Features

- ✅ Drag-and-drop retinal image upload
- ✅ CLAHE contrast enhancement preprocessing
- ✅ EfficientNet-B0 5-stage DR classification
- ✅ Grad-CAM explainability heatmap overlay
- ✅ Animated confidence bar for all 5 stages
- ✅ JWT-secured login (bcrypt passwords)
- ✅ Prediction history with search & filter by stage
- ✅ Downloadable PDF clinical reports (ReportLab)
- ✅ Dark mode glassmorphism UI
- ✅ Recharts severity distribution bar chart
- ✅ SQLite storage — no external database needed
