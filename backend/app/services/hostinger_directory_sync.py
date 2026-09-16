"""Keeps the compose directory (`/mail/directory`, used by both the web
app and the mobile app to autocomplete To/Cc/Bcc) in sync with whatever
mailboxes actually exist on Hostinger - without waiting for each one's
real owner to log into Novamail first, and without ever touching a real
mailbox's password to do it.

A background poll loop (started from the app's lifespan, see app.main)
lists every mailbox Hostinger has for our allowed domains and, for any
address we don't already have a mail_accounts row for, creates a
lightweight "directory stub": a User + MailAccount row good enough to
show up in the directory and receive mail, but with no usable
credential and no novamail_password_hash set. That last part matters -
login() only trusts a submitted password once it has verified it
against the real Hostinger mailbox (see login(), app/api/routes/mail.py),
which it always does for an account with no novamail_password_hash. So
the very first time the stub's real owner logs in, login() re-verifies
their password against Hostinger itself, then overwrites the stub's
placeholder credential_ciphertext with the real one - the stub silently
turns into a normal connected account with zero special-casing needed
in login() itself.
"""

from __future__ import annotations

import asyncio
import logging
import secrets

from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.mail_crypto import encrypt_mail_secret
from app.core.security import hash_password
from app.models import MailAccount, User
from app.services.hostinger_api import HostingerApiError, HostingerManagementClient

logger = logging.getLogger("novarise.hostinger_directory_sync")

POLL_INTERVAL_SECONDS = 30 * 60


def sync_hostinger_directory() -> int:
    """Creates directory-stub rows for any Hostinger mailbox we don't
    already know about. Returns how many were created."""
    if not settings.HOSTINGER_API_TOKEN:
        logger.warning("Hostinger directory sync: HOSTINGER_API_TOKEN is not configured, skipping")
        return 0
    try:
        client = HostingerManagementClient()
    except HostingerApiError:
        logger.exception("Hostinger directory sync: could not build a Hostinger client")
        return 0

    domains = {item.lower() for item in settings.MAIL_ALLOWED_DOMAINS}
    rows: list[dict] = []
    try:
        for domain in domains:
            rows.extend(client.list_all_mailboxes(domain))
    except HostingerApiError:
        logger.exception("Hostinger directory sync: failed to list mailboxes")
        return 0

    created = 0
    with SessionLocal() as db:
        known = {row.address.lower() for row in db.scalars(select(MailAccount))}
        seen: set[str] = set()
        for row in rows:
            address = str(row.get("address", "")).lower()
            if not address or address in seen or address in known:
                continue
            seen.add(address)

            user = db.scalar(select(User).where(User.email == address))
            if user is None:
                user = User(
                    email=address,
                    full_name=address.split("@", 1)[0].replace(".", " ").title(),
                    password_hash=hash_password(secrets.token_urlsafe(48)),
                    is_active=True,
                    is_verified=True,
                )
                db.add(user)
                db.flush()

            order_id = row.get("order_id")
            mailbox_id = row.get("id")
            account = MailAccount(
                user_id=user.id,
                address=address,
                display_name=user.full_name,
                # Not a usable credential - nobody can log in with it, since
                # login() for an account with no novamail_password_hash
                # always re-verifies the submitted password against the
                # real Hostinger mailbox before trusting anything, and this
                # ciphertext decrypts to noise, not the real password.
                credential_ciphertext=encrypt_mail_secret(secrets.token_urlsafe(32)),
                credential_type="directory_stub",
                cache_ttl_days=settings.MAIL_CACHE_DAYS,
                hostinger_order_id=str(order_id) if order_id else None,
                hostinger_mailbox_id=str(mailbox_id) if mailbox_id else None,
                role="member",
                is_active=True,
                last_connected_at=None,
            )
            db.add(account)
            created += 1
            known.add(address)

        if created:
            db.commit()
    logger.info(
        "Hostinger directory sync: %s mailbox(es) listed on Hostinger, %s already known, %s created",
        len(rows),
        len(rows) - created,
        created,
    )
    return created


async def hostinger_directory_sync_loop() -> None:
    while True:
        try:
            await asyncio.to_thread(sync_hostinger_directory)
        except Exception:  # noqa: BLE001 - one bad poll must never kill the loop
            logger.exception("Hostinger directory sync poll failed")
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
