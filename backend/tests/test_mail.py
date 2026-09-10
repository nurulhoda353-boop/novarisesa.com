import asyncio
import imaplib
import inspect
import uuid
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
from app.models import MailAccount, MailAuditLog, MailChangeRequest, MailRule, MailSnooze
from app.schemas.mail import (
    AdminContactInfo,
    AdminCreateMailboxRequest,
    AdminProvisionMailboxRequest,
    AdminSetHostingerPassword,
    AdminSetRole,
    ContactUpdate,
    FolderResponse,
    HostingerMailboxSummary,
    MailAccountResponse,
    MailChangeRequestCreate,
    MailLoginRequest,
    MailPasswordChange,
    MailProfileUpdate,
    MailRuleUpsert,
    SnoozeRequest,
)
from app.api.routes.mail import account_response, mail_events
from app.services.mail_client import HostingerMailboxClient, _attachment_from_raw, _summary
from app.services.mail_snooze import SNOOZE_FOLDER
from app.services.mail_watcher import WatcherRegistry, rule_matches


def test_mail_events_websocket_does_not_hold_a_request_scoped_db_session() -> None:
    # Regression: mail_events used to declare `account: CurrentMailAccount`
    # as a route parameter - FastAPI keeps that Depends(get_db) session
    # checked out from the pool for the WebSocket's entire (deliberately
    # long-lived, per the IMAP IDLE watcher) connection lifetime, which
    # silently exhausted the pool as connections accumulated across
    # devices (QueuePool limit ... overflow ... reached), surfacing as
    # random 500s on totally unrelated endpoints - login included, since
    # every DB-dependent route shares the same pool. It must only take
    # the raw `websocket` and resolve the account with its own
    # short-lived session instead (see _resolve_websocket_account).
    params = inspect.signature(mail_events).parameters
    assert list(params) == ["websocket"]


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


class _FakeListFetchImap:
    """Stands in for imaplib.IMAP4_SSL for messages()'s IMAP calls: select,
    uid("search", ...), uid("fetch", ...). Only what messages() touches."""

    def __init__(self, fetch_by_uid: dict[str, tuple[str, list]]) -> None:
        self._fetch_by_uid = fetch_by_uid

    def select(self, folder, readonly=False):  # noqa: ANN001, ARG002
        return "OK", [b"1"]

    def uid(self, command, *args):  # noqa: ANN001
        if command == "search":
            return "OK", [" ".join(self._fetch_by_uid.keys()).encode()]
        if command == "fetch":
            # messages() calls client.uid("fetch", str(uid), ...) - a plain
            # str, unlike the bytes imaplib itself hands back from "search".
            return self._fetch_by_uid[args[0]]
        raise AssertionError(f"unexpected uid command {command}")


