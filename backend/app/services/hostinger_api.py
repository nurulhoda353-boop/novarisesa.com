import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from app.core.config import settings


class HostingerApiError(Exception):
    pass


class HostingerManagementClient:
    def __init__(self) -> None:
        if not settings.HOSTINGER_API_TOKEN:
            raise HostingerApiError("Hostinger management is not configured")
        self.base_url = settings.HOSTINGER_API_BASE_URL.rstrip("/")

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
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                raw = response.read()
                return json.loads(raw) if raw else None
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            raise HostingerApiError("Hostinger management request failed") from exc

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

    def change_mailbox_password(self, mailbox_id: str, password: str) -> None:
        self._request(
            "PATCH",
            f"/mailboxes/{urllib.parse.quote(mailbox_id)}/password",
            {"password": password},
        )

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
