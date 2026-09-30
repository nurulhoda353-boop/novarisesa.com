"""In-process early-warning monitor for the mail stack.

Catches the exact failure shape behind the 2026-09-30 client report (a
Gmail-connected mailbox silently erroring on every IMAP STATUS call, and
webmail sessions repeatedly failing to refresh) before a client has to
report it again: a logging.Handler counts WARNING+ records from the mail
services and a small ASGI middleware counts failed refresh attempts, and a
background loop (started from app.main's lifespan, same pattern as the
snooze scheduler) checks both every CHECK_INTERVAL_SECONDS and raises an
alert if either crosses a threshold within the window.

`send_alert` is intentionally a thin, replaceable hook - right now it only
logs a clearly greppable "ALERT:" line (so Coolify's log viewer surfaces it
immediately), but it's the single place to wire up an email/webhook once
there's a mailbox or service designated to send from.
"""

from __future__ import annotations

import asyncio
import logging
import threading
from collections import defaultdict

logger = logging.getLogger("novarise.mail_health_monitor")

CHECK_INTERVAL_SECONDS = 900  # 15 minutes
# More than this many WARNING+ records from a single watched logger within
# one window means something is actively, repeatedly failing - not a single
# transient blip (those are expected and otherwise-harmless).
WARNING_THRESHOLD = 15
# More than this many failed refreshes within one window - the shape of the
# multi-tab refresh-token race (see webmail/lib/api.ts) if it ever comes
# back, or any other cause of webmail sessions dying.
REFRESH_FAILURE_THRESHOLD = 20

WATCHED_LOGGERS = (
    "novarise.mail_client",
    "novarise.hostinger_api",
    "novarise.mail_watcher",
    "novarise.mail_snooze",
    "novarise.mail_scheduled_send",
)


class _WarningCounter(logging.Handler):
    """Tallies WARNING+ records per logger name; a cheap in-memory counter,
    not a log store - only ever read/reset by the poll loop below."""

    def __init__(self) -> None:
        super().__init__(level=logging.WARNING)
        self._lock = threading.Lock()
        self._counts: dict[str, int] = defaultdict(int)

    def emit(self, record: logging.LogRecord) -> None:
        with self._lock:
            self._counts[record.name] += 1

    def drain(self) -> dict[str, int]:
        with self._lock:
            counts, self._counts = dict(self._counts), defaultdict(int)
        return counts


_warning_counter = _WarningCounter()
_refresh_failures_lock = threading.Lock()
_refresh_failures = 0


def install() -> None:
    """Attaches the warning counter to the watched loggers. Called once
    from app.main at import time - idempotent, safe to call more than
    once (e.g. under a test harness that imports the module repeatedly)."""
    for name in WATCHED_LOGGERS:
        watched = logging.getLogger(name)
        if _warning_counter not in watched.handlers:
            watched.addHandler(_warning_counter)


def record_refresh_failure() -> None:
    """Called by the /mail/auth/refresh route on every 401 it returns."""
    global _refresh_failures
    with _refresh_failures_lock:
        _refresh_failures += 1


def _drain_refresh_failures() -> int:
    global _refresh_failures
    with _refresh_failures_lock:
        count, _refresh_failures = _refresh_failures, 0
    return count


def send_alert(subject: str, body: str) -> None:
    # Deliberately just a prominent log line for now, not an email/webhook -
    # see the module docstring. logger.error (not .warning) so it's never
    # mistaken for one of the very warnings it's reporting on.
    logger.error("ALERT: %s | %s", subject, body)


def check_once() -> None:
    warning_counts = _warning_counter.drain()
    for name, count in warning_counts.items():
        if count > WARNING_THRESHOLD:
            send_alert(
                f"{name} is logging warnings repeatedly",
                f"{count} warning(s) in the last {CHECK_INTERVAL_SECONDS // 60} minutes "
                f"(threshold {WARNING_THRESHOLD}). Check recent logs for that logger.",
            )
    refresh_failures = _drain_refresh_failures()
    if refresh_failures > REFRESH_FAILURE_THRESHOLD:
        send_alert(
            "Webmail sessions are repeatedly failing to refresh",
            f"{refresh_failures} failed /mail/auth/refresh attempt(s) in the last "
            f"{CHECK_INTERVAL_SECONDS // 60} minutes (threshold {REFRESH_FAILURE_THRESHOLD}). "
            "Users may be getting logged out unexpectedly.",
        )


async def mail_health_monitor_loop() -> None:
    """Runs for the lifetime of the app; started/cancelled from app.main's
    lifespan, same as the other background poll loops."""
    install()
    while True:
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
        try:
            await asyncio.to_thread(check_once)
        except Exception:  # noqa: BLE001 - one bad check must never kill the loop
            logger.exception("Mail health monitor check failed")