def test_messages_list_fetches_headers_only_and_detects_real_attachments(monkeypatch) -> None:
    # Regression: messages() used to fetch BODY.PEEK[] - the entire raw
    # message, attachments included - for every row just to build a subject
    # line and a preview snippet. For an inbox with any large attachments
    # that made listing it agonizingly slow (the "stuck on Loading" bug).
    # This pins down that the list fetch only asks for headers, a bounded
    # preview snippet, and BODYSTRUCTURE - never the full body - and that
    # has_attachments still comes out right from BODYSTRUCTURE alone.
    plain_headers = b"From: Jane Doe <jane@example.com>\r\nTo: info@novarisesa.com\r\nSubject: Hello\r\n\r\n"
    plain_bodystructure = b'("TEXT" "PLAIN" ("CHARSET" "UTF-8") NIL NIL "7BIT" 20 1)'
    attachment_headers = b"From: Billing <billing@example.com>\r\nTo: info@novarisesa.com\r\nSubject: Invoice\r\n\r\n"
    attachment_bodystructure = (
        b'(("TEXT" "PLAIN" ("CHARSET" "UTF-8") NIL NIL "7BIT" 20 1)'
        b'("APPLICATION" "PDF" ("NAME" "invoice.pdf") NIL NIL "BASE64" 5000 NIL '
        b'("attachment" ("FILENAME" "invoice.pdf")) NIL NIL) "MIXED")'
    )
    inline_image_headers = b"From: Team <team@novarisesa.com>\r\nTo: info@novarisesa.com\r\nSubject: Newsletter\r\n\r\n"
    inline_image_bodystructure = (
        b'(("TEXT" "PLAIN" ("CHARSET" "UTF-8") NIL NIL "7BIT" 20 1)'
        b'("IMAGE" "PNG" ("NAME" "logo.png") "<logo123>" NIL "BASE64" 3000 NIL '
        b'("inline" ("FILENAME" "logo.png")) NIL NIL) "RELATED")'
    )

    def _fetch_response(uid: str, headers: bytes, bodystructure: bytes, preview: bytes) -> tuple[str, list]:
        marker = (
            f"{uid} (FLAGS (\\Seen) RFC822.SIZE 500 BODYSTRUCTURE ".encode()
            + bodystructure
            + b" BODY[HEADER] {N}"
        )
        return "OK", [(marker, headers), (b" BODY[TEXT]<0> {N}", preview), b")"]

    fake_client = _FakeListFetchImap(
        {
            "101": _fetch_response("101", plain_headers, plain_bodystructure, b"Hello there"),
            "102": _fetch_response("102", attachment_headers, attachment_bodystructure, b"See attached file"),
            "103": _fetch_response(
                "103", inline_image_headers, inline_image_bodystructure, b"See the logo below"
            ),
        }
    )
    monkeypatch.setattr(HostingerMailboxClient, "_connect", lambda self: fake_client)  # noqa: ARG005

    mailbox = HostingerMailboxClient("list-fetch-test@novarisesa.com", "secret")
    results = mailbox.messages(folder="INBOX", limit=10)

    by_uid = {row["uid"]: row for row in results}
    assert set(by_uid) == {101, 102, 103}
    assert by_uid[101]["subject"] == "Hello"
    assert by_uid[101]["preview"] == "Hello there"
    assert by_uid[101]["has_attachments"] is False
    assert by_uid[102]["subject"] == "Invoice"
    assert by_uid[102]["has_attachments"] is True
    # An inline cid: image (a signature logo, say) carries "inline" disposition,
    # not "attachment" - it must not trip the has_attachments paperclip icon.
    assert by_uid[103]["has_attachments"] is False


def test_mail_profile_update_accepts_optional_signature() -> None:
    without_signature = MailProfileUpdate(display_name="Novarise", cache_ttl_days=30)
    assert without_signature.signature is None
    with_signature = MailProfileUpdate(
        display_name="Novarise", cache_ttl_days=30, signature="Best,\nNovarise Team"
    )
    assert with_signature.signature == "Best,\nNovarise Team"


def test_snooze_request_requires_wake_at() -> None:
    with pytest.raises(ValueError):
        SnoozeRequest()
    request = SnoozeRequest(wake_at=datetime(2026, 9, 10, 9, 0, tzinfo=UTC))
    assert request.wake_at.year == 2026


def test_mail_snooze_model_has_the_expected_columns() -> None:
    columns = {column.name for column in MailSnooze.__table__.columns}
    assert columns == {
        "id",
        "account_id",
        "message_id",
        "subject",
        "original_folder",
        "snoozed_folder",
        "wake_at",
        "woken_at",
        "created_at",
        "updated_at",
    }


def test_snooze_folder_is_namespaced_under_inbox() -> None:
    # Matches Hostinger's dot-hierarchy convention (INBOX.Sent, INBOX.Trash,
    # ...) seen from the live folder list, so it nests under Inbox in most
    # mail clients instead of appearing as an unrelated top-level folder.
    assert SNOOZE_FOLDER == "INBOX.Snoozed"


def test_mail_rule_model_has_the_expected_columns() -> None:
    columns = {column.name for column in MailRule.__table__.columns}
    assert columns == {
        "id",
        "account_id",
        "name",
        "from_contains",
        "subject_contains",
        "destination_folder",
        "is_enabled",
        "sort_order",
        "created_at",
        "updated_at",
    }


def test_mail_rule_upsert_requires_a_condition() -> None:
    with pytest.raises(ValueError):
        MailRuleUpsert(destination_folder="INBOX.Receipts")
    rule = MailRuleUpsert(from_contains="billing@", destination_folder="INBOX.Receipts")
    assert rule.subject_contains is None


def test_rule_matches_requires_at_least_one_condition() -> None:
    empty_rule = MailRule(from_contains=None, subject_contains=None)
    assert not rule_matches(empty_rule, sender="anyone@example.com", subject="anything")


def test_rule_matches_checks_from_contains() -> None:
    rule = MailRule(from_contains="billing@stripe.com", subject_contains=None)
    assert rule_matches(rule, sender="stripe receipts <billing@stripe.com>", subject="your invoice")
    assert not rule_matches(rule, sender="someone else <hello@example.com>", subject="your invoice")


