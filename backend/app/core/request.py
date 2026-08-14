from __future__ import annotations

import ipaddress

from fastapi import Request


def _valid_ip(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return str(ipaddress.ip_address(value.strip()))
    except ValueError:
        return None


def client_ip(request: Request) -> str | None:
    """Return a validated address without allowing arbitrary INET values.

    Forwarding headers are trusted only when the direct peer is a local/private
    reverse proxy. This matches the production proxy topology and prevents a
    public client from spoofing the address used for audits and rate limits.
    """

    peer = _valid_ip(request.client.host if request.client else None)
    peer_address = ipaddress.ip_address(peer) if peer else None
    trusts_forwarding = peer_address is None or (
        peer_address.is_private or peer_address.is_loopback
    )
    if trusts_forwarding:
        forwarded = request.headers.get("cf-connecting-ip") or request.headers.get(
            "x-forwarded-for"
        )
        first = forwarded.split(",", 1)[0] if forwarded else None
        if candidate := _valid_ip(first):
            return candidate
    return peer
