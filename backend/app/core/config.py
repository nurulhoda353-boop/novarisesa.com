from functools import lru_cache

from pydantic import Field, field_validator, model_validator
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
    COOKIE_DOMAIN: str | None = None
    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_TOKEN_DAYS: int = 7
    LOGIN_MAX_ATTEMPTS: int = 8
    LOGIN_WINDOW_MINUTES: int = 15
    INITIAL_ADMIN_EMAIL: str | None = None
    INITIAL_ADMIN_PASSWORD: str | None = None
    MEDIA_ROOT: str = "storage/media"
    MEDIA_PUBLIC_BASE_URL: str = "http://localhost:8000/media"
    MEDIA_MAX_UPLOAD_MB: int = 15

    @field_validator("APP_SECRET_KEY")
    @classmethod
    def validate_secret(cls, value: str, info) -> str:
        if info.data.get("APP_ENV") == "production" and (
            len(value) < 32 or value == "development-only-change-me-please"
        ):
            raise ValueError(
                "APP_SECRET_KEY must be a non-default value containing at least 32 characters in production"
            )
        return value

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @field_validator("TRUSTED_HOSTS")
    @classmethod
    def allow_internal_healthcheck_hosts(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys([*value, "localhost", "127.0.0.1", "testserver"]))

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        if not self.is_production:
            return self
        if (
            len(self.APP_SECRET_KEY) < 32
            or self.APP_SECRET_KEY == "development-only-change-me-please"
        ):
            raise ValueError(
                "APP_SECRET_KEY must be a non-default value containing at least 32 characters in production"
            )
        if "localhost" in self.DATABASE_URL or "127.0.0.1" in self.DATABASE_URL:
            raise ValueError("DATABASE_URL must not point to localhost in production")
        if not self.MEDIA_PUBLIC_BASE_URL.startswith("https://"):
            raise ValueError("MEDIA_PUBLIC_BASE_URL must use HTTPS in production")
        if not self.CORS_ORIGINS or any(
            origin == "*" or not origin.startswith("https://")
            for origin in self.CORS_ORIGINS
        ):
            raise ValueError("CORS_ORIGINS must contain explicit HTTPS origins in production")
        return self

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