def test_rule_matches_is_case_insensitive_via_the_watcher_contract() -> None:
    # _apply_rules lower-cases sender/subject before calling rule_matches;
    # the rule's own condition text is lowered here too, so mixed-case
    # conditions still match against the already-lowered input.
    rule = MailRule(from_contains="Stripe.com", subject_contains=None)
    assert rule_matches(rule, sender="billing@stripe.com", subject="invoice")


def test_rule_matches_requires_all_set_conditions() -> None:
    rule = MailRule(from_contains="stripe.com", subject_contains="invoice")
    assert rule_matches(rule, sender="billing@stripe.com", subject="your invoice is ready")
    assert not rule_matches(rule, sender="billing@stripe.com", subject="welcome to stripe")


def test_mail_change_request_model_has_the_expected_columns() -> None:
    columns = {column.name for column in MailChangeRequest.__table__.columns}
    assert columns == {
        "id",
        "account_id",
        "request_type",
        "payload_ciphertext",
        "payload_text",
        "payload_url",
        "status",
        "rejection_reason",
        "resolved_at",
        "resolved_by_account_id",
        "created_at",
    }


def test_mail_audit_log_model_has_the_expected_columns() -> None:
    columns = {column.name for column in MailAuditLog.__table__.columns}
    assert columns == {
        "id",
        "actor_account_id",
        "target_account_id",
        "action",
        "detail",
        "created_at",
    }


def test_mail_account_response_defaults_role_to_member() -> None:
    # Regression: role was bolted onto an existing, widely-used response
    # schema - a missing default would break every call site that builds
    # this response without explicitly passing a role.
    response = MailAccountResponse(
        id="00000000-0000-0000-0000-000000000001",
        address="info@novarisesa.com",
        display_name="Info",
        avatar_url=None,
        cache_ttl_days=30,
        hostinger_mailbox_id=None,
    )
    assert response.role == "member"


def test_change_request_rejects_a_short_pending_password() -> None:
    # A member's requested password still has to meet the same minimum the
    # self-service change-password endpoint enforces - otherwise an admin
    # approving it would hand back a mailbox password Hostinger itself
    # would refuse.
    with pytest.raises(ValueError):
        MailChangeRequestCreate(request_type="password", value="short")
    request = MailChangeRequestCreate(request_type="password", value="a-fine-password")
    assert request.value == "a-fine-password"
    # display_name has no such minimum
    assert MailChangeRequestCreate(request_type="display_name", value="A").value == "A"


def test_change_request_requires_a_value_for_password_and_display_name() -> None:
    with pytest.raises(ValueError):
        MailChangeRequestCreate(request_type="password")
    with pytest.raises(ValueError):
        MailChangeRequestCreate(request_type="display_name")


def test_change_request_delete_message_requires_folder_and_uid() -> None:
    with pytest.raises(ValueError):
        MailChangeRequestCreate(request_type="delete_message")
    with pytest.raises(ValueError):
        MailChangeRequestCreate(request_type="delete_message", folder="INBOX")
    with pytest.raises(ValueError):
        MailChangeRequestCreate(request_type="delete_message", uid=5)
    request = MailChangeRequestCreate(
        request_type="delete_message",
        folder="INBOX",
        uid=5,
        destination="INBOX.Trash",
        subject="Meeting notes",
    )
    assert request.folder == "INBOX"
    assert request.uid == 5
    assert request.destination == "INBOX.Trash"


def test_mail_account_model_has_a_separate_novamail_password_column() -> None:
    # This is the whole point of the split: novamail_password_hash must be
    # its own column, distinct from credential_ciphertext (the real
    # Hostinger mailbox password) - resetting one must never touch the
    # other.
    columns = {column.name for column in MailAccount.__table__.columns}
    assert "novamail_password_hash" in columns
    assert "credential_ciphertext" in columns


def test_admin_set_hostinger_password_requires_explicit_confirmation() -> None:
    # The rarer, real-mailbox-password-changing action needs `confirm` set
    # - it must not be triggerable with the same request shape as the
    # everyday Novamail-only reset (AdminSetPassword has no such field).
    with pytest.raises(ValueError):
        AdminSetHostingerPassword(new_password="a-fine-password")
    with pytest.raises(ValueError):
        AdminSetHostingerPassword(new_password="a-fine-password", confirm=False)
    confirmed = AdminSetHostingerPassword(new_password="a-fine-password", confirm=True)
    assert confirmed.confirm is True


