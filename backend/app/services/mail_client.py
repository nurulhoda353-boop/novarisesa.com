import asyncio
import base64
import html as html_lib
import imaplib
import logging
import re
import smtplib
import ssl
import threading
import time
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager, suppress
from datetime import UTC, date, datetime
from email import policy
from email.header import decode_header, make_header
from email.message import EmailMessage, Message
from email.parser import BytesParser
from email.utils import getaddresses, make_msgid, parsedate_to_datetime
from typing import Any

from app.core.config import settings

logger = logging.getLogger("novarise.mail_client")


class MailConnectionError(Exception):
    pass


# ---------------------------------------------------------------------------
# IMAP connection pool
#
# Every mailbox operation used to open a brand-new IMAP4_SSL connection (TLS
# handshake + LOGIN) and log out again when it was done — correct, but a
# ~0.8-1s round trip to Hostinger on *every single request*, which is what
# made the web/mobile clients feel sluggish. This keeps at most one live,
# already-authenticated connection open per mailbox address, reused across
# requests; a per-account lock serializes access to it (IMAP has no concept
# of concurrent commands on one connection anyway). In-memory/per-process,
# like the IMAP IDLE watcher registry and the snooze scheduler — correct for
# a single API worker.
# ---------------------------------------------------------------------------


class _PooledConnection:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.client: imaplib.IMAP4_SSL | None = None
        self.last_used: float = 0.0


_pool: dict[str, _PooledConnection] = {}
_pool_registry_lock = threading.Lock()
STALE_CHECK_AFTER_SECONDS = 20
IDLE_CLOSE_AFTER_SECONDS = 300
# How many of a mailbox's folders can have their unread/total counts
# fetched at once - bounded so a mailbox with many custom (rule-created)
# folders can't open unbounded simultaneous IMAP connections in one request.
STATUS_FETCH_CONCURRENCY = 6


def _pooled_connection(address: str) -> _PooledConnection:
    with _pool_registry_lock:
        entry = _pool.get(address)
        if entry is None:
            entry = _PooledConnection()
            _pool[address] = entry
        return entry


def close_idle_imap_connections(max_idle_seconds: float = IDLE_CLOSE_AFTER_SECONDS) -> None:
    """Closes pooled connections nobody has used in a while, so a mailbox a
    user stopped actively viewing doesn't hold an authenticated IMAP session
    open on Hostinger's server forever."""
    now = time.monotonic()
    with _pool_registry_lock:
        entries = list(_pool.items())
    for address, entry in entries:
        if not entry.lock.acquire(blocking=False):
            continue
        try:
            if entry.client is not None and now - entry.last_used > max_idle_seconds:
                with suppress(Exception):
                    entry.client.logout()
                entry.client = None
        finally:
            entry.lock.release()


def close_all_imap_connections() -> None:
    with _pool_registry_lock:
        entries = list(_pool.values())
    for entry in entries:
        with entry.lock:
            if entry.client is not None:
                with suppress(Exception):
                    entry.client.logout()
                entry.client = None


POOL_MAINTENANCE_INTERVAL_SECONDS = 60


async def imap_pool_maintenance_loop() -> None:
    """Runs for the lifetime of the app; started/cancelled from app.main's
    lifespan, alongside the snooze scheduler and the IMAP IDLE watcher
    registry it's modeled on. Periodically sweeps the connection pool for
    entries idle past IDLE_CLOSE_AFTER_SECONDS and closes them."""
    while True:
        try:
            await asyncio.to_thread(close_idle_imap_connections)
        except Exception:  # noqa: BLE001 - one bad sweep must never kill the loop
            logger.exception("IMAP pool maintenance sweep failed")
        await asyncio.sleep(POOL_MAINTENANCE_INTERVAL_SECONDS)


def _decode_header(value: str | None) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except (LookupError, UnicodeError):
        return value


def _addresses(message: Message, headers: list[str]) -> list[dict[str, str]]:
    values: list[str] = []
    for header in headers:
        values.extend(message.get_all(header, []))
    return [
        {"name": _decode_header(name), "email": address.lower()}
        for name, address in getaddresses(values)
        if address
    ]


