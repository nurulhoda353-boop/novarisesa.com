"""Who may do what inside Muqeem Control.

Everyone's Muqeem level is one of Super Admin / Admin / Editor. It comes from one of two places:

* a Muqeem role (muqeem_super_admin / muqeem_admin / muqeem_editor) given in Muqeem Settings. This is an
  *override*: it decides the person's Muqeem level whatever their dashboard role is, so an Admin of the
  dashboard can be made a Muqeem Editor without touching their dashboard rights;
* otherwise the Muqeem permissions that their dashboard role already carries (Super Admin → all, Admin →
  admin level; dashboard Editors and the NovaFin roles have none).
"""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.core.auth import CurrentUser, user_permission_codes
from app.models import Role, User

# Highest first.
MUQEEM_ROLES = ("muqeem_super_admin", "muqeem_admin", "muqeem_editor")
LEVEL_LABELS = {
    "muqeem_super_admin": "Super Admin",
    "muqeem_admin": "Admin",
    "muqeem_editor": "Editor",
}


def muqeem_override_role(user: User) -> Role | None:
    names = {role.name: role for role in user.roles}
    for name in MUQEEM_ROLES:
        if name in names:
            return names[name]
    return None


def muqeem_permissions(user: User) -> set[str]:
    role = muqeem_override_role(user)
    if role is not None:
        return {p.code for p in role.permissions if p.code.startswith("muqeem.")}
    return {code for code in user_permission_codes(user) if code.startswith("muqeem.")}


def muqeem_level(user: User) -> str | None:
    """The Muqeem role name that matches the person's effective permissions (None = no access)."""
    perms = muqeem_permissions(user)
    if "muqeem.super" in perms:
        return "muqeem_super_admin"
    if "muqeem.admin" in perms:
        return "muqeem_admin"
    if perms & {"muqeem.manage", "muqeem.view"}:
        return "muqeem_editor"
    return None


def require_muqeem(*codes: str) -> Callable[[User], User]:
    """Like require_permission, but judged on the person's effective Muqeem level."""

    def dependency(user: CurrentUser) -> User:
        if getattr(user, "must_change_password", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Password change required before using the dashboard",
            )
        if not muqeem_permissions(user).intersection(codes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return user

    return dependency


MuqeemViewer = Annotated[User, Depends(require_muqeem("muqeem.view", "muqeem.manage"))]