def test_admin_provision_mailbox_request_requires_a_real_email() -> None:
    with pytest.raises(ValueError):
        AdminProvisionMailboxRequest(address="not-an-email")
    request = AdminProvisionMailboxRequest(address="abdulmomin@novarisesa.com")
    assert request.address == "abdulmomin@novarisesa.com"


def test_admin_create_mailbox_request_validates_local_part_and_defaults_role() -> None:
    # Hostinger's own local-part rules (letters/digits/periods, no leading,
    # trailing, or consecutive periods) - reject bad ones before they ever
    # reach Hostinger's API.
    with pytest.raises(ValueError):
        AdminCreateMailboxRequest(local_part="bad..name", password="a-fine-password")
    with pytest.raises(ValueError):
        AdminCreateMailboxRequest(local_part=".leading", password="a-fine-password")
    with pytest.raises(ValueError):
        AdminCreateMailboxRequest(local_part="short", password="short")
    request = AdminCreateMailboxRequest(local_part="new.hire", password="a-fine-password")
    assert request.role == "member"
    admin_request = AdminCreateMailboxRequest(
        local_part="new.hire", password="a-fine-password", role="admin"
    )
    assert admin_request.role == "admin"


def test_admin_set_role_only_accepts_admin_or_member() -> None:
    with pytest.raises(ValueError):
        AdminSetRole(role="superuser")
    assert AdminSetRole(role="admin").role == "admin"
    assert AdminSetRole(role="member").role == "member"


def test_mobile_access_token_carries_switched_by_when_given() -> None:
    # An admin's "switch into this mailbox" session needs to be
    # distinguishable from that mailbox's own normal login - switched_by
    # is how get_mail_account tells the two apart.
    plain = create_mobile_access_token("11111111-1111-1111-1111-111111111111")
    assert "switched_by" not in jwt.decode(plain, options={"verify_signature": False})

    switched = create_mobile_access_token(
        "11111111-1111-1111-1111-111111111111",
        switched_by="22222222-2222-2222-2222-222222222222",
    )
    payload = decode_mobile_token(switched, "access")
    assert payload["switched_by"] == "22222222-2222-2222-2222-222222222222"


def test_account_response_reports_acting_as_admin_when_set() -> None:
    # Regression: admin_switch_account builds its MailAccount straight from
    # db.get() rather than the get_mail_account dependency, so unless it
    # sets `acting_admin` itself, account_response would report
    # acting_as_admin: false on the very response that just granted it -
    # every request *after* that one would be correct (get_mail_account
    # sets it fresh each time), but the client's first read of its own new
    # session would be wrong.
    plain = MailAccount(
        id=uuid.uuid4(), address="member@novarisesa.com", display_name="Member",
        role="member", cache_ttl_days=30,
    )
    assert account_response(plain).acting_as_admin is False

    admin = MailAccount(
        id=uuid.uuid4(), address="admin@novarisesa.com", display_name="Admin",
        role="admin", cache_ttl_days=30,
    )
    plain.acting_admin = admin
    assert account_response(plain).acting_as_admin is True


def test_mail_password_change_current_password_is_optional() -> None:
    # Required for a mailbox changing its own password (verified against
    # Hostinger); omitted when an admin resets another mailbox's password
    # after switching in, since they have no way to know its current one.
    with_current = MailPasswordChange(current_password="the-old-one", new_password="a-new-password")
    assert with_current.current_password == "the-old-one"
    without_current = MailPasswordChange(new_password="a-new-password")
    assert without_current.current_password is None


def test_hostinger_mailbox_summary_carries_usage_and_defaults_it_to_none() -> None:
    # Usage only exists for mailboxes Hostinger actually returns a "usage"
    # object for - an unconnected or just-created mailbox may have none yet,
    # so every usage field has to tolerate being absent.
    bare = HostingerMailboxSummary(address="info@novarisesa.com", connected=True)
    assert bare.storage_used is None
    assert bare.messages_quota is None
    full = HostingerMailboxSummary(
        address="info@novarisesa.com",
        connected=True,
        storage_used=335790,
        storage_quota=5242880,
        messages_used=127,
        messages_quota=100000,
    )
    assert full.storage_used == 335790
    assert full.messages_quota == 100000


def test_admin_contact_info_requires_a_real_email() -> None:
    with pytest.raises(ValueError):
        AdminContactInfo(address="not-an-email", display_name="Admin")
    contact = AdminContactInfo(address="rabbani@novarisesa.com", display_name="Rabbani")
    assert contact.address == "rabbani@novarisesa.com"


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
