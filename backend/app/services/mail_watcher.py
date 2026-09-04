"""Self-hosted mailbox push notifications: IMAP IDLE watchers broadcast over WebSocket.

This replaces Firebase Cloud Messaging for "new mail arrived" events. One background
thread per actively-watched mailbox holds an IMAP IDLE connection open and notifies
every subscribed WebSocket connection the instant new mail lands in INBOX.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import threading
from collections.abc import Callable
from typing import TYPE_CHECKING, Any

from imapclient import IMAPClient

from app.core.config import settings

if TYPE_CHECKING:
    from starlette.websockets import WebSocket

logger = logging.getLogger("novarise.mail_watcher")

IDLE_POLL_TIMEOUT = 60
INITIAL_BACKOFF_SECONDS = 5
MAX_BACKOFF_SECONDS = 120


class MailboxWatcher:
    """Holds one IMAP IDLE connection open on a background thread for one mailbox."""

    def __init__(
        self,
        account_id: str,
        address: str,
        password: str,
        loop: asyncio.AbstractEventLoop,
        on_event: Callable[[dict[str, Any]], None],
    ) -> None:
        self.account_id = account_id
        self.address = address
        self.password = password
        self._loop = loop
        self._on_event = on_event
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run, name=f"mail-idle-{self.account_id}", daemon=True
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()

    def _run(self) -> None:
        backoff = INITIAL_BACKOFF_SECONDS
        while not self._stop_event.is_set():
            try:
                self._watch_once()
                backoff = INITIAL_BACKOFF_SECONDS
            except Exception:  # noqa: BLE001 - keep the watcher alive across transient IMAP errors
                if self._stop_event.is_set():
                    return
                logger.warning(
                    "Mail watcher for account %s failed, retrying in %ss",
                    self.account_id,
                    backoff,
                    exc_info=True,
                )
                self._stop_event.wait(backoff)
                backoff = min(backoff * 2, MAX_BACKOFF_SECONDS)

    def _watch_once(self) -> None:
        with IMAPClient(
            settings.MAIL_IMAP_HOST, port=settings.MAIL_IMAP_PORT, ssl=True, timeout=20
        ) as client:
            client.login(self.address, self.password)
            client.select_folder("INBOX", readonly=True)
            last_uid = self._max_uid(client)
            while not self._stop_event.is_set():
                client.idle()
                try:
                    responses = client.idle_check(timeout=IDLE_POLL_TIMEOUT)
                finally:
                    with contextlib.suppress(Exception):
                        client.idle_done()
                if self._stop_event.is_set():
                    return
                if not responses:
                    continue
                changed = any(item[1] in (b"EXISTS", b"RECENT") for item in responses)
                if not changed:
                    continue
                current_uid = self._max_uid(client)
                if current_uid is not None and (last_uid is None or current_uid > last_uid):
                    self._emit({"event": "new_mail", "folder": "INBOX", "uid": current_uid})
                last_uid = current_uid

    @staticmethod
    def _max_uid(client: IMAPClient) -> int | None:
        uids = client.search("ALL")
        return max(uids) if uids else None

    def _emit(self, payload: dict[str, Any]) -> None:
        with contextlib.suppress(RuntimeError):
            self._loop.call_soon_threadsafe(self._on_event, payload)


class WatcherRegistry:
    """Fans IMAP IDLE events for each mailbox out to its subscribed WebSocket connections.

    In-memory and per-process: fine for a single API worker. Scaling to multiple workers
    later would need a shared broker (e.g. Redis pub/sub) instead of the local dict below.
    """

    def __init__(self) -> None:
        self._watchers: dict[str, MailboxWatcher] = {}
        self._subscribers: dict[str, set[WebSocket]] = {}
        self._lock = threading.Lock()

    async def subscribe(self, account_id: str, address: str, password: str, websocket: WebSocket) -> None:
        loop = asyncio.get_running_loop()
        with self._lock:
            subscribers = self._subscribers.setdefault(account_id, set())
            subscribers.add(websocket)
            if account_id not in self._watchers:
                watcher = MailboxWatcher(
                    account_id, address, password, loop, self._broadcaster(account_id)
                )
                self._watchers[account_id] = watcher
                watcher.start()

    async def unsubscribe(self, account_id: str, websocket: WebSocket) -> None:
        with self._lock:
            subscribers = self._subscribers.get(account_id)
            if not subscribers:
                return
            subscribers.discard(websocket)
            if not subscribers:
                self._subscribers.pop(account_id, None)
                watcher = self._watchers.pop(account_id, None)
                if watcher:
                    watcher.stop()

    def _broadcaster(self, account_id: str) -> Callable[[dict[str, Any]], None]:
        def _broadcast(payload: dict[str, Any]) -> None:
            for websocket in list(self._subscribers.get(account_id, ())):
                asyncio.create_task(self._safe_send(websocket, payload))

        return _broadcast

    @staticmethod
    async def _safe_send(websocket: WebSocket, payload: dict[str, Any]) -> None:
        with contextlib.suppress(Exception):
            await websocket.send_json(payload)

    def shutdown(self) -> None:
        with self._lock:
            for watcher in self._watchers.values():
                watcher.stop()
            self._watchers.clear()
            self._subscribers.clear()


watcher_registry = WatcherRegistry()
