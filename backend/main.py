from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import init_db
from routers import auth, predict, history

app = FastAPI(
    title="AI-DR Detection API",
    description="AI-Powered Diabetic Retinopathy Detection System",
    version="1.0.0",
)

origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
env_origins = os.getenv("CORS_ORIGINS")
if env_origins:
    origins = [o.strip() for o in env_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(predict.router)
app.include_router(history.router)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def startup_event():
    init_db()
    print("✅ Database initialised.")


@app.get("/api/health")
def health():
    return {"status": "ok", "system": "AI-DR Detection"}
