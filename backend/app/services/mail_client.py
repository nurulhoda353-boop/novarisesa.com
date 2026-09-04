import base64
import imaplib
import re
import smtplib
import ssl
from collections.abc import Iterator
from contextlib import contextmanager, suppress
from datetime import UTC, datetime
from email import policy
from email.header import decode_header, make_header
from email.message import EmailMessage, Message
from email.parser import BytesParser
from email.utils import getaddresses, make_msgid, parsedate_to_datetime
from typing import Any

from app.core.config import settings


class MailConnectionError(Exception):
    pass


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
        payload = part.get_payload(decode=True) or b""
        if content_disposition == "attachment" or filename:
            attachments.append(
                {
                    "part": str(index),
                    "filename": _decode_header(filename) or f"attachment-{index}",
                    "content_type": content_type,
                    "size": len(payload),
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


def _summary(uid: int, folder: str, raw: bytes, flags: list[str], size: int | None = None) -> dict[str, Any]:
    message = BytesParser(policy=policy.default).parsebytes(raw)
    text, html, attachments = _body_parts(message)
    preview_source = text or re.sub(r"<[^>]+>", " ", html or "")
    preview = re.sub(r"\s+", " ", preview_source).strip()[:220]
    senders = _addresses(message, ["From"])
    return {
        "uid": uid,
        "folder": folder,
        "message_id": message.get("Message-ID"),
        "subject": _decode_header(message.get("Subject")),
        "sender": senders[0] if senders else {"name": "", "email": ""},
        "recipients": _addresses(message, ["To"]),
        "received_at": _date(message.get("Date")),
        "flags": flags,
        "preview": preview,
        "size_bytes": size or len(raw),
        "has_attachments": bool(attachments),
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
    def __init__(self, address: str, password: str):
        self.address = address
        self.password = password

    @contextmanager
    def imap(self) -> Iterator[imaplib.IMAP4_SSL]:
        client: imaplib.IMAP4_SSL | None = None
        try:
            client = imaplib.IMAP4_SSL(
                settings.MAIL_IMAP_HOST,
                settings.MAIL_IMAP_PORT,
                ssl_context=ssl.create_default_context(),
                timeout=20,
            )
            client.login(self.address, self.password)
            yield client
        except (imaplib.IMAP4.error, OSError, ssl.SSLError) as exc:
            raise MailConnectionError("Could not authenticate or connect to the mailbox") from exc
        finally:
            if client is not None:
                with suppress(imaplib.IMAP4.error, OSError):
                    client.logout()

    def verify(self) -> None:
        with self.imap() as client:
            client.noop()

    def folders(self) -> list[dict[str, Any]]:
        with self.imap() as client:
            status, rows = client.list()
            if status != "OK":
                raise MailConnectionError("Could not list mailbox folders")
            folders: list[dict[str, Any]] = []
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
                if "\\Noselect" in flags:
                    folders.append(
                        {"name": name, "flags": flags, "delimiter": delimiter, "unseen": 0, "total": 0}
                    )
                    continue
                unseen = 0
                total = 0
                status_ok, status_rows = client.status(name, "(MESSAGES UNSEEN)")
                if status_ok == "OK" and status_rows and status_rows[0]:
                    text = status_rows[0].decode("utf-8", errors="ignore")
                    messages_match = re.search(r"MESSAGES\s+(\d+)", text)
                    unseen_match = re.search(r"UNSEEN\s+(\d+)", text)
                    total = int(messages_match.group(1)) if messages_match else 0
                    unseen = int(unseen_match.group(1)) if unseen_match else 0
                folders.append(
                    {
                        "name": name,
                        "flags": flags,
                        "delimiter": delimiter,
                        "unseen": unseen,
                        "total": total,
                    }
                )
            return folders

    def messages(
        self,
        folder: str = "INBOX",
        limit: int = 30,
        before_uid: int | None = None,
        query: str | None = None,
    ) -> list[dict[str, Any]]:
        with self.imap() as client:
            status, _ = client.select(folder, readonly=True)
            if status != "OK":
                raise MailConnectionError("Mailbox folder is unavailable")
            criterion = "ALL"
            if query:
                escaped = query.replace('"', "")[:200]
                criterion = f'(OR SUBJECT "{escaped}" FROM "{escaped}")'
            status, data = client.uid("search", None, criterion)
            if status != "OK" or not data:
                return []
            uids = [int(value) for value in data[0].split()]
            if before_uid is not None:
                uids = [uid for uid in uids if uid < before_uid]
            selected = list(reversed(uids[-limit:]))
            results: list[dict[str, Any]] = []
            for uid in selected:
                fetch_status, rows = client.uid("fetch", str(uid), "(FLAGS RFC822.SIZE BODY.PEEK[])")
                if fetch_status != "OK" or not rows:
                    continue
                raw = b""
                metadata = b""
                for row in rows:
                    if isinstance(row, tuple):
                        metadata += row[0]
                        raw += row[1]
                if not raw:
                    continue
                flags_match = re.search(rb"FLAGS \(([^)]*)\)", metadata)
                size_match = re.search(rb"RFC822\.SIZE (\d+)", metadata)
                flags = flags_match.group(1).decode("ascii", errors="ignore").split() if flags_match else []
                size = int(size_match.group(1)) if size_match else None
                results.append(_summary(uid, folder, raw, flags, size))
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

    def send(self, payload: dict[str, Any], display_name: str) -> str:
        message = EmailMessage()
        message["Message-ID"] = make_msgid(domain=self.address.rsplit("@", 1)[-1])
        message["From"] = f"{display_name} <{self.address}>" if display_name else self.address
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
        total_attachment_bytes = 0
        for attachment in payload.get("attachments", []):
            decoded = base64.b64decode(attachment["content_base64"], validate=True)
            total_attachment_bytes += len(decoded)
            if total_attachment_bytes > settings.MAIL_MAX_ATTACHMENT_MB * 1024 * 1024:
                raise ValueError("Attachments exceed the configured size limit")
            content_type = attachment.get("content_type", "application/octet-stream")
            main_type, _, sub_type = content_type.partition("/")
            message.add_attachment(
                decoded,
                maintype=main_type or "application",
                subtype=sub_type or "octet-stream",
                filename=attachment["filename"],
            )
        recipients = [*payload["to"], *payload.get("cc", []), *payload.get("bcc", [])]
        try:
            with smtplib.SMTP_SSL(
                settings.MAIL_SMTP_HOST,
                settings.MAIL_SMTP_PORT,
                context=ssl.create_default_context(),
                timeout=30,
            ) as smtp:
                smtp.login(self.address, self.password)
                smtp.send_message(
                    message, from_addr=self.address, to_addrs=[str(value) for value in recipients]
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
