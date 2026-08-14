import jwt
import pytest
from pydantic import ValidationError

from app.api.routes.public import parse_experience_years
from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core.storage import content_matches_mime
from app.core.workflow import (
    application_stage_for_operational,
    operational_for_application_stage,
    operational_for_rfq_stage,
    rfq_stage_for_operational,
)
from app.models import (
    ContactSubmission,
    InboxActivity,
    Post,
    RateLimitEvent,
    RequirementApplication,
    RFQSubmission,
)
from app.schemas.public import ContactCreate, RequirementApplicationCreate, RFQCreate


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
    assert {"scope", "key_hash", "created_at"}.issubset(RateLimitEvent.__table__.c.keys())


def test_public_forms_strip_whitespace_and_validate_contact_values() -> None:
    payload = ContactCreate(
        name="  Jane Client  ",
        email="Jane@Example.com",
        phone=" +966 55 000 0000 ",
        company="   ",
        message="  Please contact me about an industrial project.  ",
    )
    assert payload.name == "Jane Client"
    assert payload.company is None
    assert payload.phone == "+966 55 000 0000"
    with pytest.raises(ValidationError):
        RequirementApplicationCreate(
            name="Applicant",
            phone="javascript:alert(1)",
            experience="3–5 years",
        )
    assert parse_experience_years("1–3 years") == 1
    assert parse_experience_years("10+ years") == 10


def test_media_signatures_reject_spoofed_content() -> None:
    assert content_matches_mime(b"\x89PNG\r\n\x1a\nrest", "image/png")
    assert content_matches_mime(b"\x00\x00\x00\x18ftypisom", "video/mp4")
    assert not content_matches_mime(b"<script>alert(1)</script>", "image/png")
    assert not content_matches_mime(b"%PDF-1.7", "image/jpeg")


def test_operational_updates_preserve_advanced_workflow_stages() -> None:
    assert rfq_stage_for_operational("negotiation", "confirmed") == "negotiation"
    assert rfq_stage_for_operational("proposal_sent", "pending") == "proposal_sent"
    assert rfq_stage_for_operational("lost", "pending") == "under_review"
    assert application_stage_for_operational("selected", "confirmed") == "selected"
    assert application_stage_for_operational("hired", "pending") == "under_review"
    assert operational_for_rfq_stage("cancelled", "negotiation") == "confirmed"
    assert operational_for_application_stage("completed", "shortlisted") == "confirmed"
