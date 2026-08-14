from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models import RateLimitEvent


def rate_key(*parts: str | None) -> str:
    normalized = "|".join((part or "unknown").strip().casefold() for part in parts)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def enforce_rate_limit(
    db: Session,
    *,
    scope: str,
    key_hash: str,
    maximum: int,
    window: timedelta,
) -> None:
    cutoff = datetime.now(UTC) - window
    count = db.scalar(
        select(func.count())
        .select_from(RateLimitEvent)
        .where(
            RateLimitEvent.scope == scope,
            RateLimitEvent.key_hash == key_hash,
            RateLimitEvent.created_at >= cutoff,
        )
    ) or 0
    if count >= maximum:
        retry_after = max(60, int(window.total_seconds()))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )


def record_rate_event(db: Session, *, scope: str, key_hash: str) -> None:
    prune_rate_events(db)
    db.add(RateLimitEvent(scope=scope, key_hash=key_hash))


def clear_rate_events(db: Session, *, scope: str, key_hash: str) -> None:
    db.execute(
        delete(RateLimitEvent).where(
            RateLimitEvent.scope == scope,
            RateLimitEvent.key_hash == key_hash,
        )
    )


def prune_rate_events(db: Session, *, older_than: timedelta = timedelta(days=2)) -> None:
    db.execute(
        delete(RateLimitEvent).where(
            RateLimitEvent.created_at < datetime.now(UTC) - older_than
        )
    )
