from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    APP_NAME: str = "NOVARISE API"
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "development-only-change-me-please"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = "postgresql+psycopg://novarise:novarise@localhost:5432/novarise"
    CORS_ORIGINS: list[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:3001",
            "https://novarisesa.com",
            "https://www.novarisesa.com",
            "https://my.novarisesa.com",
        ]
    )
    TRUSTED_HOSTS: list[str] = Field(
        default=["localhost", "127.0.0.1", "testserver", "api.novarisesa.com"]
    )

    @field_validator("APP_SECRET_KEY")
    @classmethod
    def validate_secret(cls, value: str, info) -> str:
        if info.data.get("APP_ENV") == "production" and len(value) < 32:
            raise ValueError("APP_SECRET_KEY must contain at least 32 characters in production")
        return value

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
