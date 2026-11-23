"""Muqeem Control user management: add people by email + password, give them a role, suspend, reset.

Only people whose role is one of the three Muqeem roles are managed here. Dashboard team members
(Super Admin / Admin / Editor / NovaFin roles) can use Muqeem through their own permissions but are
listed read-only; they are managed in the main dashboard.
"""

import uuid
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.routes.cms import audit, revoke_user_sessions
from app.core.auth import require_permission, user_permission_codes
from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models import AuditLog, Permission, RefreshToken, Role, User

router = APIRouter(prefix="/muqeem/team")

DBSession = Annotated[Session, Depends(get_db)]
TeamAdmin = Annotated[User, Depends(require_permission("muqeem.admin"))]

SUPER_ROLE = "muqeem_super_admin"
MUQEEM_ROLES = {
    "muqeem_editor": "Editor",
    "muqeem_admin": "Admin",
    SUPER_ROLE: "Super Admin",
}
ROLE_ORDER = {"muqeem_editor": 2, "muqeem_admin": 1, SUPER_ROLE: 0}


class TeamUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="muqeem_editor", max_length=40)
    is_active: bool = True


class TeamUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    role: str | None = Field(default=None, max_length=40)
    is_active: bool | None = None


class TeamPasswordReset(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class TeamConfirm(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)


def _muqeem_role(user: User) -> str | None:
    return next((role.name for role in user.roles if role.name in MUQEEM_ROLES), None)


def _is_super(user: User) -> bool:
    """Muqeem Super Admins and the dashboard Super Admin / Developer hold muqeem.super."""
    return "muqeem.super" in user_permission_codes(user)


def _require_super_for(actor: User, *, target_role: str | None = None, target: User | None = None) -> None:
    """An Admin may never create, promote, edit, reset or remove a Super Admin."""
    if _is_super(actor):
        return
    if target_role == SUPER_ROLE or (target is not None and _is_super(target)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only a Super Admin can manage Super Admin accounts")


def _serialize(item: User, sessions: int = 0, actor: User | None = None) -> dict[str, Any]:
    role = _muqeem_role(item)
    other_roles = [r.name for r in item.roles if r.name not in MUQEEM_ROLES]
    if item.deleted_at:
        state = "deleted"
    elif not item.is_active:
        state = "suspended"
    else:
        state = "active"
    return {
        "id": str(item.id),
        "email": item.email,
        "full_name": item.full_name,
        "role": role,
        "role_label": MUQEEM_ROLES.get(
            role or "", ", ".join(r.replace("_", " ").title() for r in other_roles)
        ),
        # Muqeem roles are managed here; dashboard roles are shown read-only.
        "managed": role is not None,
        # What the signed-in person may do with this row (the server enforces it again on every action).
        "editable": role is not None and (actor is None or _is_super(actor) or not _is_super(item)),
        "status": state,
        "last_login_at": item.last_login_at.isoformat() if item.last_login_at else None,
        "created_at": item.created_at.isoformat(),
        "active_sessions": sessions,
    }


def _managed_target(db: Session, item_id: uuid.UUID, actor: User, *, allow_deleted: bool = False) -> User:
    item = db.scalar(
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.id == item_id)
    )
    if item is None or (item.deleted_at is not None and not allow_deleted):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if _muqeem_role(item) is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "This person is part of the main dashboard team. Manage them in the NOVARISE Control Center.",
        )
    _require_super_for(actor, target=item)
    return item


def _keep_a_super(
    db: Session, item: User, *, final_role: str, final_active: bool, deleting: bool = False
) -> None:
    """The last active Super Admin cannot be demoted, suspended or removed."""
    if _muqeem_role(item) != SUPER_ROLE:
        return
    if final_role == SUPER_ROLE and final_active and not deleting:
        return
    supers = (
        db.scalar(
            select(func.count(User.id))
            .join(User.roles)
            .join(Role.permissions)
            .where(Permission.code == "muqeem.super", User.is_active.is_(True), User.deleted_at.is_(None))
        )
        or 0
    )
    if supers <= 1:
        raise HTTPException(status.HTTP_409_CONFLICT, "At least one active Super Admin is required")


