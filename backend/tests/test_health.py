from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app


def test_health() -> None:
    response = TestClient(app).get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "novarise-api"}


def test_legacy_coolify_database_url_is_normalized() -> None:
    settings = Settings(
        DATABASE_URL="postgres://user:password@database:5432/novarise",
    )

    assert settings.DATABASE_URL == (
        "postgresql+psycopg://user:password@database:5432/novarise"
    )
