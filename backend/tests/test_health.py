import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.main import app


def test_health() -> None:
    response = TestClient(app).get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "novarise-api"}
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"


def test_legacy_coolify_database_url_is_normalized() -> None:
    settings = Settings(
        DATABASE_URL="postgres://user:password@database:5432/novarise",
    )

    assert settings.DATABASE_URL == (
        "postgresql+psycopg://user:password@database:5432/novarise"
    )


def test_internal_healthcheck_hosts_are_always_trusted() -> None:
    settings = Settings(TRUSTED_HOSTS=["api.novarisesa.com"])

    assert settings.TRUSTED_HOSTS == [
        "api.novarisesa.com",
        "localhost",
        "127.0.0.1",
        "testserver",
    ]


def test_production_rejects_default_secret() -> None:
    with pytest.raises(ValidationError, match="non-default value"):
        Settings(
            APP_ENV="production",
            APP_SECRET_KEY="development-only-change-me-please",
            DATABASE_URL="postgresql+psycopg://novarise:password@database:5432/novarise",
            CORS_ORIGINS=["https://novarisesa.com"],
            MEDIA_PUBLIC_BASE_URL="https://api.novarisesa.com/media",
        )


def test_production_rejects_insecure_service_origins() -> None:
    with pytest.raises(ValidationError, match="MEDIA_PUBLIC_BASE_URL"):
        Settings(
            APP_ENV="production",
            APP_SECRET_KEY="production-secret-key-with-more-than-32-characters",
            DATABASE_URL="postgresql+psycopg://novarise:password@database:5432/novarise",
            CORS_ORIGINS=["https://novarisesa.com"],
            MEDIA_PUBLIC_BASE_URL="http://api.novarisesa.com/media",
        )


def test_valid_production_configuration_is_accepted() -> None:
    settings = Settings(
        APP_ENV="production",
        APP_SECRET_KEY="production-secret-key-with-more-than-32-characters",
        DATABASE_URL="postgresql+psycopg://novarise:password@database:5432/novarise",
        CORS_ORIGINS=["https://novarisesa.com", "https://my.novarisesa.com"],
        MEDIA_PUBLIC_BASE_URL="https://api.novarisesa.com/media",
        MAIL_CREDENTIAL_SECRET="production-mail-credential-secret-more-than-32-characters",
    )

    assert settings.is_production
