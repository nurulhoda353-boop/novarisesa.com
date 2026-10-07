import uuid
from datetime import UTC, datetime

from app.core.mail_crypto import encrypt_mail_secret
from app.models import MailAccount, MailScheduledSend
from app.services import mail_scheduled_send
from app.services.mail_client import MailConnectionError


class _FakeDB:
    def __init__(self) -> None:
        self.commits = 0

    def commit(self) -> None:
        self.commits += 1


def _account() -> MailAccount:
    return MailAccount(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        address="rabbani@novarisesa.com",
        display_name="Rabbani",
        credential_ciphertext=encrypt_mail_secret("stale-password"),
        credential_type="app_password",
        provider="hostinger",
    )


def _scheduled(account: MailAccount) -> MailScheduledSend:
    return MailScheduledSend(
        id=uuid.uuid4(),
        account_id=account.id,
        subject="Hi",
        to_addresses=["someone@example.com"],
        payload={"to": ["someone@example.com"], "subject": "Hi", "text_body": "body"},
        send_at=datetime.now(UTC),
        failed_attempts=0,
    )


def test_a_broken_credential_is_retried_up_to_the_cap_then_given_up_on(monkeypatch) -> None:
    monkeypatch.setattr(
        mail_scheduled_send.HostingerMailboxClient,
        "send",
        lambda self, *a, **k: (_ for _ in ()).throw(MailConnectionError("bad credentials")),
    )

    db = _FakeDB()
    account = _account()
    scheduled = _scheduled(account)

    for attempt in range(1, mail_scheduled_send.MAX_SEND_ATTEMPTS + 1):
        mail_scheduled_send._send_one(db, scheduled, account)
        assert scheduled.failed_attempts == attempt
        assert scheduled.last_error == "bad credentials"
        if attempt < mail_scheduled_send.MAX_SEND_ATTEMPTS:
            assert scheduled.cancelled_at is None
        else:
            assert scheduled.cancelled_at is not None


def test_a_successful_send_clears_nothing_about_prior_failures_and_marks_sent(monkeypatch) -> None:
    monkeypatch.setattr(mail_scheduled_send.HostingerMailboxClient, "send", lambda self, *a, **k: None)

    db = _FakeDB()
    account = _account()
    scheduled = _scheduled(account)
    scheduled.failed_attempts = 3
    scheduled.last_error = "bad credentials"

    mail_scheduled_send._send_one(db, scheduled, account)

    assert scheduled.sent_at is not None
    assert scheduled.cancelled_at is None
    # _send_one only touches failure bookkeeping on failure - a prior
    # failure streak isn't retroactively erased, it's just moot once sent.
    assert scheduled.failed_attempts == 3
