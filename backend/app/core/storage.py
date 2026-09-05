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
EXTENSION_MIME_TYPES = {
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".png": {"image/png"},
    ".gif": {"image/gif"},
    ".webp": {"image/webp"},
    ".pdf": {"application/pdf"},
    ".mp4": {"video/mp4"},
    ".webm": {"video/webm"},
}
ALLOWED_MIME_TYPES = set().union(*EXTENSION_MIME_TYPES.values())


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


def content_matches_mime(content: bytes, mime: str) -> bool:
    signatures = {
        "image/jpeg": lambda value: value.startswith(b"\xff\xd8\xff"),
        "image/png": lambda value: value.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/gif": lambda value: value.startswith((b"GIF87a", b"GIF89a")),
        "image/webp": lambda value: len(value) >= 12
        and value.startswith(b"RIFF")
        and value[8:12] == b"WEBP",
        "application/pdf": lambda value: value.startswith(b"%PDF-"),
        "video/mp4": lambda value: len(value) >= 12 and value[4:8] == b"ftyp",
        "video/webm": lambda value: value.startswith(b"\x1aE\xdf\xa3"),
    }
    validator = signatures.get(mime)
    return bool(validator and validator(content))


async def save_upload(file: UploadFile, *, folder: str | None = None) -> tuple[str, str, str, int]:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File name is required")

    extension = Path(file.filename).suffix.lower()
    mime = file.content_type or "application/octet-stream"
    if (
        extension not in ALLOWED_EXTENSIONS
        or mime not in ALLOWED_MIME_TYPES
        or mime not in EXTENSION_MIME_TYPES.get(extension, set())
    ):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type",
        )

    max_bytes = settings.MEDIA_MAX_UPLOAD_MB * 1024 * 1024
    storage_key = build_storage_key(folder, file.filename)
    destination = media_root() / storage_key
    destination.parent.mkdir(parents=True, exist_ok=True)
    size = 0
    first_chunk = True
    try:
        with destination.open("xb") as output:
            while chunk := await file.read(1024 * 1024):
                if first_chunk:
                    first_chunk = False
                    if not content_matches_mime(chunk, mime):
                        raise HTTPException(
                            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            detail="File content does not match its declared type",
                        )
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


RELEASE_EXTENSIONS = {".apk", ".ipa"}


async def save_release_upload(
    file: UploadFile, *, folder: str, max_mb: int
) -> tuple[str, str, int]:
    """Like save_upload, but for app release binaries (.apk/.ipa) rather
    than CMS media — different size ceiling, different signature check
    (APKs are ZIP archives), and no CMS-media mime allowlist involved."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File name is required")

    extension = Path(file.filename).suffix.lower()
    if extension not in RELEASE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type — expected .apk or .ipa",
        )

    max_bytes = max_mb * 1024 * 1024
    storage_key = build_storage_key(folder, file.filename)
    destination = media_root() / storage_key
    destination.parent.mkdir(parents=True, exist_ok=True)
    size = 0
    first_chunk = True
    try:
        with destination.open("xb") as output:
            while chunk := await file.read(1024 * 1024):
                if first_chunk:
                    first_chunk = False
                    # .apk and .ipa are both ZIP archives under the hood.
                    if not chunk.startswith(b"PK\x03\x04"):
                        raise HTTPException(
                            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            detail="File content does not look like a valid app package",
                        )
                size += len(chunk)
                if size > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds {max_mb}MB limit",
                    )
                output.write(chunk)
        if not size:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Empty file")
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()
    return storage_key, public_url_for(storage_key), size


def delete_stored_file(storage_key: str) -> None:
    root = media_root().resolve()
    path = (root / storage_key).resolve()
    if root not in path.parents:
        raise ValueError("Invalid storage key")
    if path.is_file():
        path.unlink()


def stored_file_exists(storage_key: str) -> bool:
    root = media_root().resolve()
    path = (root / storage_key).resolve()
    return root in path.parents and path.is_file()
