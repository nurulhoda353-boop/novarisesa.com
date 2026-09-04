import hashlib
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_token(
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    *,
    token_id: str | None = None,
    audience: str = "novarise-cms",
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": token_id or str(uuid.uuid4()),
        "iss": "novarise-api",
        "aud": audience,
    }
    return jwt.encode(payload, settings.APP_SECRET_KEY, algorithm="HS256")


def create_access_token(user_id: str) -> str:
    return create_token(
        user_id,
        "access",
        timedelta(minutes=settings.ACCESS_TOKEN_MINUTES),
    )


def create_refresh_token(user_id: str, token_id: str) -> str:
    return create_token(
        user_id,
        "refresh",
        timedelta(days=settings.REFRESH_TOKEN_DAYS),
        token_id=token_id,
    )


def create_mobile_access_token(user_id: str) -> str:
    return create_token(
        user_id,
        "access",
        timedelta(minutes=settings.ACCESS_TOKEN_MINUTES),
        audience="novarise-mail",
    )


def create_mobile_refresh_token(user_id: str, token_id: str) -> str:
    return create_token(
        user_id,
        "refresh",
        timedelta(days=settings.REFRESH_TOKEN_DAYS),
        token_id=token_id,
        audience="novarise-mail",
    )


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    payload = jwt.decode(
        token,
        settings.APP_SECRET_KEY,
        algorithms=["HS256"],
        audience="novarise-cms",
        issuer="novarise-api",
    )
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Unexpected token type")
    return payload


def decode_mobile_token(token: str, expected_type: str) -> dict[str, Any]:
    payload = jwt.decode(
        token,
        settings.APP_SECRET_KEY,
        algorithms=["HS256"],
        audience="novarise-mail",
        issuer="novarise-api",
    )
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Unexpected token type")
    return payload


def digest_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
