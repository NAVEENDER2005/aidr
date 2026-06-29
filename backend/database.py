from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import bcrypt
import os
import stat

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.getenv("DB_PATH", os.path.join(BASE_DIR, 'aidr.db'))
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Ensure DB directory and file exists and is writable before SQLAlchemy connects
db_dir = os.path.dirname(DB_PATH)
if db_dir:
    os.makedirs(db_dir, exist_ok=True)

if not os.path.exists(DB_PATH):
    open(DB_PATH, 'w').close()
os.chmod(DB_PATH, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IWGRP | stat.S_IROTH)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, default="")
    role = Column(String, default="doctor")
    created_at = Column(DateTime, default=datetime.utcnow)


class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    patient_name = Column(String, default="Anonymous")
    filename = Column(String, nullable=False)
    stage = Column(String, nullable=False)
    stage_index = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    all_confidences = Column(Text, nullable=False)  # JSON string
    gradcam_path = Column(String, nullable=True)
    original_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def init_db():
    Base.metadata.create_all(bind=engine)
    # Seed default admin user
    db = SessionLocal()
    existing = db.query(User).filter(User.username == "admin").first()
    if not existing:
        admin = User(
            username="admin",
            hashed_password=_hash_pw("admin123"),
            full_name="Dr. Admin",
            role="admin",
        )
        doctor = User(
            username="doctor",
            hashed_password=_hash_pw("doctor123"),
            full_name="Dr. Poongozhali",
            role="doctor",
        )
        db.add(admin)
        db.add(doctor)
        db.commit()
    db.close()
