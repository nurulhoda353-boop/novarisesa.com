from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.bootstrap import ROLE_PERMISSIONS
from app.core.auth import require_permission, user_has_permission, user_permission_codes
from app.schemas.cms import UserCreate


def _user_with_permissions(*codes: str):
    permissions = [SimpleNamespace(code=code) for code in codes]
    role = SimpleNamespace(permissions=permissions)
    return SimpleNamespace(roles=[role])


def test_user_permission_codes_are_unioned() -> None:
    user = _user_with_permissions("cms.view", "cms.manage_content")
    assert user_permission_codes(user) == {"cms.view", "cms.manage_content"}
    assert user_has_permission(user, "cms.view")
    assert not user_has_permission(user, "cms.manage_users")


def test_require_permission_allows_matching_code() -> None:
    dependency = require_permission("cms.manage_media", "cms.view")
    user = _user_with_permissions("cms.view")
    assert dependency(user) is user


def test_require_permission_rejects_missing_code() -> None:
    dependency = require_permission("cms.manage_users")
    user = _user_with_permissions("cms.view")
    with pytest.raises(HTTPException) as exc:
        dependency(user)
    assert exc.value.status_code == 403


def test_password_change_requirement_blocks_cms_permissions() -> None:
    dependency = require_permission("cms.view")
    user = _user_with_permissions("cms.view")
    user.must_change_password = True
    with pytest.raises(HTTPException) as exc:
        dependency(user)
    assert exc.value.status_code == 403
    assert "Password change required" in exc.value.detail


def test_role_matrix_keeps_editor_and_admin_boundaries() -> None:
    assert "cms.manage_users" in ROLE_PERMISSIONS["super_admin"]
    assert "cms.publish" in ROLE_PERMISSIONS["admin"]
    assert "cms.manage_users" not in ROLE_PERMISSIONS["admin"]
    assert ROLE_PERMISSIONS["editor"] == {
        "cms.view",
        "cms.manage_content",
        "cms.manage_media",
    }


def test_new_accounts_keep_the_admin_set_password_by_default() -> None:
    payload = UserCreate(
        email="editor@example.com",
        full_name="Project Editor",
        password="permanent-passphrase",
    )
    assert payload.role == "editor"
    assert not hasattr(payload, "require_password_change")