def _date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        return parsed
    except (TypeError, ValueError, OverflowError):
        return None


def _body_parts(message: Message) -> tuple[str, str | None, list[dict[str, Any]]]:
    text = ""
    html: str | None = None
    attachments: list[dict[str, Any]] = []
    parts = message.walk() if message.is_multipart() else [message]
    for index, part in enumerate(parts, start=1):
        content_disposition = part.get_content_disposition()
        filename = part.get_filename()
        content_type = part.get_content_type()
        content_id = part.get("Content-ID")
        payload = part.get_payload(decode=True) or b""
        if content_disposition == "attachment" or filename or content_id:
            attachments.append(
                {
                    "part": str(index),
                    "filename": _decode_header(filename) or f"attachment-{index}",
                    "content_type": content_type,
                    "content_id": content_id.strip("<>") if content_id else None,
                    "size": len(payload),
                    # Inline images referenced by the HTML body via cid: aren't
                    # "attachments" from the user's point of view.
                    "is_inline": bool(content_id) and content_disposition != "attachment",
                }
            )
            continue
        if part.is_multipart():
            continue
        charset = part.get_content_charset() or "utf-8"
        try:
            decoded = payload.decode(charset, errors="replace")
        except LookupError:
            decoded = payload.decode("utf-8", errors="replace")
        if content_type == "text/plain" and not text:
            text = decoded
        elif content_type == "text/html" and html is None:
            html = decoded
    return text, html, attachments


def _references(message: Message) -> list[str]:
    raw = message.get("References", "")
    return [ref.strip() for ref in raw.split() if ref.strip()]


def _preview_from_body(text: str, html: str | None) -> str:
    html_without_style = re.sub(r"(?is)<(style|script)\b[^>]*>.*?</\1>", " ", html or "")
    preview_source = text or html_lib.unescape(re.sub(r"<[^>]+>", " ", html_without_style))
    # Marketing templates often pad the start of the HTML body with a long
    # run of invisible characters (zero-width space/joiner, BOM, combining
    # grapheme joiner) to control what Gmail/Outlook show as the inbox
    # snippet - strip them before collapsing whitespace, or the preview is
    # just that padding instead of the real first words.
    preview_source = re.sub(r"[​‌‍﻿͏]+", "", preview_source)
    return re.sub(r"\s+", " ", preview_source).strip()[:220]


def _summary(uid: int, folder: str, raw: bytes, flags: list[str], size: int | None = None) -> dict[str, Any]:
    message = BytesParser(policy=policy.default).parsebytes(raw)
    text, html, attachments = _body_parts(message)
    preview = _preview_from_body(text, html)
    senders = _addresses(message, ["From"])
    return {
        "uid": uid,
        "folder": folder,
        "message_id": message.get("Message-ID"),
        "in_reply_to": message.get("In-Reply-To"),
        "references": _references(message),
        "subject": _decode_header(message.get("Subject")),
        "sender": senders[0] if senders else {"name": "", "email": ""},
        "recipients": _addresses(message, ["To"]),
        "received_at": _date(message.get("Date")),
        "flags": flags,
        "preview": preview,
        "size_bytes": size or len(raw),
        "has_attachments": any(not item["is_inline"] for item in attachments),
    }


