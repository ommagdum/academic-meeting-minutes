# config/config.py - COMPLETE FIXED VERSION
import os
from pydantic_settings import BaseSettings
from typing import Set

class Settings(BaseSettings):
    # Flask Configuration
    FLASK_HOST: str = "0.0.0.0"
    FLASK_PORT: int = 5001
    DEBUG: bool = False
    
    # File Upload Configuration
    UPLOAD_FOLDER: str = "./uploads"
    MAX_CONTENT_LENGTH: int = 500 * 1024 * 1024  # 500MB
    ALLOWED_EXTENSIONS: Set[str] = {'mp3', 'wav', 'm4a', 'flac', 'ogg', 'webm'}
    
    # Mistral AI Configuration
    MISTRAL_API_KEY: str
    MISTRAL_BASE_URL: str = "https://api.mistral.ai/v1"
    EXTRACTION_MODEL: str = "mistral-medium-latest"
    
    # Whisper Configuration
    # WHISPER_MODEL: str = "base"
    # WHISPER_DEVICE: str = "cpu"
    WHISPER_MODEL: str = "base"  # Use "small" or "medium" for better accuracy with GPU
    WHISPER_DEVICE: str = "mps"  # ⭐ CHANGED FROM "cpu" TO "mps" for M2 GPU
    
    # Processing Configuration
    MAX_AUDIO_DURATION: int = 240
    CLEANUP_UPLOADS: bool = True
    ENABLE_FALLBACK: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # This ignores extra fields in .env

settings = Settings()