def _check_password(actor: User, password: str) -> None:
    if not verify_password(password, actor.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your password is incorrect")


@router.get("")
def team_overview(db: DBSession, actor: TeamAdmin) -> dict[str, Any]:
    roles = list(
        db.scalars(
            select(Role)
            .options(selectinload(Role.permissions))
            .where(Role.name.in_(MUQEEM_ROLES))
            .order_by(Role.name)
        )
    )
    roles.sort(key=lambda role: ROLE_ORDER[role.name])
    permission_text = {
        p.code: p.description for p in db.scalars(select(Permission).where(Permission.code.like("muqeem.%")))
    }

    users = list(
        db.scalars(
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .where(
                or_(
                    User.roles.any(Role.name.in_(MUQEEM_ROLES)),
                    User.roles.any(Role.permissions.any(Permission.code.like("muqeem.%"))),
                )
            )
            .order_by(User.created_at.desc())
        )
    )
    now = datetime.now(UTC)
    counts = dict(
        db.execute(
            select(RefreshToken.user_id, func.count(RefreshToken.id))
            .where(RefreshToken.revoked_at.is_(None), RefreshToken.expires_at > now)
            .group_by(RefreshToken.user_id)
        ).all()
    )
    return {
        "roles": [
            {
                "name": role.name,
                "label": MUQEEM_ROLES[role.name],
                "description": role.description,
                "permissions": sorted(p.code for p in role.permissions),
                # Roles the signed-in person is allowed to hand out.
                "assignable": role.name != SUPER_ROLE or _is_super(actor),
            }
            for role in roles
        ],
        "permissions": permission_text,
        "users": [_serialize(item, counts.get(item.id, 0), actor) for item in users],
        "me": {"id": str(actor.id), "is_super": _is_super(actor)},
    }


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_team_user(
    payload: TeamUserCreate, request: Request, db: DBSession, actor: TeamAdmin
) -> dict[str, Any]:
    if payload.role not in MUQEEM_ROLES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Choose Editor, Admin or Super Admin")
    _require_super_for(actor, target_role=payload.role)
    email = payload.email.lower()
    existing = db.scalar(
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.email == email)
    )
    if existing is not None and existing.deleted_at is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "That email already has an account")
    if existing is not None and _muqeem_role(existing) is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "That email belongs to a removed dashboard account")
    role = db.scalar(select(Role).where(Role.name == payload.role))
    if role is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Role is not set up yet; redeploy the API")

    item = existing or User(email=email)
    item.password_hash = hash_password(payload.password)
    item.full_name = payload.full_name.strip()
    item.is_active = payload.is_active
    item.is_verified = True
    item.must_change_password = False  # the portal has no password-change screen
    item.password_changed_at = datetime.now(UTC)
    item.suspended_at = None if payload.is_active else datetime.now(UTC)
    item.created_by_id = actor.id
    item.deleted_at = None
    item.roles = [role]
    if existing is not None:
        revoke_user_sessions(db, item.id)
    db.add(item)
    db.flush()
    audit(
        db,
        request,
        actor,
        "muqeem.user_created",
        "users",
        item.id,
        after={"email": item.email, "role": role.name, "is_active": item.is_active},
    )
    db.commit()
    db.refresh(item)
    return _serialize(item, 0, actor)


@router.patch("/users/{item_id}")
def update_team_user(
    item_id: uuid.UUID, payload: TeamUserUpdate, request: Request, db: DBSession, actor: TeamAdmin
) -> dict[str, Any]:
    item = _managed_target(db, item_id, actor)
    current = _muqeem_role(item) or "muqeem_editor"
    final_role = payload.role or current
    final_active = payload.is_active if payload.is_active is not None else item.is_active
    if final_role not in MUQEEM_ROLES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Choose Editor, Admin or Super Admin")
    _require_super_for(actor, target_role=final_role)
    if item.id == actor.id and (final_role != current or not final_active):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "You cannot change your own role or suspend yourself"
        )
    _keep_a_super(db, item, final_role=final_role, final_active=final_active)

    before = {"full_name": item.full_name, "role": current, "is_active": item.is_active}
    if payload.full_name is not None:
        item.full_name = payload.full_name.strip()
    if payload.is_active is not None:
        item.is_active = payload.is_active
        item.suspended_at = None if payload.is_active else datetime.now(UTC)
    if final_role != current:
        role = db.scalar(select(Role).where(Role.name == final_role))
        if role is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, "Role is not set up yet; redeploy the API"
            )
        item.roles = [role]
    if payload.is_active is not None or final_role != current:
        revoke_user_sessions(db, item.id)  # new rights apply on the next sign-in
    audit(
        db,
        request,
        actor,
        "muqeem.user_updated",
        "users",
        item.id,
        before=before,
        after={"full_name": item.full_name, "role": final_role, "is_active": item.is_active},
    )
    db.commit()
    return _serialize(item, 0, actor)


