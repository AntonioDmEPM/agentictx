from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_env: str = "development"
    log_level: str = "INFO"
    api_secret_key: str = "change-me-in-production"
    cors_origins: List[str] = ["http://localhost:5173"]

    # Database
    database_url: str = "postgresql+asyncpg://atw:atw_dev_password@db:5432/atw_db"

    # Anthropic — never hardcoded, always env-driven
    anthropic_api_key: str = ""
    llm_reasoning_model: str = "claude-sonnet-4-5"
    llm_fast_model: str = "claude-haiku-4-5-20251001"

    # File storage
    upload_dir: str = "./uploads"


settings = Settings()
