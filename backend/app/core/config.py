from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "SlothSec"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000"]

    # Database: SQLite local persistence
    DATABASE_URL: str = "sqlite:///./slothsec.db"

    # AI Configuration (Local-first Ollama)
    AI_PROVIDER: str = "ollama"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen3:4b"
    OLLAMA_TIMEOUT_SECONDS: int = 180

    # Scanners (Executable paths)
    SEMGREP_BIN: str = "semgrep"
    OSV_SCANNER_BIN: str = "osv-scanner"
    GITLEAKS_BIN: str = "gitleaks"
    SCAN_TIMEOUT_SECONDS: int = 300

    # Observability (Local OpenTelemetry)
    OTEL_ENABLED: bool = True
    OTEL_SERVICE_NAME: str = "slothsec-engine"

    # Optional Sentry (disabled by default, zero-cost local mode unaffected)
    SENTRY_DSN: str = ""
    SENTRY_ENABLED: bool = False

settings = Settings()
