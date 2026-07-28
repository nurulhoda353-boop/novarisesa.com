import secrets
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models import (
    ContactSubmission,
    MediaAsset,
    NavigationItem,
    NewsletterSubscriber,
    Page,
    Post,
    Project,
    PublishStatus,
    Requirement,
    RequirementApplication,
    RequirementContact,
    RequirementStatus,
    RFQSubmission,
    Service,
    SiteSetting,
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


def enum_value(value: object) -> str:
    return value.value if hasattr(value, "value") else str(value)


def translation_for(item: object, locale: str) -> object | None:
    translations = list(getattr(item, "translations", []))
    return next(
        (translation for translation in translations if translation.locale == locale),
        translations[0] if translations else None,
    )


def serialize_public_item(
    item: object,
    locale: str,
    *,
    contacts: list[dict[str, object]] | None = None,
    media_urls: dict[object, str] | None = None,
) -> dict[str, object]:
    translation = translation_for(item, locale)
    identifier = getattr(item, "slug", None) or getattr(item, "code", None)
    title = (
        getattr(translation, "title", None)
        or getattr(translation, "position", None)
        or identifier
    )
    summary = None
    for key in ("summary", "excerpt", "tagline", "description", "lead"):
        value = getattr(translation, key, None) if translation else None
        if value:
            summary = value
            break
    return {
        "id": str(item.id),
        "slug": identifier,
        "title": title,
        "summary": summary,
        "status": enum_value(item.status),
        "is_featured": bool(getattr(item, "is_featured", False)),
        "sort_order": getattr(item, "sort_order", 0),
        "updated_at": item.updated_at.isoformat(),
        "data": {
            "content": getattr(translation, "content", None) if translation else None,
            "body": getattr(translation, "body", None) if translation else None,
            "intro": getattr(translation, "intro", None) if translation else None,
            "lead": getattr(translation, "lead", None) if translation else None,
            "eyebrow": getattr(translation, "eyebrow", None) if translation else None,
            "sub_services": getattr(translation, "sub_services", None) if translation else None,
            "faqs": getattr(translation, "faqs", None) if translation else None,
            "approval": getattr(translation, "approval", None) if translation else None,
            "duration": getattr(translation, "duration", None) if translation else None,
            "salary_cycle": getattr(translation, "salary_cycle", None) if translation else None,
            "food": getattr(translation, "food", None) if translation else None,
            "accommodation": getattr(translation, "accommodation", None) if translation else None,
            "documents": getattr(translation, "documents", None) if translation else None,
            "stats": getattr(item, "stats", None),
            "capabilities": getattr(item, "capabilities", None),
            "process": getattr(item, "process", None),
            "certifications": getattr(item, "certifications", None),
            "facts": getattr(item, "facts", None),
            "client_name": getattr(item, "client_name", None),
            "location": getattr(item, "location", None),
            "headcount": getattr(item, "headcount", None),
            "project_name": getattr(item, "project_name", None),
            "rate_amount": str(getattr(item, "rate_amount", "") or ""),
            "rate_currency": getattr(item, "rate_currency", None),
            "rate_unit": getattr(item, "rate_unit", None),
            "contacts": contacts,
            "number": getattr(item, "number", None),
            "icon": getattr(item, "icon", None),
            "started_on": (
                item.started_on.isoformat() if getattr(item, "started_on", None) else None
            ),
            "completed_on": (
                item.completed_on.isoformat()
                if getattr(item, "completed_on", None)
                else None
            ),
            "published_at": (
                item.published_at.isoformat()
                if getattr(item, "published_at", None)
                else None
            ),
            "meta_title": getattr(translation, "meta_title", None) if translation else None,
            "meta_description": (
                getattr(translation, "meta_description", None) if translation else None
            ),
            "hero_media_url": (
                (media_urls or {}).get(getattr(item, "hero_media_id", None))
            ),
            "featured_media_url": (
                (media_urls or {}).get(getattr(item, "featured_media_id", None))
            ),
        },
    }


@router.get("/site-content")
def site_content(
    db: DBSession,
    locale: Annotated[str, Query(pattern="^(en|ar)$")] = "en",
) -> dict[str, object]:
    settings: dict[str, dict[str, object]] = {}
    for item in db.scalars(select(SiteSetting).where(SiteSetting.is_public.is_(True))):
        settings.setdefault(item.group_name, {})[item.key] = item.value

    collections = {
        "pages": list(db.scalars(
            select(Page)
            .options(selectinload(Page.translations))
            .where(Page.status == PublishStatus.PUBLISHED)
            .order_by(Page.updated_at.desc())
        )),
        "services": list(db.scalars(
            select(Service)
            .options(selectinload(Service.translations))
            .where(Service.status == PublishStatus.PUBLISHED)
            .order_by(Service.sort_order, Service.updated_at.desc())
        )),
        "projects": list(db.scalars(
            select(Project)
            .options(selectinload(Project.translations))
            .where(Project.status == PublishStatus.PUBLISHED)
            .order_by(Project.sort_order, Project.updated_at.desc())
        )),
        "posts": list(db.scalars(
            select(Post)
            .options(selectinload(Post.translations))
            .where(Post.status == PublishStatus.PUBLISHED)
            .order_by(Post.published_at.desc().nullslast(), Post.updated_at.desc())
        )),
        "requirements": list(db.scalars(
            select(Requirement)
            .options(selectinload(Requirement.translations))
            .where(Requirement.status.in_([RequirementStatus.ACTIVE, RequirementStatus.URGENT]))
            .order_by(Requirement.updated_at.desc())
        )),
    }
    requirement_rows = list(collections["requirements"])
    contact_rows = db.scalars(
        select(RequirementContact)
        .where(RequirementContact.requirement_id.in_([item.id for item in requirement_rows]))
        .order_by(RequirementContact.sort_order)
    ) if requirement_rows else []
    contacts_by_requirement: dict[object, list[dict[str, object]]] = {}
    for contact in contact_rows:
        contacts_by_requirement.setdefault(contact.requirement_id, []).append(
            {
                "display": contact.display_phone,
                "raw": contact.phone_e164,
                "whatsapp": contact.has_whatsapp,
            }
        )

    media_ids = {
        media_id
        for rows in collections.values()
        for item in rows
        for media_id in (
            getattr(item, "hero_media_id", None),
            getattr(item, "featured_media_id", None),
        )
        if media_id is not None
    }
    media_urls = {
        item.id: item.public_url
        for item in (
            db.scalars(select(MediaAsset).where(MediaAsset.id.in_(media_ids)))
            if media_ids
            else []
        )
    }

    navigation = [
        {
            "id": str(item.id),
            "location": item.location,
            "parent_id": str(item.parent_id) if item.parent_id else None,
            "label": (item.label or {}).get(locale)
            or (item.label or {}).get("en")
            or "",
            "labels": item.label or {},
            "url": item.url,
            "sort_order": item.sort_order,
        }
        for item in db.scalars(
            select(NavigationItem)
            .where(NavigationItem.is_visible.is_(True))
            .order_by(NavigationItem.location, NavigationItem.sort_order)
        )
    ]

    return {
        "locale": locale,
        "settings": settings,
        "navigation": navigation,
        "collections": {
            key: [
                serialize_public_item(
                    item,
                    locale,
                    contacts=contacts_by_requirement.get(item.id) if key == "requirements" else None,
                    media_urls=media_urls,
                )
                for item in (requirement_rows if key == "requirements" else rows)
            ]
            for key, rows in collections.items()
        },
    }


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
