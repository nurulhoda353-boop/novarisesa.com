import uuid
from collections.abc import Callable
from typing import Annotated

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.security import decode_token
from app.models import Role, User


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
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.id == user_id)
    )
    if not user or not user.is_active or user.deleted_at is not None:
        raise credentials_error
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def user_permission_codes(user: User) -> set[str]:
    codes: set[str] = set()
    for role in user.roles:
        for permission in role.permissions:
            codes.add(permission.code)
    return codes


def user_has_permission(user: User, code: str) -> bool:
    return code in user_permission_codes(user)


def require_permission(*codes: str) -> Callable[[User], User]:
    """Require the current user to hold at least one of the given permission codes."""

    def dependency(user: CurrentUser) -> User:
        held = user_permission_codes(user)
        if not held.intersection(codes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return user

    return dependency
