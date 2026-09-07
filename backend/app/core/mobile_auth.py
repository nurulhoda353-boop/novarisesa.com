import uuid
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_mobile_token
from app.models import MailAccount, User


def get_mobile_user(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
    access_token: Annotated[str | None, Query()] = None,
) -> User:
    """Accepts the access token via the Authorization header (used by every
    HTTP call) or an `access_token` query parameter — browsers cannot set
    custom headers on a WebSocket handshake, so the web client's /mail/ws
    connection relies on the query-parameter fallback."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Mobile authentication required",
    )
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else access_token
    if not token:
        raise unauthorized
    try:
        payload = decode_mobile_token(token, "access")
        user_id = uuid.UUID(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError) as exc:
        raise unauthorized from exc
    user = db.scalar(select(User).where(User.id == user_id))
    if not user or not user.is_active or user.deleted_at is not None:
        raise unauthorized
    return user


MobileUser = Annotated[User, Depends(get_mobile_user)]


def get_mail_account(
    user: MobileUser,
    db: Annotated[Session, Depends(get_db)],
) -> MailAccount:
    account = db.scalar(
        select(MailAccount).where(
            MailAccount.user_id == user.id,
            MailAccount.is_active.is_(True),
        )
    )
    if not account:
        raise HTTPException(status_code=404, detail="Mailbox account is not connected")
    return account


CurrentMailAccount = Annotated[MailAccount, Depends(get_mail_account)]
