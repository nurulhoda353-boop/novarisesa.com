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
    extra_claims: dict[str, Any] | None = None,
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
    if extra_claims:
        payload.update(extra_claims)
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


def create_mobile_access_token(user_id: str, *, switched_by: str | None = None) -> str:
    """`switched_by` is the id of the admin MailAccount that switched into
    this session (see admin_switch_account) - present only on a session an
    admin opened via "Switch to this mailbox", never on a mailbox's own
    normal login. get_mail_account uses it to grant full admin permissions
    within that mailbox while still keeping the mailbox's own identity
    (address, credentials, display role) as the session's account."""
    return create_token(
        user_id,
        "access",
        timedelta(minutes=settings.ACCESS_TOKEN_MINUTES),
        audience="novarise-mail",
        extra_claims={"switched_by": switched_by} if switched_by else None,
    )


def create_mobile_refresh_token(user_id: str, token_id: str, *, switched_by: str | None = None) -> str:
    """Carries the same `switched_by` claim as the access token it renews -
    refresh tokens live for weeks (ACCESS_TOKEN_MINUTES is only 15), so
    without this an admin's "switched into a mailbox" session would
    silently lose its elevated permissions the first time the client
    refreshes, long before the admin meant to leave that mailbox."""
    return create_token(
        user_id,
        "refresh",
        timedelta(days=settings.REFRESH_TOKEN_DAYS),
        token_id=token_id,
        audience="novarise-mail",
        extra_claims={"switched_by": switched_by} if switched_by else None,
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
