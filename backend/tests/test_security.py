import jwt
import pytest
from pydantic import ValidationError

from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)
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
