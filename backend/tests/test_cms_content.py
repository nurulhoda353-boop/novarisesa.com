from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.cms import (
    ApplicationWorkflowUpdate,
    ApplicationOperationalStatusUpdate,
    ContentUpsert,
    RequirementEditorPayload,
    ServiceEditorPayload,
)


def test_complete_service_payload_is_validated() -> None:
    payload = ContentUpsert(
        slug="civil",
        title="Civil Construction",
        status="published",
        number="01",
        icon="building",
        stats=[{"value": 12, "suffix": "M+", "label": "Safe hours"}],
        capabilities=[{"label": "Capacity", "value": "1,200 m3/day"}],
        process=[{"num": "01", "title": "Survey", "desc": "Site review"}],
        certifications=["ISO 9001"],
        body={"eyebrow": "Civil", "sub_services": [], "faqs": []},
    )

    assert payload.number == "01"
    assert payload.stats[0]["value"] == 12
    assert payload.status == "published"


def test_complete_requirement_payload_normalizes_financial_fields() -> None:
    payload = ContentUpsert(
        code="welder-01",
        title="6G Welder",
        status="urgent",
        headcount=10,
        rate_amount="33.50",
        rate_currency="SAR",
        contacts=[
            {"display": "+966 55 000 0000", "raw": "966550000000", "whatsapp": True}
        ],
    )

    assert payload.rate_amount == Decimal("33.50")
    assert payload.contacts[0].whatsapp is True


def test_requirement_contact_rejects_unsafe_phone_value() -> None:
    with pytest.raises(ValidationError):
        ContentUpsert(
            code="welder-01",
            title="6G Welder",
            status="urgent",
            headcount=10,
            contacts=[{"display": "call us", "raw": "javascript:alert(1)"}],
        )


def test_requirement_editor_validates_public_card_and_application_settings() -> None:
    payload = RequirementEditorPayload(
        code="aramco-rigger-01",
        position="Aramco Rigger Level III",
        status="urgent",
        headcount=24,
        rate_amount="28.50",
        documents=["Valid Iqama", "Aramco certificate"],
        contacts=[{"display": "+966 55 000 0000", "raw": "966550000000", "whatsapp": True}],
    )

    assert payload.status == "urgent"
    assert payload.headcount == 24
    assert payload.rate_amount == Decimal("28.50")


def test_application_workflow_supports_full_recruitment_pipeline() -> None:
    payload = ApplicationWorkflowUpdate(
        stage="documents_pending",
        documents=[{"name": "Passport", "status": "verified"}],
        note="Passport verified by HR.",
    )

    assert payload.stage == "documents_pending"
    assert payload.documents[0].status == "verified"


def test_application_workflow_rejects_unknown_stage() -> None:
    with pytest.raises(ValidationError):
        ApplicationWorkflowUpdate(stage="maybe_hired")


def test_application_operational_status_is_limited_to_hr_actions() -> None:
    assert ApplicationOperationalStatusUpdate(status="confirmed").status == "confirmed"
    with pytest.raises(ValidationError):
        ApplicationOperationalStatusUpdate(status="emailed")


def test_service_editor_keeps_the_public_template_row_counts() -> None:
    payload = ServiceEditorPayload(
        slug="civil",
        title="Civil Construction",
        stats=[{"value": 12, "suffix": "M+", "label": "Safe hours"}] * 4,
        sub_services=[{"title": "Scope", "desc": "Description"}] * 6,
        capabilities=[{"label": "Capacity", "value": "1,200"}] * 6,
        portfolio=[{"name": "Project", "client": "Client", "scope": "Scope", "year": "2024", "image": "/image.jpg"}] * 3,
        process=[{"num": "01", "title": "Step", "desc": "Description"}] * 4,
        certifications=["ISO 9001"] * 5,
        faqs=[{"q": "Question?", "a": "Answer."}] * 3,
    )

    assert len(payload.stats) == 4
    assert len(payload.portfolio) == 3


def test_service_editor_rejects_a_broken_fixed_template() -> None:
    with pytest.raises(ValidationError):
        ServiceEditorPayload(slug="civil", title="Civil Construction", stats=[])
