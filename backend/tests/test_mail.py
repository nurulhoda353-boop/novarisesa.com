from email.message import EmailMessage

import jwt
import pytest

from app.core.mail_crypto import decrypt_mail_secret, encrypt_mail_secret
from app.core.security import (
    create_access_token,
    create_mobile_access_token,
    decode_mobile_token,
    decode_token,
)
from app.schemas.mail import MailLoginRequest, MailProfileUpdate
from app.services.mail_client import _attachment_from_raw, _summary


def test_mail_credentials_are_encrypted_and_round_trip() -> None:
    secret = "a-mailbox-password"
    encrypted = encrypt_mail_secret(secret)
    assert encrypted != secret
    assert secret not in encrypted
    assert decrypt_mail_secret(encrypted) == secret


def test_mail_login_accepts_only_supported_credential_types() -> None:
    request = MailLoginRequest(email="info@novarisesa.com", password="secret-password")
    assert request.credential_type == "app_password"
    with pytest.raises(ValueError):
        MailLoginRequest(
            email="info@novarisesa.com",
            password="secret-password",
            credential_type="plain",
        )


def test_profile_cache_policy_is_bounded() -> None:
    with pytest.raises(ValueError):
        MailProfileUpdate(display_name="Novarise", cache_ttl_days=0)
    with pytest.raises(ValueError):
        MailProfileUpdate(display_name="Novarise", cache_ttl_days=366)


def test_message_summary_decodes_headers_and_body() -> None:
    message = EmailMessage()
    message["From"] = "Novarise Team <team@novarisesa.com>"
    message["To"] = "info@novarisesa.com"
    message["Subject"] = "Welcome"
    message.set_content("Welcome to Novarise Mail")
    parsed = _summary(42, "INBOX", message.as_bytes(), ["\\Seen"])
    assert parsed["uid"] == 42
    assert parsed["sender"]["email"] == "team@novarisesa.com"
    assert parsed["subject"] == "Welcome"
    assert parsed["preview"] == "Welcome to Novarise Mail"


def test_mobile_and_cms_tokens_have_isolated_audiences() -> None:
    subject = "00000000-0000-0000-0000-000000000001"
    mobile = create_mobile_access_token(subject)
    cms = create_access_token(subject)

    assert decode_mobile_token(mobile, "access")["aud"] == "novarise-mail"
    assert decode_token(cms, "access")["aud"] == "novarise-cms"

    with pytest.raises(jwt.InvalidAudienceError):
        decode_token(mobile, "access")
    with pytest.raises(jwt.InvalidAudienceError):
        decode_mobile_token(cms, "access")


def test_attachment_can_be_selected_from_message() -> None:
    message = EmailMessage()
    message["From"] = "team@novarisesa.com"
    message["To"] = "info@novarisesa.com"
    message.set_content("Please see the attachment")
    message.add_attachment(b"report-data", maintype="text", subtype="plain", filename="report.txt")
    raw = message.as_bytes()
    found: tuple[str, str, bytes] | None = None
    for part_number in ("2", "3", "4"):
        try:
            found = _attachment_from_raw(raw, part_number)
            break
        except KeyError:
            continue
    assert found is not None
    filename, content_type, content = found
    assert filename == "report.txt"
    assert content_type == "text/plain"
    assert content == b"report-data"
