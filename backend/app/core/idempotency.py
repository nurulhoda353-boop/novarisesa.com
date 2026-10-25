"""Idempotency-Key support for NovaFin writes.

A request carrying `Idempotency-Key` is executed once. The first call stores its
response; a repeat with the same key (double-click, flaky-network retry) gets
that stored response back with `Idempotent-Replayed: true` instead of creating
a second invoice. A repeat that arrives while the first is still running gets
409. Failed (non-2xx) calls are forgotten so the user can correct and retry.

The key is scoped to the caller's session cookie so one user's key can never
replay another user's response.
"""

import hashlib
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import NovaFinIdempotencyKey

KEY_HEADER = "idempotency-key"
KEY_TTL = timedelta(hours=24)
PENDING_TIMEOUT = timedelta(seconds=90)
WRITE_METHODS = {"POST", "PATCH", "PUT", "DELETE"}


def hash_key(raw_key: str, session_scope: str) -> str:
    return hashlib.sha256(f"{session_scope}\x00{raw_key}".encode()).hexdigest()


def _claim(key_hash: str, method: str, path: str) -> NovaFinIdempotencyKey | None:
    """Returns None when this request now owns the key, else the existing row."""
    now = datetime.now(UTC)
    with SessionLocal() as db:
        db.execute(delete(NovaFinIdempotencyKey).where(NovaFinIdempotencyKey.created_at < now - KEY_TTL))
        existing = db.get(NovaFinIdempotencyKey, key_hash)
        if existing is not None and existing.status_code is None and existing.created_at < now - PENDING_TIMEOUT:
            db.delete(existing)  # the worker that owned it died; let this request retry
            db.flush()
            existing = None
        if existing is not None:
            db.commit()
            return existing
        db.add(NovaFinIdempotencyKey(key_hash=key_hash, method=method, path=path))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return db.get(NovaFinIdempotencyKey, key_hash)
        return None


def _finish(key_hash: str, status_code: int, content_type: str | None, body: str) -> None:
    with SessionLocal() as db:
        row = db.get(NovaFinIdempotencyKey, key_hash)
        if row is not None:
            row.status_code, row.content_type, row.response_body = status_code, content_type, body
            db.commit()


def _forget(key_hash: str) -> None:
    with SessionLocal() as db:
        db.execute(delete(NovaFinIdempotencyKey).where(NovaFinIdempotencyKey.key_hash == key_hash))
        db.commit()


class NovaFinIdempotencyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        raw_key = request.headers.get(KEY_HEADER)
        if (
            not raw_key
            or request.method not in WRITE_METHODS
            or not request.url.path.startswith(f"{settings.API_V1_PREFIX}/novafin")
        ):
            return await call_next(request)

        scope = request.headers.get("cookie", "") or request.headers.get("authorization", "")
        key_hash = hash_key(f"{request.method} {request.url.path}?{request.url.query} {raw_key}", scope)
        existing = await run_in_threadpool(_claim, key_hash, request.method, request.url.path)
        if existing is not None:
            if existing.status_code is None:
                return JSONResponse({"detail": "This request is already being processed."}, status_code=409)
            return Response(
                existing.response_body or "",
                status_code=existing.status_code,
                media_type=existing.content_type,
                headers={"Idempotent-Replayed": "true"},
            )

        try:
            response = await call_next(request)
            body = b"".join([chunk async for chunk in response.body_iterator])
        except Exception:
            await run_in_threadpool(_forget, key_hash)
            raise
        if 200 <= response.status_code < 300:
            await run_in_threadpool(
                _finish, key_hash, response.status_code, response.headers.get("content-type"), body.decode()
            )
        else:
            await run_in_threadpool(_forget, key_hash)
        headers = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}
        return Response(body, status_code=response.status_code, headers=headers)
