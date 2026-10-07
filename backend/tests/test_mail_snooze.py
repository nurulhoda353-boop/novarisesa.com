import uuid
from datetime import UTC, datetime

from app.core.mail_crypto import encrypt_mail_secret
from app.models import MailAccount, MailSnooze
from app.services import mail_snooze
from app.services.mail_client import MailConnectionError


class _FakeDB:
    def commit(self) -> None:
        pass


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


def _snooze(account: MailAccount) -> MailSnooze:
    return MailSnooze(
        id=uuid.uuid4(),
        account_id=account.id,
        message_id="<abc@example.com>",
        subject="Hi",
        original_folder="INBOX",
        snoozed_folder=mail_snooze.SNOOZE_FOLDER,
        wake_at=datetime.now(UTC),
        failed_attempts=0,
    )


def test_a_broken_credential_is_retried_up_to_the_cap_then_given_up_on(monkeypatch) -> None:
    monkeypatch.setattr(
        mail_snooze.HostingerMailboxClient,
        "find_uid_by_message_id",
        lambda self, *a, **k: (_ for _ in ()).throw(MailConnectionError("bad credentials")),
    )

    db = _FakeDB()
    account = _account()
    snooze = _snooze(account)

    for attempt in range(1, mail_snooze.MAX_WAKE_ATTEMPTS + 1):
        mail_snooze._wake_one(db, snooze, account)
        assert snooze.failed_attempts == attempt
        assert snooze.last_error == "bad credentials"
        if attempt < mail_snooze.MAX_WAKE_ATTEMPTS:
            assert snooze.woken_at is None
        else:
            # Given up - stops being retried, but distinguishable from a
            # real wake by last_error still being set.
            assert snooze.woken_at is not None


def test_a_successful_wake_clears_nothing_about_prior_failures(monkeypatch) -> None:
    monkeypatch.setattr(
        mail_snooze.HostingerMailboxClient, "find_uid_by_message_id", lambda self, *a, **k: None
    )

    db = _FakeDB()
    account = _account()
    snooze = _snooze(account)
    snooze.failed_attempts = 3
    snooze.last_error = "bad credentials"

    mail_snooze._wake_one(db, snooze, account)

    assert snooze.woken_at is not None
    assert snooze.failed_attempts == 3
    assert snooze.last_error == "bad credentials"
