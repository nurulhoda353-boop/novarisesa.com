from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.core.auth import require_permission, user_has_permission, user_permission_codes


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
