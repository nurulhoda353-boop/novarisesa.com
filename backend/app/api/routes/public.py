import secrets
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import (
    ContactSubmission,
    NewsletterSubscriber,
    Requirement,
    RequirementApplication,
    RFQSubmission,
)
from app.schemas.public import (
    ContactCreate,
    NewsletterCreate,
    RequirementApplicationCreate,
    RFQCreate,
)

router = APIRouter(prefix="/public")
DBSession = Annotated[Session, Depends(get_db)]


def client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("cf-connecting-ip") or request.headers.get(
        "x-forwarded-for"
    )
    return (forwarded.split(",", 1)[0].strip() if forwarded else None) or (
        request.client.host if request.client else None
    )


@router.post("/contact", status_code=status.HTTP_201_CREATED)
def submit_contact(
    payload: ContactCreate, request: Request, db: DBSession
) -> dict[str, str]:
    item = ContactSubmission(
        **payload.model_dump(exclude={"website"}),
        source="website",
        ip_address=client_ip(request),
    )
    db.add(item)
    db.commit()
    return {"id": str(item.id), "status": "received"}


@router.post("/rfq", status_code=status.HTTP_201_CREATED)
def submit_rfq(payload: RFQCreate, db: DBSession) -> dict[str, str]:
    reference = (
        f"RFQ-{datetime.now(UTC):%Y%m%d}-{secrets.token_hex(3).upper()}"
    )
    values = payload.model_dump(exclude={"website", "locale"})
    item = RFQSubmission(reference=reference, **values)
    db.add(item)
    db.commit()
    return {"id": str(item.id), "reference": reference, "status": "received"}


@router.post("/newsletter", status_code=status.HTTP_201_CREATED)
def subscribe(
    payload: NewsletterCreate, request: Request, db: DBSession
) -> dict[str, str]:
    normalized = str(payload.email).lower()
    item = db.scalar(
        select(NewsletterSubscriber).where(
            NewsletterSubscriber.email == normalized
        )
    )
    if item is None:
        item = NewsletterSubscriber(
            email=normalized,
            locale=payload.locale,
            consent_ip=client_ip(request),
        )
        db.add(item)
    else:
        item.is_active = True
        item.unsubscribed_at = None
        item.locale = payload.locale
    db.commit()
    return {"status": "subscribed"}


@router.post(
    "/requirements/{code}/apply", status_code=status.HTTP_201_CREATED
)
def apply_for_requirement(
    code: str, payload: RequirementApplicationCreate, db: DBSession
) -> dict[str, str]:
    requirement = db.scalar(
        select(Requirement).where(Requirement.code == code)
    )
    if requirement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found",
        )
    experience_digits = "".join(character for character in payload.experience if character.isdigit())
    item = RequirementApplication(
        requirement_id=requirement.id,
        name=payload.name,
        email=str(payload.email).lower() if payload.email else None,
        phone=payload.phone,
        iqama_number=payload.iqama_number,
        years_experience=int(experience_digits[:2]) if experience_digits else None,
        message=payload.message,
    )
    db.add(item)
    db.commit()
    return {"id": str(item.id), "status": "received"}
