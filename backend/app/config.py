from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "FinanceTrack API"

    database_url: str = (
        "postgresql+psycopg://financetrack:financetrack_dev@localhost:5432/financetrack"
    )

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 720

    frankfurter_base_url: str = "https://api.frankfurter.dev/v1"
    fx_request_timeout: float = 8.0

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
