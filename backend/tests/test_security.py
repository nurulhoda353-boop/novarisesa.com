import jwt
import pytest
from pydantic import ValidationError

from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models import ContactSubmission, InboxActivity, Post, RequirementApplication, RFQSubmission
from app.schemas.public import ContactCreate, RFQCreate


def test_password_hash_is_not_plaintext_and_verifies() -> None:
    password = "A-strong-test-password-2026!"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_is_scoped_and_signed() -> None:
    token = create_access_token("3dd490c5-43d9-4ebc-9286-2abff042bc1a")
    payload = decode_token(token, "access")

    assert payload["sub"] == "3dd490c5-43d9-4ebc-9286-2abff042bc1a"
    assert payload["aud"] == "novarise-cms"
    with pytest.raises(jwt.InvalidTokenError):
        decode_token(token, "refresh")


def test_public_form_honeypot_rejects_bots() -> None:
    with pytest.raises(ValidationError):
        ContactCreate(
            name="Spam Bot",
            email="bot@example.com",
            message="This is an automated submission.",
            website="https://spam.example",
        )


def test_rfq_requires_meaningful_scope() -> None:
    with pytest.raises(ValidationError):
        RFQCreate(
            name="Test Client",
            email="client@example.com",
            company="Example Co",
            service="Civil",
            scope="Too short",
        )


def test_shared_postgres_enums_use_lowercase_database_values() -> None:
    assert RFQSubmission.__table__.c.status.type.enums[0] == "new"
    assert RequirementApplication.__table__.c.status.type.enums[0] == "new"
    assert Post.__table__.c.status.type.enums == [
        "draft",
        "published",
        "archived",
    ]


def test_contact_and_rfq_models_expose_management_state() -> None:
    assert "operational_status" in ContactSubmission.__table__.c
    assert "converted_rfq_id" in ContactSubmission.__table__.c
    assert "commercial_stage" in RFQSubmission.__table__.c
    assert "proposal" in RFQSubmission.__table__.c
    assert {"entity_type", "entity_id", "action", "details"}.issubset(InboxActivity.__table__.c.keys())