def _list_summary(
    uid: int,
    folder: str,
    header_bytes: bytes,
    text_snippet: bytes,
    flags: list[str],
    size: int | None,
    has_attachments: bool,
) -> dict[str, Any]:
    """Builds a message-list row from a header-only fetch instead of the full
    raw message _summary() needs. Used by messages() so listing an inbox
    doesn't pull every message's full body - attachments included - over the
    wire just to show a subject line and a snippet."""
    message = BytesParser(policy=policy.default).parsebytes(header_bytes)
    # `text_snippet` is a bounded byte-range fetch of the *whole* raw message
    # (headers + start of body), not the decoded body text - for a
    # multipart message, a naive HTML-strip of these raw bytes shows the
    # MIME envelope itself (--boundary markers, "Content-Type:
    # multipart/related", base64 preamble, etc.) verbatim, which is exactly
    # what showed up as garbage previews. Parsing it as a MIME message and
    # reusing the same body-extraction _summary() uses fixes that; a
    # partial fetch parses fine as long as the first text part landed
    # inside the byte budget, which it does for the near-universal case of
    # senders putting the text/plain or text/html part before attachments.
    try:
        snippet_message = BytesParser(policy=policy.default).parsebytes(text_snippet)
        text, html, _ = _body_parts(snippet_message)
    except Exception:
        text, html = "", None
    # No raw-bytes fallback here on purpose: a message whose header block
    # (Received/DKIM-Signature/ARC-* chains routinely run several KB on
    # mail relayed through Google) ate the whole partial-fetch budget
    # before any real body part showed up would otherwise show that raw
    # header soup as the "preview" - worse than just leaving it blank.
    preview = _preview_from_body(text, html)
    senders = _addresses(message, ["From"])
    return {
        "uid": uid,
        "folder": folder,
        "message_id": message.get("Message-ID"),
        "in_reply_to": message.get("In-Reply-To"),
        "references": _references(message),
        "subject": _decode_header(message.get("Subject")),
        "sender": senders[0] if senders else {"name": "", "email": ""},
        "recipients": _addresses(message, ["To"]),
        "received_at": _date(message.get("Date")),
        "flags": flags,
        "preview": preview,
        "size_bytes": size or 0,
        "has_attachments": has_attachments,
    }


def _attachment_from_raw(raw: bytes, part_number: str) -> tuple[str, str, bytes]:
    message = BytesParser(policy=policy.default).parsebytes(raw)
    for index, part in enumerate(message.walk() if message.is_multipart() else [message], start=1):
        if str(index) != part_number:
            continue
        filename = part.get_filename()
        if part.get_content_disposition() != "attachment" and not filename:
            break
        return (
            _decode_header(filename) or f"attachment-{index}",
            part.get_content_type(),
            part.get_payload(decode=True) or b"",
        )
    raise KeyError("Attachment not found")


