import os
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_FILE = os.path.join(ROOT_DIR, ".env")

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
    
    # Database configuration placeholders
    DATABASE_MODE: str = "local"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/cyberscope"
    
    # LLM configuration
    LLM_MODE: str = "ollama"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    OLLAMA_TIMEOUT: float = 30.0
    PROMPT_VERSION: str = "1.0"
    INTELLIGENCE_VERSION: str = "1.0"
    
    # System mode placeholders
    REALTIME_MODE: str = "local"
    OFFLINE_MODE: bool = True
    EXTERNAL_APIS: bool = False
    SECRET_KEY: str = "development-secret-key-change-in-production"

    @property
    def SQLALCHEMY_DATABASE_URL(self) -> str:
        if not self.DATABASE_URL:
            return ""
        import re
        from urllib.parse import quote_plus, unquote
        
        pattern = r'^(postgresql(?:\+[a-zA-Z0-9]+)?://)([^:]+):(.*)@([^@/]+):(\d+)/(.*)$'
        match = re.match(pattern, self.DATABASE_URL)
        if match:
            prefix, user, password, host, port, dbname = match.groups()
            decoded_password = unquote(password)
            encoded_password = quote_plus(decoded_password)
            return f"{prefix}{user}:{encoded_password}@{host}:{port}/{dbname}"
        return self.DATABASE_URL

    @property
    def MASKED_DATABASE_URL(self) -> str:
        if not self.DATABASE_URL:
            return ""
        import re
        pattern = r'^(postgresql(?:\+[a-zA-Z0-9]+)?://)([^:]+):(.*)@([^@/]+):(\d+)/(.*)$'
        match = re.match(pattern, self.DATABASE_URL)
        if match:
            prefix, user, _password, host, port, dbname = match.groups()
            return f"{prefix}{user}:****@{host}:{port}/{dbname}"
        return "postgresql://***:***@localhost:5432/cyberscope"

    model_config = SettingsConfigDict(
        env_file=(ENV_FILE, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
