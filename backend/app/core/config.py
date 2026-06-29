from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DermalAI Backend"
    app_version: str = "0.1.0"
    debug: bool = True
    secret_key: str = "dev-secret-key-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/dermal_clarity"
    upload_dir: str = str(Path(__file__).resolve().parent.parent.parent / "uploads")
    heatmap_dir: str = str(Path(__file__).resolve().parent.parent.parent / "heatmaps")
    report_dir: str = str(Path(__file__).resolve().parent.parent.parent / "reports")
    model_dir: str = str(Path(__file__).resolve().parent.parent.parent / "saved_models")
    allowed_extensions: set[str] = {"jpg", "jpeg", "png", "bmp", "webp"}
    max_file_size_mb: int = 8
    cors_origins: str = "*"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
