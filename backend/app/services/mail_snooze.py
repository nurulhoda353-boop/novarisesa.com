"""Server-side email snoozing.

Snoozing moves a message into a dedicated "Snoozed" IMAP folder and records
the wake time in Postgres. A background poll loop (started from the app's
lifespan, see app.main) moves each message back to its original folder the
instant its wake time arrives — independent of whether the user's device is
online, unlike the mobile-only "remind me" local notification.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.mail_crypto import decrypt_mail_secret
from app.models import MailAccount, MailSnooze
from app.services.mail_client import HostingerMailboxClient, MailConnectionError

logger = logging.getLogger("novarise.mail_snooze")

SNOOZE_FOLDER = "INBOX.Snoozed"
POLL_INTERVAL_SECONDS = 30


def _wake_one(db, snooze: MailSnooze, account: MailAccount) -> None:
    try:
        password = decrypt_mail_secret(account.credential_ciphertext)
        client = HostingerMailboxClient(account.address, password)
        uid = client.find_uid_by_message_id(snooze.snoozed_folder, snooze.message_id)
        if uid is not None:
            client.move(snooze.snoozed_folder, uid, snooze.original_folder)
    except (MailConnectionError, ValueError):
        logger.warning(
            "Could not wake snoozed message %s for account %s; will retry next poll",
            snooze.id,
            account.id,
            exc_info=True,
        )
        return
    snooze.woken_at = datetime.now(UTC)
    db.commit()


def process_due_snoozes() -> None:
    with SessionLocal() as db:
        due = db.scalars(
            select(MailSnooze).where(
                MailSnooze.woken_at.is_(None),
                MailSnooze.wake_at <= datetime.now(UTC),
            )
        ).all()
        for snooze in due:
            account = db.get(MailAccount, snooze.account_id)
            if account is None or not account.is_active:
                snooze.woken_at = datetime.now(UTC)
                db.commit()
                continue
            _wake_one(db, snooze, account)


async def snooze_scheduler_loop() -> None:
    """Runs for the lifetime of the app; started/cancelled from app.main's
    lifespan.

    In-memory/per-process, like the IMAP IDLE watcher registry: correct for
    a single API worker. Scaling to multiple workers would double-process
    due snoozes without adding a shared lock (e.g. a Postgres advisory
    lock) first.
    """
    while True:
        try:
            await asyncio.to_thread(process_due_snoozes)
        except Exception:  # noqa: BLE001 - one bad poll must never kill the loop
            logger.exception("Snooze scheduler poll failed")
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
