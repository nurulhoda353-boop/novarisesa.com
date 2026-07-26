import uuid
from typing import Annotated

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.security import decode_token
from app.models import User


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    cms_access: Annotated[str | None, Cookie()] = None,
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )
    if not cms_access:
        raise credentials_error
    try:
        payload = decode_token(cms_access, "access")
        user_id = uuid.UUID(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError) as exc:
        raise credentials_error from exc

    user = db.scalar(
        select(User).options(selectinload(User.roles)).where(User.id == user_id)
    )
    if not user or not user.is_active or user.deleted_at is not None:
        raise credentials_error
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
