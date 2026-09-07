import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "CyberScope"
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    # API settings
    API_V1_STR: str = "/api/v1"
    
    # CORS settings
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Database configuration placeholders (Not connected in Phase 1)
    DATABASE_MODE: str = "local"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/cyberscope"
    
    # LLM configuration placeholders (Not initialized in Phase 1)
    LLM_MODE: str = "ollama"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    
    # System mode placeholders
    REALTIME_MODE: str = "local"
    OFFLINE_MODE: bool = True
    EXTERNAL_APIS: bool = False
    SECRET_KEY: str = "development-secret-key-change-in-production"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