class HostingerMailboxClient:
    """Despite the name (most mailboxes on this domain are Hostinger-hosted,
    and this predates any other kind), this is provider-agnostic - `provider`
    picks which IMAP/SMTP endpoints a given mailbox actually lives behind
    (see MailAccount.provider). Renaming this class would touch a lot of
    call sites for no functional gain, so it's left as-is."""

    def __init__(self, address: str, password: str, provider: str = "hostinger"):
        self.address = address
        self.password = password
        if provider == "google":
            self._imap_host = settings.MAIL_GOOGLE_IMAP_HOST
            self._imap_port = settings.MAIL_GOOGLE_IMAP_PORT
            self._smtp_host = settings.MAIL_GOOGLE_SMTP_HOST
            self._smtp_port = settings.MAIL_GOOGLE_SMTP_PORT
        else:
            self._imap_host = settings.MAIL_IMAP_HOST
            self._imap_port = settings.MAIL_IMAP_PORT
            self._smtp_host = settings.MAIL_SMTP_HOST
            self._smtp_port = settings.MAIL_SMTP_PORT

    def _connect(self) -> imaplib.IMAP4_SSL:
        try:
            client = imaplib.IMAP4_SSL(
                self._imap_host,
                self._imap_port,
                ssl_context=ssl.create_default_context(),
                timeout=20,
            )
            client.login(self.address, self.password)
        except (imaplib.IMAP4.error, OSError, ssl.SSLError) as exc:
            raise MailConnectionError("Could not authenticate or connect to the mailbox") from exc
        return client

    def _borrow(self, entry: _PooledConnection) -> imaplib.IMAP4_SSL:
        if entry.client is not None:
            if time.monotonic() - entry.last_used < STALE_CHECK_AFTER_SECONDS:
                return entry.client
            try:
                entry.client.noop()
                return entry.client
            except Exception:  # noqa: BLE001 - any failure here just means "reconnect"
                with suppress(Exception):
                    entry.client.logout()
                entry.client = None
        entry.client = self._connect()
        return entry.client

    @contextmanager
    def imap(self) -> Iterator[imaplib.IMAP4_SSL]:
        entry = _pooled_connection(self.address)
        with entry.lock:
            client = self._borrow(entry)
            try:
                yield client
            except (imaplib.IMAP4.error, OSError, ssl.SSLError) as exc:
                with suppress(Exception):
                    client.logout()
                entry.client = None
                raise MailConnectionError("Could not authenticate or connect to the mailbox") from exc
            else:
                entry.last_used = time.monotonic()

    def verify(self) -> None:
        with self.imap() as client:
            client.noop()

    def folders(self) -> list[dict[str, Any]]:
        with self.imap() as client:
            status, rows = client.list()
            if status != "OK":
                raise MailConnectionError("Could not list mailbox folders")
            entries: list[dict[str, Any]] = []
            selectable: list[str] = []
            pattern = re.compile(rb'^\((?P<flags>[^)]*)\)\s+"?(?P<delimiter>[^" ]*)"?\s+"?(?P<name>.*)"?$')
            for row in rows or []:
                if not isinstance(row, bytes):
                    continue
                match = pattern.match(row)
                if not match:
                    continue
                name = match.group("name").rstrip(b'"').decode("utf-8", errors="replace")
                flags = match.group("flags").decode("ascii", errors="ignore").split()
                delimiter = match.group("delimiter").decode("ascii", errors="ignore") or None
                entries.append({"name": name, "flags": flags, "delimiter": delimiter, "unseen": 0, "total": 0})
                if "\\Noselect" not in flags:
                    selectable.append(name)

        # STATUS has no batch form - IMAP only takes one mailbox name per
        # call. Fetching each folder's counts over the single pooled
        # connection one at a time (the previous approach) made this
        # endpoint's latency scale linearly with folder count - a plain
        # 6-folder mailbox alone measured ~900ms. Each folder's STATUS is
        # independent, so run them concurrently over their own short-lived
        # connections instead (bounded, so a mailbox with many custom
        # folders can't open unbounded connections at once); a failure on
        # any one folder just leaves it at 0/0 rather than failing the list.
        counts = self._status_many(selectable)
        for entry in entries:
            if entry["name"] in counts:
                entry["unseen"], entry["total"] = counts[entry["name"]]
        return entries

    def _status_one(self, name: str) -> tuple[int, int]:
        try:
            client = self._connect()
        except MailConnectionError:
            logger.warning("Could not open a connection to fetch STATUS for %s", name)
            return 0, 0
        try:
            status_ok, status_rows = client.status(name, "(MESSAGES UNSEEN)")
        except (imaplib.IMAP4.error, OSError, ssl.SSLError) as exc:
            logger.warning("STATUS command failed for %s: %s", name, exc)
            return 0, 0
        finally:
            with suppress(Exception):
                client.logout()
        if status_ok != "OK" or not status_rows or not status_rows[0]:
            return 0, 0
        text = status_rows[0].decode("utf-8", errors="ignore")
        messages_match = re.search(r"MESSAGES\s+(\d+)", text)
        unseen_match = re.search(r"UNSEEN\s+(\d+)", text)
        total = int(messages_match.group(1)) if messages_match else 0
        unseen = int(unseen_match.group(1)) if unseen_match else 0
        return unseen, total

    def _status_many(self, names: list[str]) -> dict[str, tuple[int, int]]:
        if not names:
            return {}
        with ThreadPoolExecutor(max_workers=min(len(names), STATUS_FETCH_CONCURRENCY)) as pool:
            results = list(pool.map(self._status_one, names))
        return dict(zip(names, results, strict=True))

    def messages(
        self,
        folder: str = "INBOX",
        limit: int = 30,
        before_uid: int | None = None,
        query: str | None = None,
        from_contains: str | None = None,
        since: date | None = None,
        before: date | None = None,
        has_attachment: bool | None = None,
        starred: bool | None = None,
    ) -> list[dict[str, Any]]:
        # Folders like Archive are created lazily on first use (see move());
        # viewing one before that has happened should read as empty, not a
        # connection error.
        if folder != "INBOX":
            self.ensure_folder(folder)
        with self.imap() as client:
            status, _ = client.select(folder, readonly=True)
            if status != "OK":
                raise MailConnectionError("Mailbox folder is unavailable")
            clauses: list[str] = []
            if query:
                escaped = query.replace('"', "")[:200]
                clauses.append(f'(OR SUBJECT "{escaped}" FROM "{escaped}")')
            if from_contains:
                clauses.append(f'FROM "{from_contains.replace(chr(34), "")[:200]}"')
            if since:
                clauses.append(f"SINCE {since.strftime('%d-%b-%Y')}")
            if before:
                clauses.append(f"BEFORE {before.strftime('%d-%b-%Y')}")
            if starred:
                clauses.append("FLAGGED")
            criterion = " ".join(clauses) or "ALL"
            status, data = client.uid("search", None, criterion)
            if status != "OK" or not data:
                return []
            uids = [int(value) for value in data[0].split()]
            if before_uid is not None:
                uids = [uid for uid in uids if uid < before_uid]
            uids = list(reversed(uids))
            results: list[dict[str, Any]] = []
            # has_attachment can't be expressed as an IMAP search term, so we
            # walk newest-first until `limit` matching messages are found
            # (bounded so a mailbox with no attachments at all can't spin
            # through its entire history in one request).
            scan_budget = max(limit * 8, 200)
            for uid in uids:
                if len(results) >= limit or scan_budget <= 0:
                    break
                scan_budget -= 1
                # Only headers + a bounded preview snippet + BODYSTRUCTURE (to
                # tell if there's a real attachment) - never the full body.
                # A list row used to fetch BODY.PEEK[] (the entire raw
                # message, attachments included) for every candidate, which
                # meant listing an inbox with a few large attachments could
                # pull tens of megabytes over IMAP just to render subject
                # lines. message() below still fetches the full body, but
                # only for the one message actually being opened.
                # BODY[TEXT] only means "everything after the top-level
                # headers" - for a multipart message that's the raw MIME
                # envelope (boundary markers, nested Content-Type headers,
                # etc.), not any part's decoded text. Fetching a slice of
                # the *whole* message from byte 0 instead lets it be parsed
                # as a real (if truncated) MIME message in _list_summary.
                # 32KB (not the original 4-8KB) because a message relayed
                # through Google routinely carries several KB of Received/
                # DKIM-Signature/ARC-* headers alone - a smaller budget can
                # be entirely consumed before reaching any real body part.
                fetch_status, rows = client.uid(
                    "fetch",
                    str(uid),
                    "(FLAGS RFC822.SIZE BODYSTRUCTURE BODY.PEEK[HEADER] BODY.PEEK[]<0.32000>)",
                )
                if fetch_status != "OK" or not rows:
                    continue
                metadata = b""
                header_bytes = b""
                text_bytes = b""
                for row in rows:
                    if isinstance(row, tuple):
                        marker, literal = row
                        metadata += marker
                        if b"HEADER" in marker:
                            header_bytes += literal
                        else:
                            text_bytes += literal
                    elif isinstance(row, bytes):
                        metadata += row
                if not header_bytes:
                    continue
                flags_match = re.search(rb"FLAGS \(([^)]*)\)", metadata)
                size_match = re.search(rb"RFC822\.SIZE (\d+)", metadata)
                flags = flags_match.group(1).decode("ascii", errors="ignore").split() if flags_match else []
                size = int(size_match.group(1)) if size_match else None
                # A real (non-inline) attachment always carries an explicit
                # "attachment" disposition in BODYSTRUCTURE from every
                # mainstream MTA; inline cid: images use "inline" instead, so
                # this can't mistake a signature logo for an attachment.
                message_has_attachment = bool(re.search(rb'"attachment"', metadata, re.IGNORECASE))
                if has_attachment and not message_has_attachment:
                    continue
                summary = _list_summary(uid, folder, header_bytes, text_bytes, flags, size, message_has_attachment)
                results.append(summary)
            return results

    def message(self, folder: str, uid: int) -> dict[str, Any]:
        with self.imap() as client:
            status, _ = client.select(folder, readonly=True)
            if status != "OK":
                raise MailConnectionError("Mailbox folder is unavailable")
            status, rows = client.uid("fetch", str(uid), "(FLAGS RFC822.SIZE BODY.PEEK[])")
            if status != "OK" or not rows:
                raise KeyError("Message not found")
            raw = b""
            metadata = b""
            for row in rows:
                if isinstance(row, tuple):
                    metadata += row[0]
                    raw += row[1]
            if not raw:
                raise KeyError("Message not found")
            flags_match = re.search(rb"FLAGS \(([^)]*)\)", metadata)
            flags = flags_match.group(1).decode("ascii", errors="ignore").split() if flags_match else []
            summary = _summary(uid, folder, raw, flags)
            message = BytesParser(policy=policy.default).parsebytes(raw)
            text, html, attachments = _body_parts(message)
            return {
                **summary,
                "text_body": text,
                "html_body": html,
                "cc": _addresses(message, ["Cc"]),
                "attachments": attachments,
            }

    def attachment(self, folder: str, uid: int, part_number: str) -> tuple[str, str, bytes]:
        with self.imap() as client:
            status, _ = client.select(folder, readonly=True)
            if status != "OK":
                raise MailConnectionError("Mailbox folder is unavailable")
            status, rows = client.uid("fetch", str(uid), "(BODY.PEEK[])")
            if status != "OK" or not rows:
                raise KeyError("Message not found")
            raw = b"".join(row[1] for row in rows if isinstance(row, tuple))
            if not raw:
                raise KeyError("Message not found")
            return _attachment_from_raw(raw, part_number)

    def set_flag(self, folder: str, uid: int, flag: str, value: bool) -> None:
        with self.imap() as client:
            status, _ = client.select(folder)
            if status != "OK":
                raise MailConnectionError("Mailbox folder is unavailable")
            operation = "+FLAGS.SILENT" if value else "-FLAGS.SILENT"
            status, _ = client.uid("store", str(uid), operation, f"({flag})")
            if status != "OK":
                raise MailConnectionError("Message could not be updated")

    def move(self, folder: str, uid: int, destination: str) -> None:
        self.ensure_folder(destination)
        with self.imap() as client:
            status, _ = client.select(folder)
            if status != "OK":
                raise MailConnectionError("Mailbox folder is unavailable")
            status, _ = client.uid("copy", str(uid), destination)
            if status != "OK":
                raise MailConnectionError("Message could not be moved")
            client.uid("store", str(uid), "+FLAGS.SILENT", "(\\Deleted)")
            client.expunge()

    def delete(self, folder: str, uid: int) -> None:
        with self.imap() as client:
            status, _ = client.select(folder)
            if status != "OK":
                raise MailConnectionError("Mailbox folder is unavailable")
            status, _ = client.uid("store", str(uid), "+FLAGS.SILENT", "(\\Deleted)")
            if status != "OK":
                raise MailConnectionError("Message could not be deleted")
            client.expunge()

    def ensure_folder(self, name: str) -> None:
        """Creates `name` if it doesn't already exist. Used for the Snoozed
        folder; safe to call even when it's already there."""
        with self.imap() as client:
            status, rows = client.list()
            if status == "OK":
                for row in rows or []:
                    if isinstance(row, bytes) and row.endswith(f'"{name}"'.encode()):
                        return
                    if isinstance(row, bytes) and row.decode("utf-8", errors="replace").endswith(name):
                        return
            client.create(name)

    def find_uid_by_message_id(self, folder: str, message_id: str) -> int | None:
        """Looks up a message's current UID in `folder` by its Message-ID
        header. UIDs are per-folder, so after a move the UID we knew before
        is meaningless — this is how the snooze scheduler relocates a
        message it moved earlier."""
        escaped = message_id.replace('"', "")
        with self.imap() as client:
            status, _ = client.select(folder, readonly=True)
            if status != "OK":
                raise MailConnectionError("Mailbox folder is unavailable")
            status, data = client.uid("search", None, f'(HEADER "Message-ID" "{escaped}")')
            if status != "OK" or not data or not data[0]:
                return None
            uids = [int(value) for value in data[0].split()]
            return uids[0] if uids else None

    def send(self, payload: dict[str, Any], display_name: str, from_address: str | None = None) -> str:
        sender_address = from_address or self.address
        message = EmailMessage()
        message["Message-ID"] = make_msgid(domain=self.address.rsplit("@", 1)[-1])
        message["From"] = f"{display_name} <{sender_address}>" if display_name else sender_address
        message["To"] = ", ".join(str(value) for value in payload["to"])
        if payload.get("cc"):
            message["Cc"] = ", ".join(str(value) for value in payload["cc"])
        message["Subject"] = payload.get("subject", "")
        if payload.get("reply_to_message_id"):
            message["In-Reply-To"] = payload["reply_to_message_id"]
            message["References"] = payload["reply_to_message_id"]
        message.set_content(payload.get("text_body") or "")
        if payload.get("html_body"):
            message.add_alternative(payload["html_body"], subtype="html")
        # An inline image (composed body has <img src="cid:...">) has to be
        # attached to the *html part itself* as a "related" sub-part with a
        # matching Content-ID, not to the message as a whole - add_attachment
        # on the top-level message always produces a regular, downloadable
        # attachment instead.
        html_part = message.get_body(preferencelist=("html",)) if payload.get("html_body") else None
        total_attachment_bytes = 0
        for attachment in payload.get("attachments", []):
            decoded = base64.b64decode(attachment["content_base64"], validate=True)
            total_attachment_bytes += len(decoded)
            if total_attachment_bytes > settings.MAIL_MAX_ATTACHMENT_MB * 1024 * 1024:
                raise ValueError("Attachments exceed the configured size limit")
            content_type = attachment.get("content_type", "application/octet-stream")
            main_type, _, sub_type = content_type.partition("/")
            if attachment.get("is_inline") and attachment.get("content_id") and html_part is not None:
                html_part.add_related(
                    decoded,
                    maintype=main_type or "application",
                    subtype=sub_type or "octet-stream",
                    cid=f"<{attachment['content_id']}>",
                )
            else:
                message.add_attachment(
                    decoded,
                    maintype=main_type or "application",
                    subtype=sub_type or "octet-stream",
                    filename=attachment["filename"],
                )
        recipients = [*payload["to"], *payload.get("cc", []), *payload.get("bcc", [])]
        try:
            with smtplib.SMTP_SSL(
                self._smtp_host,
                self._smtp_port,
                context=ssl.create_default_context(),
                timeout=30,
            ) as smtp:
                smtp.login(self.address, self.password)
                smtp.send_message(
                    message, from_addr=sender_address, to_addrs=[str(value) for value in recipients]
                )
        except (smtplib.SMTPException, OSError, ssl.SSLError) as exc:
            raise MailConnectionError("Email could not be sent") from exc
        with suppress(Exception):
            # Best-effort: the message is already sent via SMTP at this point,
            # so a failure to also copy it into Sent must never be reported to
            # the caller as a failed send.
            self._append_sent(message.as_bytes())
        return message.get("Message-ID", "")

    def _append_sent(self, raw: bytes) -> None:
        with self.imap() as client:
            status, rows = client.list()
            sent_folder = "Sent"
            if status == "OK":
                for row in rows or []:
                    if isinstance(row, bytes) and b"\\Sent" in row:
                        match = re.search(rb'\s"?([^" ]+(?: [^"]+)?)"?$', row)
                        if match:
                            sent_folder = match.group(1).decode("utf-8", errors="replace").strip('"')
                            break
            client.append(sent_folder, "(\\Seen)", imaplib.Time2Internaldate(datetime.now(UTC)), raw)