@router.post("/users/{item_id}/reset-password")
def reset_team_password(
    item_id: uuid.UUID, payload: TeamPasswordReset, request: Request, db: DBSession, actor: TeamAdmin
) -> dict[str, Any]:
    _check_password(actor, payload.current_password)
    if item_id == actor.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot reset your own password here")
    item = _managed_target(db, item_id, actor)
    item.password_hash = hash_password(payload.new_password)
    item.must_change_password = False
    item.password_changed_at = datetime.now(UTC)
    revoked = revoke_user_sessions(db, item.id)
    audit(
        db,
        request,
        actor,
        "muqeem.user_password_reset",
        "users",
        item.id,
        after={"sessions_revoked": revoked},
    )
    db.commit()
    return {"ok": True, "sessions_revoked": revoked}


@router.post("/users/{item_id}/revoke-sessions")
def revoke_team_sessions(
    item_id: uuid.UUID, payload: TeamConfirm, request: Request, db: DBSession, actor: TeamAdmin
) -> dict[str, Any]:
    _check_password(actor, payload.current_password)
    item = _managed_target(db, item_id, actor)
    revoked = revoke_user_sessions(db, item.id)
    audit(
        db,
        request,
        actor,
        "muqeem.user_sessions_revoked",
        "users",
        item.id,
        after={"sessions_revoked": revoked},
    )
    db.commit()
    return {"ok": True, "sessions_revoked": revoked}


@router.delete("/users/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_team_user(item_id: uuid.UUID, request: Request, db: DBSession, actor: TeamAdmin) -> None:
    item = _managed_target(db, item_id, actor)
    if item.id == actor.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot remove your own account")
    _keep_a_super(db, item, final_role="", final_active=False, deleting=True)
    before = {"email": item.email, "role": _muqeem_role(item), "is_active": item.is_active}
    item.deleted_at = datetime.now(UTC)
    item.is_active = False
    item.suspended_at = item.deleted_at
    revoke_user_sessions(db, item.id)
    audit(db, request, actor, "muqeem.user_removed", "users", item.id, before=before)
    db.commit()


@router.post("/users/{item_id}/restore")
def restore_team_user(
    item_id: uuid.UUID, request: Request, db: DBSession, actor: TeamAdmin
) -> dict[str, Any]:
    item = _managed_target(db, item_id, actor, allow_deleted=True)
    if item.deleted_at is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Removed user not found")
    item.deleted_at = None
    item.is_active = False  # comes back suspended; an admin turns them on deliberately
    item.suspended_at = datetime.now(UTC)
    revoke_user_sessions(db, item.id)
    audit(db, request, actor, "muqeem.user_restored", "users", item.id, after={"is_active": False})
    db.commit()
    return _serialize(item, 0, actor)


@router.get("/users/{item_id}/activity")
def team_user_activity(item_id: uuid.UUID, db: DBSession, _: TeamAdmin) -> list[dict[str, Any]]:
    """Recent Muqeem actions taken by this person, newest first."""
    logs = db.scalars(
        select(AuditLog)
        .where(AuditLog.actor_id == item_id, AuditLog.action.like("muqeem.%"))
        .order_by(AuditLog.created_at.desc())
        .limit(50)
    )
    return [{"id": str(log.id), "action": log.action, "at": log.created_at.isoformat()} for log in logs]
