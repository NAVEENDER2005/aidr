import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import auth, predict, history

app = FastAPI(
    title="AI-DR Detection API",
    description="AI-Powered Diabetic Retinopathy Detection System",
    version="1.0.0",
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://ai-diabetic-retinopathy.vercel.app",
]
env_origins = os.getenv("CORS_ORIGINS", "*")
if env_origins.strip() == "*":
    origins = ["*"]
else:
    for o in env_origins.split(","):
        stripped = o.strip()
        if stripped and stripped not in origins:
            origins.append(stripped)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
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
    print("[AIDR] Database initialised successfully.")


@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {
        "status": "online",
        "system": "AI-DR Diabetic Retinopathy API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.api_route("/api/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok", "system": "AI-DR Detection"}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(content="", media_type="image/x-icon", status_code=204)

