import pytest
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


def test_muqeem_admin_permission_is_not_given_to_plain_managers() -> None:
    assert "muqeem.admin" in CMS_PERMISSIONS
    assert "muqeem.admin" in ROLE_PERMISSIONS["admin"]
    assert "muqeem.admin" in ROLE_PERMISSIONS["super_admin"]
    for role, codes in ROLE_PERMISSIONS.items():
        if role not in {"admin", "super_admin"}:
            assert "muqeem.admin" not in codes


def test_verify_codes_are_unique_and_unguessable_length() -> None:
    column = MuqeemRecord.__table__.c.verify_code
    assert column.unique
    codes = {column.default.arg(None) for _ in range(50)}
    assert len(codes) == 50
    assert all(len(code) >= 8 for code in codes)
