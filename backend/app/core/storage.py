from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".pdf",
    ".mp4",
    ".webm",
}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/webm",
}


def media_root() -> Path:
    root = Path(settings.MEDIA_ROOT)
    if not root.is_absolute():
        root = Path.cwd() / root
    root.mkdir(parents=True, exist_ok=True)
    return root


def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r"[^\w.\-]+", "-", name.strip(), flags=re.UNICODE)
    cleaned = cleaned.strip(".-") or "file"
    return cleaned[:180]


def build_storage_key(folder: str | None, file_name: str) -> str:
    safe_folder = re.sub(r"[^\w/\-]+", "", (folder or "uploads").strip("/")) or "uploads"
    unique = uuid.uuid4().hex[:12]
    return f"{safe_folder}/{unique}-{sanitize_filename(file_name)}"


def public_url_for(storage_key: str) -> str:
    base = settings.MEDIA_PUBLIC_BASE_URL.rstrip("/")
    return f"{base}/{storage_key}"


async def save_upload(file: UploadFile, *, folder: str | None = None) -> tuple[str, str, str, int]:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File name is required")

    extension = Path(file.filename).suffix.lower()
    mime = file.content_type or "application/octet-stream"
    if extension not in ALLOWED_EXTENSIONS or mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type",
        )

    max_bytes = settings.MEDIA_MAX_UPLOAD_MB * 1024 * 1024
    storage_key = build_storage_key(folder, file.filename)
    destination = media_root() / storage_key
    destination.parent.mkdir(parents=True, exist_ok=True)
    size = 0
    try:
        with destination.open("xb") as output:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds {settings.MEDIA_MAX_UPLOAD_MB}MB limit",
                    )
                output.write(chunk)
        if not size:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Empty file",
            )
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()
    return storage_key, public_url_for(storage_key), mime, size


def delete_stored_file(storage_key: str) -> None:
    root = media_root().resolve()
    path = (root / storage_key).resolve()
    if root not in path.parents:
        raise ValueError("Invalid storage key")
    if path.is_file():
        path.unlink()
