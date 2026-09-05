import pytest
from fastapi import HTTPException

from app.api.routes.app_releases import verify_release_token
from app.core.config import settings
from app.models import AppRelease
from app.schemas.apps import AppReleaseResponse


@pytest.fixture(autouse=True)
def _restore_release_token():
    original = settings.APP_RELEASES_UPLOAD_TOKEN
    yield
    settings.APP_RELEASES_UPLOAD_TOKEN = original


def test_verify_release_token_rejects_when_not_configured() -> None:
    settings.APP_RELEASES_UPLOAD_TOKEN = None
    with pytest.raises(HTTPException) as exc:
        verify_release_token("Bearer anything")
    assert exc.value.status_code == 503


def test_verify_release_token_rejects_missing_or_malformed_header() -> None:
    settings.APP_RELEASES_UPLOAD_TOKEN = "secret-token"
    with pytest.raises(HTTPException) as exc:
        verify_release_token(None)
    assert exc.value.status_code == 401
    with pytest.raises(HTTPException):
        verify_release_token("secret-token")  # missing "Bearer " prefix


def test_verify_release_token_rejects_wrong_token() -> None:
    settings.APP_RELEASES_UPLOAD_TOKEN = "secret-token"
    with pytest.raises(HTTPException) as exc:
        verify_release_token("Bearer wrong-token")
    assert exc.value.status_code == 401


def test_verify_release_token_accepts_the_configured_token() -> None:
    settings.APP_RELEASES_UPLOAD_TOKEN = "secret-token"
    verify_release_token("Bearer secret-token")  # must not raise


def test_app_release_model_has_the_expected_columns() -> None:
    columns = {column.name for column in AppRelease.__table__.columns}
    assert columns == {
        "id",
        "slug",
        "name",
        "version",
        "platform",
        "storage_key",
        "file_url",
        "file_size",
        "release_notes",
        "created_at",
        "updated_at",
    }


def test_app_release_response_schema_shape() -> None:
    from datetime import UTC, datetime
    from uuid import uuid4

    response = AppReleaseResponse(
        id=uuid4(),
        slug="novamail-android",
        name="Novamail",
        version="1.4.0",
        platform="android",
        file_url="https://api.novarisesa.com/media/releases/novamail-android/abc.apk",
        file_size=59_000_000,
        release_notes=None,
        updated_at=datetime.now(UTC),
    )
    assert response.slug == "novamail-android"
    assert response.release_notes is None
