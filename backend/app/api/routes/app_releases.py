import secrets
from contextlib import suppress
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.storage import delete_stored_file, save_release_upload
from app.models import AppRelease
from app.schemas.apps import AppReleaseResponse

router = APIRouter(prefix="/app-releases")
DBSession = Annotated[Session, Depends(get_db)]


def verify_release_token(authorization: Annotated[str | None, Header()] = None) -> None:
    if not settings.APP_RELEASES_UPLOAD_TOKEN:
        raise HTTPException(status_code=503, detail="App release uploads are not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing upload token")
    if not secrets.compare_digest(authorization[7:], settings.APP_RELEASES_UPLOAD_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid upload token")


@router.post(
    "",
    response_model=AppReleaseResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_release_token)],
)
async def upload_release(
    db: DBSession,
    slug: Annotated[str, Form()],
    name: Annotated[str, Form()],
    version: Annotated[str, Form()],
    file: Annotated[UploadFile, File()],
    platform: Annotated[str, Form()] = "android",
    release_notes: Annotated[str | None, Form()] = None,
) -> AppRelease:
    storage_key, url, size = await save_release_upload(
        file, folder=f"releases/{slug}", max_mb=settings.APP_RELEASE_MAX_UPLOAD_MB
    )
    existing = db.scalar(select(AppRelease).where(AppRelease.slug == slug))
    if existing:
        with suppress(ValueError):
            delete_stored_file(existing.storage_key)
        existing.name = name
        existing.version = version
        existing.platform = platform
        existing.storage_key = storage_key
        existing.file_url = url
        existing.file_size = size
        existing.release_notes = release_notes
        db.commit()
        db.refresh(existing)
        return existing
    release = AppRelease(
        slug=slug,
        name=name,
        version=version,
        platform=platform,
        storage_key=storage_key,
        file_url=url,
        file_size=size,
        release_notes=release_notes,
    )
    db.add(release)
    db.commit()
    db.refresh(release)
    return release


@router.get("/{slug}/latest", response_model=AppReleaseResponse)
def latest_release(slug: str, db: DBSession) -> AppRelease:
    release = db.scalar(select(AppRelease).where(AppRelease.slug == slug))
    if not release:
        raise HTTPException(status_code=404, detail="No release found for this app")
    return release
