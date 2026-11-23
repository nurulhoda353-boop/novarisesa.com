from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.routes.muqeem import SORTABLE, MuqeemFields, MuqeemRead
from app.bootstrap import CMS_PERMISSIONS, ROLE_PERMISSIONS
from app.models import MuqeemRecord


def test_hijri_dates_are_validated_and_kept_as_text() -> None:
    ok = MuqeemFields(report_date="1448-05-25", iqama_number="2000000000", name="A")
    assert ok.report_date == "1448-05-25"
    with pytest.raises(ValidationError):
        MuqeemFields(report_date="25/05/1448", iqama_number="1", name="A")
    with pytest.raises(ValidationError):
        MuqeemFields(report_date="", iqama_number="1", name="A")


def test_sort_keys_are_real_columns() -> None:
    columns = {column.name for column in MuqeemRecord.__table__.columns}
    assert {column.key for column in SORTABLE.values()} <= columns


def test_record_has_archive_and_verify_columns_and_read_schema_exposes_them() -> None:
    columns = {column.name for column in MuqeemRecord.__table__.columns}
    assert {"archived_at", "verify_code"} <= columns
    assert {"verify_code", "archived_at", "created_at"} <= set(MuqeemRead.model_fields)


def test_muqeem_admin_and_super_permissions_follow_the_hierarchy() -> None:
    assert {"muqeem.admin", "muqeem.super"} <= set(CMS_PERMISSIONS)
    assert "muqeem.super" in ROLE_PERMISSIONS["super_admin"]
    assert "muqeem.super" not in ROLE_PERMISSIONS["admin"]  # a dashboard Admin may never mint Super Admins
    assert "muqeem.admin" in ROLE_PERMISSIONS["admin"]
    assert ROLE_PERMISSIONS["muqeem_editor"] == {"muqeem.view", "muqeem.manage"}
    assert "muqeem.admin" in ROLE_PERMISSIONS["muqeem_admin"]
    assert "muqeem.super" not in ROLE_PERMISSIONS["muqeem_admin"]
    assert "muqeem.super" in ROLE_PERMISSIONS["muqeem_super_admin"]
    for role, codes in ROLE_PERMISSIONS.items():
        if role not in {"admin", "super_admin", "muqeem_admin", "muqeem_super_admin"}:
            assert not {"muqeem.admin", "muqeem.super"} & codes


def _person(*codes: str):
    perms = [SimpleNamespace(code=code) for code in codes]
    return SimpleNamespace(roles=[SimpleNamespace(name="r", permissions=perms)])


def test_only_a_super_admin_can_touch_super_admins() -> None:
    from app.api.routes.muqeem_team import SUPER_ROLE, _require_super_for

    boss = _person("muqeem.view", "muqeem.admin", "muqeem.super")
    admin = _person("muqeem.view", "muqeem.admin")
    _require_super_for(boss, target_role=SUPER_ROLE)  # allowed
    _require_super_for(admin, target_role="muqeem_admin")  # allowed
    with pytest.raises(HTTPException) as exc:
        _require_super_for(admin, target_role=SUPER_ROLE)
    assert exc.value.status_code == 403
    with pytest.raises(HTTPException):
        _require_super_for(admin, target=boss)


def test_verify_codes_are_unique_and_unguessable_length() -> None:
    column = MuqeemRecord.__table__.c.verify_code
    assert column.unique
    codes = {column.default.arg(None) for _ in range(50)}
    assert len(codes) == 50
    assert all(len(code) >= 8 for code in codes)
