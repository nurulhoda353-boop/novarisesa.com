"""Server-side scheduled sending - backs both "Send later" (send_at set
by the user, hours/days out) and "Undo send" (send_at a few seconds out,
cancellable during that window). A background poll loop (started from the
app's lifespan, see app.main) fires each one over SMTP once its send_at
arrives - independent of whether the composing device is still online,
the same shape as mail_snooze's wake loop.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.mail_crypto import decrypt_mail_secret
from app.models import MailAccount, MailScheduledSend
from app.services.mail_client import HostingerMailboxClient, MailConnectionError

logger = logging.getLogger("novarise.mail_scheduled_send")

POLL_INTERVAL_SECONDS = 5


def _send_one(db, scheduled: MailScheduledSend, account: MailAccount) -> None:
    try:
        password = decrypt_mail_secret(account.credential_ciphertext)
        client = HostingerMailboxClient(account.address, password, provider=account.provider)
        client.send(
            scheduled.payload,
            account.display_name,
            from_address=scheduled.payload.get("from_address"),
        )
    except (MailConnectionError, ValueError):
        logger.warning(
            "Could not send scheduled message %s for account %s; will retry next poll",
            scheduled.id,
            account.id,
            exc_info=True,
        )
        return
    scheduled.sent_at = datetime.now(UTC)
    db.commit()


def process_due_scheduled_sends() -> None:
    with SessionLocal() as db:
        due = db.scalars(
            select(MailScheduledSend).where(
                MailScheduledSend.sent_at.is_(None),
                MailScheduledSend.cancelled_at.is_(None),
                MailScheduledSend.send_at <= datetime.now(UTC),
            )
        ).all()
        for scheduled in due:
            account = db.get(MailAccount, scheduled.account_id)
            if account is None or not account.is_active:
                scheduled.cancelled_at = datetime.now(UTC)
                db.commit()
                continue
            _send_one(db, scheduled, account)


async def scheduled_send_loop() -> None:
    """Runs for the lifetime of the app; started/cancelled from app.main's
    lifespan. Polls every 5s (much tighter than mail_snooze's 30s) because
    the undo-send window is only a few seconds wide - a slower poll would
    make "Undo" feel like it did nothing right up until the message goes
    out anyway.

    In-memory/per-process, like the IMAP IDLE watcher registry and the
    snooze loop: correct for a single API worker.
    """
    while True:
        try:
            await asyncio.to_thread(process_due_scheduled_sends)
        except Exception:  # noqa: BLE001 - one bad poll must never kill the loop
            logger.exception("Scheduled-send poll failed")
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
