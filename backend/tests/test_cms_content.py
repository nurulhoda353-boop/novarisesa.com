from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.cms import ContentUpsert


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
