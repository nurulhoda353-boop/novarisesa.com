import asyncio
import imaplib
from datetime import UTC, datetime
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
from app.schemas.mail import ContactUpdate, FolderResponse, MailLoginRequest, MailProfileUpdate
from app.services.mail_client import _attachment_from_raw, _summary
from app.services.mail_watcher import WatcherRegistry


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


def test_time2internaldate_needs_an_aware_datetime() -> None:
    # Regression: HostingerMailboxClient._append_sent used to pass a naive
    # datetime.now() to imaplib.Time2Internaldate. That raises ValueError
    # ("date_time must be aware"), which then propagated out of send() and
    # made the API report a successfully-sent email as a 502 failure. The
    # fix is datetime.now(UTC); this test pins that behavior down.
    with pytest.raises(ValueError, match="date_time must be aware"):
        imaplib.Time2Internaldate(datetime.now())
    assert imaplib.Time2Internaldate(datetime.now(UTC))


def test_folder_response_defaults_unseen_and_total_to_zero() -> None:
    folder = FolderResponse(name="INBOX")
    assert folder.unseen == 0
    assert folder.total == 0
    counted = FolderResponse(name="INBOX", unseen=3, total=12)
    assert counted.unseen == 3
    assert counted.total == 12


def test_contact_update_allows_clearing_optional_fields() -> None:
    update = ContactUpdate(display_name="Novarise Team", phone=None, company=None, is_favorite=True)
    assert update.display_name == "Novarise Team"
    assert update.phone is None
    assert update.is_favorite is True


def test_message_summary_captures_thread_headers() -> None:
    message = EmailMessage()
    message["From"] = "team@novarisesa.com"
    message["To"] = "info@novarisesa.com"
    message["Subject"] = "Re: Welcome"
    message["In-Reply-To"] = "<root@novarisesa.com>"
    message["References"] = "<root@novarisesa.com> <second@novarisesa.com>"
    message.set_content("Thanks!")
    parsed = _summary(43, "INBOX", message.as_bytes(), [])
    assert parsed["in_reply_to"] == "<root@novarisesa.com>"
    assert parsed["references"] == ["<root@novarisesa.com>", "<second@novarisesa.com>"]


def test_message_summary_ignores_inline_cid_images_for_has_attachments() -> None:
    message = EmailMessage()
    message["From"] = "team@novarisesa.com"
    message["To"] = "info@novarisesa.com"
    message["Subject"] = "Newsletter"
    message.set_content("See the logo below")
    message.add_related(b"fake-png-bytes", maintype="image", subtype="png", cid="<logo123>")
    parsed = _summary(44, "INBOX", message.as_bytes(), [])
    assert parsed["has_attachments"] is False

    with_real_attachment = EmailMessage()
    with_real_attachment["From"] = "team@novarisesa.com"
    with_real_attachment["To"] = "info@novarisesa.com"
    with_real_attachment["Subject"] = "Invoice"
    with_real_attachment.set_content("See attached invoice")
    with_real_attachment.add_attachment(
        b"pdf-bytes", maintype="application", subtype="pdf", filename="invoice.pdf"
    )
    parsed_with_attachment = _summary(45, "INBOX", with_real_attachment.as_bytes(), [])
    assert parsed_with_attachment["has_attachments"] is True


def test_mail_profile_update_accepts_optional_signature() -> None:
    without_signature = MailProfileUpdate(display_name="Novarise", cache_ttl_days=30)
    assert without_signature.signature is None
    with_signature = MailProfileUpdate(
        display_name="Novarise", cache_ttl_days=30, signature="Best,\nNovarise Team"
    )
    assert with_signature.signature == "Best,\nNovarise Team"


def test_watcher_registry_starts_one_watcher_per_account_and_stops_when_empty() -> None:
    registry = WatcherRegistry()
    started: list[str] = []
    stopped: list[str] = []

    class _FakeWatcher:
        def __init__(self, account_id, address, password, loop, on_event):  # noqa: ANN001
            self.account_id = account_id

        def start(self) -> None:
            started.append(self.account_id)

        def stop(self) -> None:
            stopped.append(self.account_id)

    import app.services.mail_watcher as mail_watcher_module

    original = mail_watcher_module.MailboxWatcher
    mail_watcher_module.MailboxWatcher = _FakeWatcher
    try:

        async def scenario() -> None:
            ws_a = object()
            ws_b = object()
            await registry.subscribe("acct-1", "a@novarisesa.com", "secret", ws_a)
            await registry.subscribe("acct-1", "a@novarisesa.com", "secret", ws_b)
            assert started == ["acct-1"]
            await registry.unsubscribe("acct-1", ws_a)
            assert stopped == []
            await registry.unsubscribe("acct-1", ws_b)
            assert stopped == ["acct-1"]

        asyncio.run(scenario())
    finally:
        mail_watcher_module.MailboxWatcher = original
