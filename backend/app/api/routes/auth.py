import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from threading import Lock
from typing import Annotated

import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.auth import CurrentUser, user_permission_codes
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    digest_token,
    hash_password,
    verify_password,
)
from app.models import AuditLog, RefreshToken, Role, User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    SessionResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth")
DBSession = Annotated[Session, Depends(get_db)]
_login_attempts: dict[str, list[datetime]] = defaultdict(list)
_login_attempts_lock = Lock()


def login_key(request: Request, email: str) -> str:
    client = request.client.host if request.client else "unknown"
    return f"{client}:{email.casefold()}"


def check_login_rate_limit(request: Request, email: str) -> str:
    key = login_key(request, email)
    cutoff = datetime.now(UTC) - timedelta(minutes=settings.LOGIN_WINDOW_MINUTES)
    with _login_attempts_lock:
        recent = [attempt for attempt in _login_attempts[key] if attempt >= cutoff]
        _login_attempts[key] = recent
        if len(recent) >= settings.LOGIN_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many sign-in attempts. Please try again later.",
                headers={"Retry-After": str(settings.LOGIN_WINDOW_MINUTES * 60)},
            )
    return key


def record_failed_login(key: str) -> None:
    with _login_attempts_lock:
        _login_attempts[key].append(datetime.now(UTC))


def user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        roles=[role.name for role in user.roles],
        permissions=sorted(user_permission_codes(user)),
        last_login_at=user.last_login_at,
    )


def set_session_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    common = {
        "httponly": True,
        "secure": settings.is_production,
        "samesite": "strict",
        "domain": settings.COOKIE_DOMAIN,
    }
    response.set_cookie(
        "cms_access",
        access_token,
        max_age=settings.ACCESS_TOKEN_MINUTES * 60,
        path="/",
        **common,
    )
    response.set_cookie(
        "cms_refresh",
        refresh_token,
        max_age=settings.REFRESH_TOKEN_DAYS * 86400,
        path="/api/v1/auth",
        **common,
    )


def clear_session_cookies(response: Response) -> None:
    response.delete_cookie(
        "cms_access",
        path="/",
        domain=settings.COOKIE_DOMAIN,
        secure=settings.is_production,
        httponly=True,
        samesite="strict",
    )
    response.delete_cookie(
        "cms_refresh",
        path="/api/v1/auth",
        domain=settings.COOKIE_DOMAIN,
        secure=settings.is_production,
        httponly=True,
        samesite="strict",
    )


def issue_session(db: Session, user: User, request: Request, response: Response) -> None:
    token_id = uuid.uuid4()
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id), str(token_id))
    db.add(
        RefreshToken(
            id=token_id,
            user_id=user.id,
            token_hash=digest_token(refresh_token),
            expires_at=datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_DAYS),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    )
    set_session_cookies(response, access_token, refresh_token)


@router.post("/login", response_model=SessionResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: DBSession,
) -> SessionResponse:
    attempt_key = check_login_rate_limit(request, payload.email)
    user = db.scalar(
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.email == payload.email.lower())
    )
    if (
        user is None
        or not user.is_active
        or user.deleted_at is not None
        or not verify_password(payload.password, user.password_hash)
    ):
        record_failed_login(attempt_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    with _login_attempts_lock:
        _login_attempts.pop(attempt_key, None)
    user.last_login_at = datetime.now(UTC)
    issue_session(db, user, request, response)
    db.add(
        AuditLog(
            actor_id=user.id,
            action="auth.login",
            entity_type="user",
            entity_id=user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    )
    db.commit()
    db.refresh(user)
    return SessionResponse(
        user=user_response(user),
        expires_in=settings.ACCESS_TOKEN_MINUTES * 60,
    )


@router.post("/refresh", response_model=SessionResponse)
def refresh_session(
    request: Request,
    response: Response,
    db: DBSession,
    cms_refresh: Annotated[str | None, Cookie()] = None,
) -> SessionResponse:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired",
    )
    if not cms_refresh:
        raise unauthorized
    try:
        payload = decode_token(cms_refresh, "refresh")
        token_id = uuid.UUID(payload["jti"])
        user_id = uuid.UUID(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError) as exc:
        raise unauthorized from exc

    stored = db.scalar(
        select(RefreshToken).where(
            RefreshToken.id == token_id,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
    )
    if (
        stored is None
        or stored.expires_at < datetime.now(UTC)
        or stored.token_hash != digest_token(cms_refresh)
    ):
        raise unauthorized

    user = db.scalar(
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.id == user_id)
    )
    if not user or not user.is_active or user.deleted_at is not None:
        raise unauthorized

    stored.revoked_at = datetime.now(UTC)
    issue_session(db, user, request, response)
    db.commit()
    return SessionResponse(
        user=user_response(user),
        expires_in=settings.ACCESS_TOKEN_MINUTES * 60,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: DBSession,
    cms_refresh: Annotated[str | None, Cookie()] = None,
) -> None:
    if cms_refresh:
        try:
            payload = decode_token(cms_refresh, "refresh")
            token_id = uuid.UUID(payload["jti"])
            stored = db.get(RefreshToken, token_id)
            if stored and stored.revoked_at is None:
                stored.revoked_at = datetime.now(UTC)
                db.commit()
        except (jwt.InvalidTokenError, KeyError, ValueError):
            pass
    clear_session_cookies(response)


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser) -> UserResponse:
    return user_response(user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    user: CurrentUser,
    db: DBSession,
) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different",
        )

    user.password_hash = hash_password(payload.new_password)
    now = datetime.now(UTC)
    for token in db.scalars(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked_at.is_(None),
        )
    ):
        token.revoked_at = now
    db.add(
        AuditLog(
            actor_id=user.id,
            action="auth.password_changed",
            entity_type="user",
            entity_id=user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    )
    db.commit()
