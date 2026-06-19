import os
from typing import List
from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Internship Management & Monitoring System (IMMS)"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production-1293810293")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 2  # 2 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # 7 days
    
    # Database
    # Defaulting to SQLite for simple local out-of-the-box development, switchable to MySQL in .env
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./imms.db")
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # File Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_FILE_SIZE_MB: int = 50
    
    # AI Assistant
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Geofencing
    OFFICE_LATITUDE: float = float(os.getenv("OFFICE_LATITUDE", "12.9213"))
    OFFICE_LONGITUDE: float = float(os.getenv("OFFICE_LONGITUDE", "80.1220"))
    GEOFENCE_RADIUS_METERS: float = float(os.getenv("GEOFENCE_RADIUS_METERS", "100.0"))
    
    # SMTP Email Settings
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "True").lower() == "true"
    SMTP_SSL: bool = os.getenv("SMTP_SSL", "False").lower() == "true"
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "noreply@tekquora.com")
    EMAILS_FROM_NAME: str = os.getenv("EMAILS_FROM_NAME", "Tekquora IMMS")
    
    # CORS — allow all origins for LAN / multi-device access
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
