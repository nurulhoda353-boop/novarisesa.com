import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from app.core.config import settings

logger = logging.getLogger("novarise.hostinger_api")


class HostingerApiError(Exception):
    pass


class HostingerManagementClient:
    def __init__(self) -> None:
        if not settings.HOSTINGER_API_TOKEN:
            raise HostingerApiError("Hostinger management is not configured")
        self.base_url = settings.HOSTINGER_API_BASE_URL.rstrip("/")

    _RETRYABLE_STATUSES = {429, 502, 503, 504}
    _MAX_ATTEMPTS = 3

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            method=method,
            data=body,
            headers={
                "Authorization": f"Bearer {settings.HOSTINGER_API_TOKEN}",
                "Accept": "application/json",
                "Content-Type": "application/json",
                # Cloudflare's bot protection in front of this API blocks
                # urllib's default "Python-urllib/x.y" user agent outright
                # (Error 1010 "browser_signature_banned") — a normal-looking
                # user agent is required, not just cosmetic.
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                ),
            },
        )
        last_exc: HostingerApiError | None = None
        for attempt in range(1, self._MAX_ATTEMPTS + 1):
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    raw = response.read()
                    return json.loads(raw) if raw else None
            except urllib.error.HTTPError as exc:
                # The generic "request failed" message this used to raise
                # threw away exactly the thing needed to diagnose a failure
                # (a rate limit? a validation error? which field?) - log the
                # real status and body server-side; callers still only see a
                # generic HostingerApiError so nothing Hostinger-specific
                # leaks to the end user.
                resp_body = exc.read().decode("utf-8", errors="replace")[:1000]
                logger.warning(
                    "Hostinger API %s %s -> %s (attempt %d/%d): %s",
                    method, path, exc.code, attempt, self._MAX_ATTEMPTS, resp_body,
                )
                last_exc = HostingerApiError(
                    f"Hostinger management request failed ({exc.code})"
                )
                last_exc.__cause__ = exc
                if exc.code not in self._RETRYABLE_STATUSES or attempt == self._MAX_ATTEMPTS:
                    raise last_exc from exc
            except (urllib.error.URLError, TimeoutError) as exc:
                logger.warning(
                    "Hostinger API %s %s -> %s (attempt %d/%d)",
                    method, path, exc, attempt, self._MAX_ATTEMPTS,
                )
                last_exc = HostingerApiError("Hostinger management request failed")
                last_exc.__cause__ = exc
                if attempt == self._MAX_ATTEMPTS:
                    raise last_exc from exc
            time.sleep(0.5 * attempt)
        raise last_exc or HostingerApiError("Hostinger management request failed")

    def find_mailbox(self, address: str) -> tuple[str, str] | None:
        domain = address.rsplit("@", 1)[-1]
        query = urllib.parse.urlencode({"domain": domain, "per_page": 100})
        orders = self._request("GET", f"/orders?{query}")
        for order in (orders or {}).get("data", []):
            order_id = order.get("id")
            if not order_id:
                continue
            mailboxes = self._request(
                "GET",
                f"/orders/{urllib.parse.quote(str(order_id))}/mailboxes?search={urllib.parse.quote(address)}&per_page=100",
            )
            for mailbox in (mailboxes or {}).get("data", []):
                if str(mailbox.get("address", "")).lower() == address.lower():
                    return str(order_id), str(mailbox["id"])
        return None

    def list_all_mailboxes(self, domain: str) -> list[dict[str, Any]]:
        """Every mailbox Hostinger has for [domain], across every order -
        the admin panel's live view, independent of which of them have
        ever logged into Novamail (and so have a mail_accounts row)."""
        query = urllib.parse.urlencode({"domain": domain, "per_page": 100})
        orders = self._request("GET", f"/orders?{query}")
        mailboxes: list[dict[str, Any]] = []
        for order in (orders or {}).get("data", []):
            order_id = order.get("id")
            if not order_id:
                continue
            page = 1
            while True:
                result = self._request(
                    "GET",
                    f"/orders/{urllib.parse.quote(str(order_id))}/mailboxes?per_page=100&page={page}",
                )
                rows = (result or {}).get("data", [])
                mailboxes.extend(rows)
                meta = (result or {}).get("meta", {})
                last_page = meta.get("last_page", page)
                if page >= last_page or not rows:
                    break
                page += 1
        return mailboxes

    def change_mailbox_password(self, mailbox_id: str, password: str) -> None:
        self._request(
            "PATCH",
            f"/mailboxes/{urllib.parse.quote(mailbox_id)}/password",
            {"password": password},
        )

    def get_order_id_for_domain(self, domain: str) -> str | None:
        """The order id a new mailbox needs to be created under - callers
        that already have one (find_mailbox, list_all_mailboxes) skip this
        and walk /orders themselves; this is for callers (like creating a
        brand-new mailbox) that start with only a domain name."""
        query = urllib.parse.urlencode({"domain": domain, "per_page": 1})
        orders = self._request("GET", f"/orders?{query}")
        first = next(iter((orders or {}).get("data", [])), None)
        return str(first["id"]) if first else None

    def create_mailbox(self, order_id: str, local_part: str, password: str) -> dict[str, Any]:
        """Creates a brand-new mailbox under an order - unlike admin_provision_mailbox
        (which only ever adopts a mailbox that already exists), this is for adding a
        seat that's never existed before. The full address is local_part@<order's
        domain>; Hostinger enforces local_part's charset (letters/digits/periods) and
        the password's complexity rules itself, so no client-side validation here."""
        result = self._request(
            "POST",
            f"/orders/{urllib.parse.quote(order_id)}/mailboxes",
            {"local_part": local_part, "password": password},
        )
        return dict(result or {})

    def list_aliases(self, order_id: str) -> list[dict[str, Any]]:
        result = self._request("GET", f"/orders/{urllib.parse.quote(order_id)}/aliases?per_page=100")
        return list((result or {}).get("data", []))

    def create_alias(self, mailbox_id: str, local_part: str) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/mailboxes/{urllib.parse.quote(mailbox_id)}/aliases",
            {"local_part": local_part},
        )

    def delete_alias(self, alias_id: str) -> None:
        self._request("DELETE", f"/aliases/{urllib.parse.quote(alias_id)}")

    def list_forwarders(self, order_id: str) -> list[dict[str, Any]]:
        result = self._request(
            "GET", f"/orders/{urllib.parse.quote(order_id)}/forwarders?per_page=100"
        )
        return list((result or {}).get("data", []))

    def create_forwarder(
        self, mailbox_id: str, destination: str, keep_copy: bool
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/mailboxes/{urllib.parse.quote(mailbox_id)}/forwarders",
            {"destination": destination, "is_keep_copy_enabled": keep_copy},
        )

    def delete_forwarder(self, forwarder_id: str) -> None:
        self._request("DELETE", f"/forwarders/{urllib.parse.quote(forwarder_id)}")

    def list_autoreplies(self, order_id: str) -> list[dict[str, Any]]:
        result = self._request(
            "GET", f"/orders/{urllib.parse.quote(order_id)}/autoreplies?per_page=100"
        )
        return list((result or {}).get("data", []))

    def create_autoreply(self, mailbox_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/mailboxes/{urllib.parse.quote(mailbox_id)}/autoreplies",
            payload,
        )

    def update_autoreply(self, autoreply_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request(
            "PUT", f"/autoreplies/{urllib.parse.quote(autoreply_id)}", payload
        )

    def delete_autoreply(self, autoreply_id: str) -> None:
        self._request("DELETE", f"/autoreplies/{urllib.parse.quote(autoreply_id)}")
