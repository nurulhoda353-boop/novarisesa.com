import uuid
from datetime import UTC, datetime
from typing import Annotated, Any, Literal

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.auth import require_permission
from app.core.database import get_db
from app.core.security import hash_password
from app.core.storage import delete_stored_file, save_upload
from app.models import (
    AuditLog,
    Category,
    ContactSubmission,
    Event,
    EventTranslation,
    MediaAsset,
    NavigationItem,
    NewsletterSubscriber,
    Page,
    PageTranslation,
    Post,
    PostTranslation,
    Project,
    ProjectTranslation,
    PublishStatus,
    Requirement,
    RequirementApplication,
    RequirementContact,
    RequirementStatus,
    RequirementTranslation,
    RFQSubmission,
    Role,
    Service,
    ServiceTranslation,
    SiteSetting,
    SubmissionStatus,
    Tag,
    User,
)
from app.schemas.cms import (
    ContentDetail,
    ContentItem,
    ContentListResponse,
    ContentUpsert,
    MediaUpdate,
    NavigationUpsert,
    SettingUpsert,
    SubmissionStatusUpdate,
    TaxonomyUpsert,
    UserCreate,
    UserUpdate,
)

router = APIRouter(prefix="/cms")
DBSession = Annotated[Session, Depends(get_db)]
ResourceName = Literal["pages", "services", "projects", "posts", "requirements", "events"]
InboxName = Literal["contact", "rfq", "applications"]

RESOURCE_CONFIG: dict[str, dict[str, Any]] = {
    "pages": {
        "model": Page,
        "translation": PageTranslation,
        "foreign_key": "page_id",
        "title_key": "title",
    },
    "services": {
        "model": Service,
        "translation": ServiceTranslation,
        "foreign_key": "service_id",
        "title_key": "title",
    },
    "projects": {
        "model": Project,
        "translation": ProjectTranslation,
        "foreign_key": "project_id",
        "title_key": "title",
    },
    "posts": {
        "model": Post,
        "translation": PostTranslation,
        "foreign_key": "post_id",
        "title_key": "title",
    },
    "requirements": {
        "model": Requirement,
        "translation": RequirementTranslation,
        "foreign_key": "requirement_id",
        "title_key": "position",
    },
    "events": {
        "model": Event,
        "translation": EventTranslation,
        "foreign_key": "event_id",
        "title_key": "title",
    },
}

INBOX_CONFIG = {
    "contact": ContactSubmission,
    "rfq": RFQSubmission,
    "applications": RequirementApplication,
}


def audit(
    db: Session,
    request: Request,
    actor: User,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | None,
    *,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_id=actor.id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before=before,
            after=after,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    )


def enum_value(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)


def translation_for(item: Any, locale: str) -> Any | None:
    translations = list(getattr(item, "translations", []))
    return next(
        (translation for translation in translations if translation.locale == locale),
        translations[0] if translations else None,
    )


def serialize_content(
    resource: str, item: Any, locale: str, media_urls: dict[str, str] | None = None
) -> ContentItem:
    media_urls = media_urls or {}
    translation = translation_for(item, locale)
    title_key = RESOURCE_CONFIG[resource]["title_key"]
    title = getattr(translation, title_key, None) or getattr(item, "slug", None) or item.code
    summary = None
    for key in ("summary", "excerpt", "tagline", "description"):
        value = getattr(translation, key, None) if translation else None
        if value:
            summary = value
            break
    identifier = getattr(item, "slug", None) or item.code
    hero_media_id = getattr(item, "hero_media_id", None)
    featured_media_id = getattr(item, "featured_media_id", None)
    thumbnail_media_id = hero_media_id or featured_media_id
    extra: dict[str, Any] = {
        "location": getattr(item, "location", None),
        "headcount": getattr(item, "headcount", None),
        "project_name": getattr(item, "project_name", None),
        "client_name": getattr(item, "client_name", None),
        "sort_order": getattr(item, "sort_order", 0),
        "number": getattr(item, "number", None),
        "icon": getattr(item, "icon", None),
        "hero_media_id": str(hero_media_id) if hero_media_id else None,
        "featured_media_id": str(featured_media_id) if featured_media_id else None,
        "thumbnail_url": media_urls.get(str(thumbnail_media_id)) if thumbnail_media_id else None,
    }
    if resource == "posts":
        extra["category_id"] = str(item.category_id) if item.category_id else None
        extra["tag_ids"] = [str(tag.id) for tag in getattr(item, "tags", [])]
    return ContentItem(
        id=item.id,
        resource=resource,
        slug=identifier,
        title=title,
        locale=translation.locale if translation else locale,
        status=enum_value(item.status),
        summary=summary,
        is_featured=bool(getattr(item, "is_featured", False)),
        updated_at=item.updated_at,
        extra=extra,
    )


def serialize_detail(resource: str, item: Any, locale: str) -> ContentDetail:
    base = serialize_content(resource, item, locale).model_dump()
    translation = translation_for(item, locale)
    body: dict[str, Any] = {}
    if translation is not None:
        body = (
            getattr(translation, "content", None)
            or getattr(translation, "body", None)
            or {}
        )
        if resource == "services":
            body = {
                "intro": getattr(translation, "intro", None),
                "lead": getattr(translation, "lead", None),
                "eyebrow": getattr(translation, "eyebrow", None),
                "sub_services": getattr(translation, "sub_services", []),
                "faqs": getattr(translation, "faqs", []),
                "stats": item.stats or [],
                "capabilities": item.capabilities or [],
                "process": item.process or [],
                "certifications": item.certifications or [],
                "number": item.number,
                "icon": item.icon,
                "hero_media_id": str(item.hero_media_id) if item.hero_media_id else None,
            }
        if resource == "projects":
            body = {
                **body,
                "facts": item.facts or {},
                "client_name": item.client_name,
                "location": item.location,
                "started_on": item.started_on.isoformat() if item.started_on else None,
                "completed_on": item.completed_on.isoformat() if item.completed_on else None,
                "featured_media_id": (
                    str(item.featured_media_id) if item.featured_media_id else None
                ),
            }
        if resource == "posts":
            body = {
                **body,
                "featured_media_id": (
                    str(item.featured_media_id) if item.featured_media_id else None
                ),
            }
        if resource == "events":
            body = {
                "location": getattr(translation, "location", None),
                "description": getattr(translation, "description", None),
                "date_display": getattr(translation, "date_display", None),
                "event_type": getattr(translation, "event_type", None),
                "starts_on": item.starts_on.isoformat() if item.starts_on else None,
                "ends_on": item.ends_on.isoformat() if item.ends_on else None,
                "featured_media_id": (
                    str(item.featured_media_id) if item.featured_media_id else None
                ),
            }
        if resource == "requirements":
            body = {
                "approval": getattr(translation, "approval", None),
                "duration": getattr(translation, "duration", None),
                "salary_cycle": getattr(translation, "salary_cycle", None),
                "food": getattr(translation, "food", None),
                "accommodation": getattr(translation, "accommodation", None),
                "documents": getattr(translation, "documents", []),
                "rate_amount": str(item.rate_amount) if item.rate_amount is not None else "",
                "rate_currency": item.rate_currency,
                "rate_unit": item.rate_unit,
                "opens_at": item.opens_at.isoformat() if item.opens_at else None,
                "closes_at": item.closes_at.isoformat() if item.closes_at else None,
                "contacts": [
                    {
                        "display": contact.display_phone,
                        "raw": contact.phone_e164,
                        "whatsapp": contact.has_whatsapp,
                    }
                    for contact in sorted(item.contacts, key=lambda value: value.sort_order)
                ],
            }
    return ContentDetail(
        **base,
        body=body or {},
        meta_title=getattr(translation, "meta_title", None) if translation else None,
        meta_description=getattr(translation, "meta_description", None) if translation else None,
    )


def translation_values(resource: str, payload: ContentUpsert) -> dict[str, Any]:
    common: dict[str, Any] = {"locale": payload.locale}
    if resource == "pages":
        return {
            **common,
            "title": payload.title,
            "content": payload.body,
            "meta_title": payload.meta_title,
            "meta_description": payload.meta_description,
        }
    if resource == "services":
        return {
            **common,
            "title": payload.title,
            "tagline": payload.summary,
            "eyebrow": payload.body.get("eyebrow"),
            "lead": payload.body.get("lead"),
            "intro": payload.body.get("intro"),
            "sub_services": payload.body.get("sub_services", []),
            "faqs": payload.body.get("faqs", []),
            "meta_title": payload.meta_title,
            "meta_description": payload.meta_description,
        }
    if resource == "projects":
        return {
            **common,
            "title": payload.title,
            "summary": payload.summary,
            "body": payload.body,
            "meta_title": payload.meta_title,
            "meta_description": payload.meta_description,
        }
    if resource == "posts":
        return {
            **common,
            "title": payload.title,
            "excerpt": payload.summary,
            "body": payload.body,
            "meta_title": payload.meta_title,
            "meta_description": payload.meta_description,
        }
    if resource == "events":
        return {
            **common,
            "title": payload.title,
            "location": payload.location,
            "description": payload.summary,
            "date_display": payload.body.get("date_display"),
            "event_type": payload.body.get("event_type"),
            "meta_title": payload.meta_title,
            "meta_description": payload.meta_description,
        }
    return {
        **common,
        "position": payload.title,
        "description": payload.summary,
        "documents": payload.body.get("documents", []),
        "approval": payload.body.get("approval"),
        "duration": payload.body.get("duration"),
        "salary_cycle": payload.body.get("salary_cycle"),
        "food": payload.body.get("food"),
        "accommodation": payload.body.get("accommodation"),
    }


def serialize_media(item: MediaAsset) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "storage_key": item.storage_key,
        "public_url": item.public_url,
        "file_name": item.file_name,
        "mime_type": item.mime_type,
        "size_bytes": item.size_bytes,
        "width": item.width,
        "height": item.height,
        "alt_text": item.alt_text or {},
        "folder": item.folder,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


def serialize_nav(item: NavigationItem) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "location": item.location,
        "parent_id": str(item.parent_id) if item.parent_id else None,
        "label": item.label or {},
        "url": item.url,
        "sort_order": item.sort_order,
        "is_visible": item.is_visible,
        "updated_at": item.updated_at.isoformat(),
    }


def serialize_taxonomy(kind: str, item: Category | Tag) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "kind": kind,
        "slug": item.slug,
        "name": item.name or {},
        "updated_at": item.updated_at.isoformat(),
    }


def apply_post_relations(db: Session, item: Post, payload: ContentUpsert) -> None:
    item.category_id = payload.category_id
    item.featured_media_id = payload.featured_media_id
    if payload.tag_ids:
        tags = list(db.scalars(select(Tag).where(Tag.id.in_(payload.tag_ids))))
        item.tags = tags
    elif payload.tag_ids == []:
        item.tags = []


def apply_resource_values(
    db: Session,
    resource: str,
    item: Any,
    payload: ContentUpsert,
) -> None:
    if resource == "services":
        item.number = payload.number
        item.icon = payload.icon
        item.hero_media_id = payload.hero_media_id
        item.stats = payload.stats
        item.capabilities = payload.capabilities
        item.process = payload.process
        item.certifications = payload.certifications
    elif resource == "projects":
        item.client_name = payload.client_name
        item.location = payload.location
        item.started_on = payload.started_on
        item.completed_on = payload.completed_on
        item.featured_media_id = payload.featured_media_id
        item.facts = payload.facts
    elif resource == "posts":
        apply_post_relations(db, item, payload)
    elif resource == "events":
        item.starts_on = payload.started_on
        item.ends_on = payload.completed_on
        item.featured_media_id = payload.featured_media_id
    elif resource == "requirements":
        item.rate_amount = payload.rate_amount
        item.rate_currency = payload.rate_currency.upper()
        item.rate_unit = payload.rate_unit
        item.opens_at = payload.opens_at
        item.closes_at = payload.closes_at
        item.contacts.clear()
        for index, contact in enumerate(payload.contacts):
            item.contacts.append(
                RequirementContact(
                    display_phone=contact.display,
                    phone_e164=contact.raw.lstrip("+"),
                    has_whatsapp=contact.whatsapp,
                    sort_order=index,
                )
            )


def assert_publish_allowed(user: User, status_value: str) -> None:
    from app.core.auth import user_has_permission

    if status_value == "published" and not user_has_permission(user, "cms.publish"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Publishing requires cms.publish permission",
        )


@router.get("/overview")
def overview(
    user: Annotated[User, Depends(require_permission("cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    counts = {
        "pages": db.scalar(select(func.count()).select_from(Page)) or 0,
        "services": db.scalar(select(func.count()).select_from(Service)) or 0,
        "projects": db.scalar(select(func.count()).select_from(Project)) or 0,
        "posts": db.scalar(select(func.count()).select_from(Post)) or 0,
        "requirements": db.scalar(select(func.count()).select_from(Requirement)) or 0,
        "media": db.scalar(select(func.count()).select_from(MediaAsset)) or 0,
        "navigation": db.scalar(select(func.count()).select_from(NavigationItem)) or 0,
        "categories": db.scalar(select(func.count()).select_from(Category)) or 0,
        "tags": db.scalar(select(func.count()).select_from(Tag)) or 0,
    }
    inbox = {
        "contact": db.scalar(
            select(func.count())
            .select_from(ContactSubmission)
            .where(ContactSubmission.status == SubmissionStatus.NEW)
        )
        or 0,
        "rfq": db.scalar(
            select(func.count())
            .select_from(RFQSubmission)
            .where(RFQSubmission.status == SubmissionStatus.NEW)
        )
        or 0,
        "applications": db.scalar(
            select(func.count())
            .select_from(RequirementApplication)
            .where(RequirementApplication.status == SubmissionStatus.NEW)
        )
        or 0,
        "newsletter": db.scalar(
            select(func.count())
            .select_from(NewsletterSubscriber)
            .where(NewsletterSubscriber.is_active.is_(True))
        )
        or 0,
    }
    activities = [
        {
            "id": str(log.id),
            "action": log.action,
            "entity_type": log.entity_type,
            "created_at": log.created_at.isoformat(),
        }
        for log in db.scalars(
            select(AuditLog).order_by(AuditLog.created_at.desc()).limit(8)
        )
    ]
    return {
        "counts": counts,
        "inbox": inbox,
        "activity": activities,
        "system": {"api": "healthy", "database": "connected"},
    }


@router.get("/search")
def search_workspace(
    user: Annotated[User, Depends(require_permission("cms.view"))],
    db: DBSession,
    q: Annotated[str, Query(min_length=1, max_length=100)],
    limit: Annotated[int, Query(ge=1, le=30)] = 12,
) -> dict[str, Any]:
    _ = user
    needle = f"%{q.strip()}%"
    results: list[dict[str, Any]] = []

    page_rows = db.scalars(
        select(Page)
        .join(PageTranslation)
        .where(or_(Page.slug.ilike(needle), PageTranslation.title.ilike(needle)))
        .limit(limit)
    )
    for item in page_rows:
        translation = translation_for(item, "en")
        results.append(
            {
                "type": "pages",
                "id": str(item.id),
                "title": getattr(translation, "title", None) or item.slug,
                "href": "/content/pages",
                "status": enum_value(item.status),
            }
        )

    for model, resource, title_attr in (
        (Service, "services", "title"),
        (Project, "projects", "title"),
        (Post, "posts", "title"),
    ):
        translation_model = RESOURCE_CONFIG[resource]["translation"]
        rows = db.scalars(
            select(model)
            .join(translation_model)
            .where(
                or_(
                    model.slug.ilike(needle),
                    getattr(translation_model, title_attr).ilike(needle),
                )
            )
            .limit(limit)
        )
        for item in rows:
            translation = translation_for(item, "en")
            results.append(
                {
                    "type": resource,
                    "id": str(item.id),
                    "title": getattr(translation, title_attr, None) or item.slug,
                    "href": f"/content/{resource}",
                    "status": enum_value(item.status),
                }
            )

    req_rows = db.scalars(
        select(Requirement)
        .join(RequirementTranslation)
        .where(
            or_(
                Requirement.code.ilike(needle),
                RequirementTranslation.position.ilike(needle),
            )
        )
        .limit(limit)
    )
    for item in req_rows:
        translation = translation_for(item, "en")
        results.append(
            {
                "type": "requirements",
                "id": str(item.id),
                "title": getattr(translation, "position", None) or item.code,
                "href": "/content/requirements",
                "status": enum_value(item.status),
            }
        )

    media_rows = db.scalars(
        select(MediaAsset)
        .where(or_(MediaAsset.file_name.ilike(needle), MediaAsset.folder.ilike(needle)))
        .limit(limit)
    )
    for item in media_rows:
        results.append(
            {
                "type": "media",
                "id": str(item.id),
                "title": item.file_name,
                "href": "/media",
                "status": item.mime_type,
            }
        )

    return {"items": results[:limit], "total": len(results[:limit]), "query": q}


@router.get("/content/{resource}", response_model=ContentListResponse)
def list_content(
    resource: ResourceName,
    user: Annotated[User, Depends(require_permission("cms.view"))],
    db: DBSession,
    locale: Annotated[str, Query(pattern="^(en|ar)$")] = "en",
    search: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> ContentListResponse:
    _ = user
    config = RESOURCE_CONFIG[resource]
    model = config["model"]
    options = [selectinload(model.translations)]
    if resource == "posts":
        options.append(selectinload(Post.tags))
    if resource == "requirements":
        options.append(selectinload(Requirement.contacts))
    statement = select(model).options(*options).order_by(model.updated_at.desc()).limit(limit)
    items = list(db.scalars(statement))
    media_ids = {
        str(media_id)
        for item in items
        for media_id in (getattr(item, "hero_media_id", None), getattr(item, "featured_media_id", None))
        if media_id
    }
    media_urls: dict[str, str] = {}
    if media_ids:
        rows = db.execute(
            select(MediaAsset.id, MediaAsset.public_url).where(MediaAsset.id.in_(media_ids))
        ).all()
        media_urls = {str(media_id): url for media_id, url in rows}
    serialized = [serialize_content(resource, item, locale, media_urls) for item in items]
    if search:
        needle = search.casefold()
        serialized = [
            item
            for item in serialized
            if needle in item.title.casefold() or needle in item.slug.casefold()
        ]
    return ContentListResponse(items=serialized, total=len(serialized))


@router.get("/content/{resource}/{item_id}", response_model=ContentDetail)
def get_content(
    resource: ResourceName,
    item_id: uuid.UUID,
    user: Annotated[User, Depends(require_permission("cms.view"))],
    db: DBSession,
    locale: Annotated[str, Query(pattern="^(en|ar)$")] = "en",
) -> ContentDetail:
    _ = user
    config = RESOURCE_CONFIG[resource]
    model = config["model"]
    options = [selectinload(model.translations)]
    if resource == "posts":
        options.append(selectinload(Post.tags))
    if resource == "requirements":
        options.append(selectinload(Requirement.contacts))
    item = db.scalar(select(model).options(*options).where(model.id == item_id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    return serialize_detail(resource, item, locale)


@router.post(
    "/content/{resource}",
    response_model=ContentItem,
    status_code=status.HTTP_201_CREATED,
)
def create_content(
    resource: ResourceName,
    payload: ContentUpsert,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> ContentItem:
    assert_publish_allowed(user, payload.status)
    config = RESOURCE_CONFIG[resource]
    model = config["model"]
    translation_model = config["translation"]

    if resource == "requirements":
        identifier = payload.code or payload.slug
        if not identifier or not payload.headcount:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Requirements need code and headcount",
            )
        item = model(
            code=identifier,
            headcount=payload.headcount,
            status=RequirementStatus(payload.status),
            location=payload.location,
            project_name=payload.project_name,
        )
    else:
        if not payload.slug:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Slug is required",
            )
        model_values: dict[str, Any] = {
            "slug": payload.slug,
            "status": PublishStatus(payload.status),
        }
        if hasattr(model, "is_featured"):
            model_values["is_featured"] = payload.is_featured
        if hasattr(model, "sort_order"):
            model_values["sort_order"] = payload.sort_order
        if resource == "posts" and payload.status == "published":
            model_values["published_at"] = datetime.now(UTC)
        item = model(**model_values)

    db.add(item)
    db.flush()
    apply_resource_values(db, resource, item, payload)
    translation = translation_model(
        **{
            config["foreign_key"]: item.id,
            **translation_values(resource, payload),
        }
    )
    db.add(translation)
    audit(
        db,
        request,
        user,
        "cms.created",
        resource,
        item.id,
        after={"title": payload.title, "status": payload.status},
    )
    db.commit()
    options = [selectinload(model.translations)]
    if resource == "posts":
        options.append(selectinload(Post.tags))
    if resource == "requirements":
        options.append(selectinload(Requirement.contacts))
    item = db.scalar(select(model).options(*options).where(model.id == item.id))
    return serialize_content(resource, item, payload.locale)


@router.patch("/content/{resource}/{item_id}", response_model=ContentItem)
def update_content(
    resource: ResourceName,
    item_id: uuid.UUID,
    payload: ContentUpsert,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> ContentItem:
    assert_publish_allowed(user, payload.status)
    config = RESOURCE_CONFIG[resource]
    model = config["model"]
    options = [selectinload(model.translations)]
    if resource == "posts":
        options.append(selectinload(Post.tags))
    item = db.scalar(select(model).options(*options).where(model.id == item_id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    before = serialize_content(resource, item, payload.locale).model_dump(mode="json")
    if resource == "requirements":
        item.code = payload.code or payload.slug or item.code
        item.headcount = payload.headcount or item.headcount
        item.status = RequirementStatus(payload.status)
        item.location = payload.location
        item.project_name = payload.project_name
    else:
        item.slug = payload.slug or item.slug
        item.status = PublishStatus(payload.status)
        if hasattr(item, "is_featured"):
            item.is_featured = payload.is_featured
        if hasattr(item, "sort_order"):
            item.sort_order = payload.sort_order
        if resource == "posts" and payload.status == "published" and not item.published_at:
            item.published_at = datetime.now(UTC)
    apply_resource_values(db, resource, item, payload)

    translation = next(
        (value for value in item.translations if value.locale == payload.locale),
        None,
    )
    values = translation_values(resource, payload)
    if translation is None:
        translation = config["translation"](
            **{config["foreign_key"]: item.id, **values}
        )
        db.add(translation)
    else:
        for key, value in values.items():
            setattr(translation, key, value)

    audit(
        db,
        request,
        user,
        "cms.updated",
        resource,
        item.id,
        before=before,
        after={"title": payload.title, "status": payload.status},
    )
    db.commit()
    db.refresh(item)
    return serialize_content(resource, item, payload.locale)


@router.delete(
    "/content/{resource}/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def archive_content(
    resource: ResourceName,
    item_id: uuid.UUID,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> None:
    model = RESOURCE_CONFIG[resource]["model"]
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    item.status = (
        RequirementStatus.CLOSED
        if resource == "requirements"
        else PublishStatus.ARCHIVED
    )
    audit(db, request, user, "cms.archived", resource, item.id)
    db.commit()


@router.get("/inbox/{inbox}")
def list_inbox(
    inbox: InboxName,
    user: Annotated[User, Depends(require_permission("cms.manage_inbox", "cms.view"))],
    db: DBSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict[str, Any]:
    _ = user
    model = INBOX_CONFIG[inbox]
    rows = list(db.scalars(select(model).order_by(model.created_at.desc()).limit(limit)))
    items = []
    for row in rows:
        items.append(
            {
                "id": str(row.id),
                "name": row.name,
                "email": row.email,
                "company": getattr(row, "company", None),
                "phone": getattr(row, "phone", None),
                "status": enum_value(row.status),
                "summary": getattr(row, "subject", None)
                or getattr(row, "service", None)
                or getattr(row, "message", None),
                "created_at": row.created_at.isoformat(),
            }
        )
    return {"items": items, "total": len(items)}


@router.patch("/inbox/{inbox}/{item_id}")
def update_inbox_status(
    inbox: InboxName,
    item_id: uuid.UUID,
    payload: SubmissionStatusUpdate,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_inbox"))],
    db: DBSession,
) -> dict[str, str]:
    model = INBOX_CONFIG[inbox]
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    item.status = SubmissionStatus(payload.status)
    if hasattr(item, "internal_notes"):
        item.internal_notes = payload.internal_notes
    audit(db, request, user, "cms.inbox_updated", inbox, item.id)
    db.commit()
    return {"status": payload.status}


@router.get("/settings")
def list_settings(
    user: Annotated[User, Depends(require_permission("cms.manage_settings", "cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    items = [
        {
            "id": str(item.id),
            "group_name": item.group_name,
            "key": item.key,
            "value": item.value,
            "is_public": item.is_public,
        }
        for item in db.scalars(
            select(SiteSetting).order_by(SiteSetting.group_name, SiteSetting.key)
        )
    ]
    return {"items": items}


@router.put("/settings")
def upsert_setting(
    payload: SettingUpsert,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_settings"))],
    db: DBSession,
) -> dict[str, Any]:
    item = db.scalar(
        select(SiteSetting).where(
            SiteSetting.group_name == payload.group_name,
            SiteSetting.key == payload.key,
        )
    )
    if item is None:
        item = SiteSetting(
            group_name=payload.group_name,
            key=payload.key,
            value=payload.value,
            is_public=payload.is_public,
        )
        db.add(item)
        db.flush()
    else:
        item.value = payload.value
        item.is_public = payload.is_public
    audit(db, request, user, "cms.setting_updated", "site_settings", item.id)
    db.commit()
    return {"id": str(item.id), "status": "saved"}


@router.get("/media")
def list_media(
    user: Annotated[User, Depends(require_permission("cms.manage_media", "cms.view"))],
    db: DBSession,
    folder: Annotated[str | None, Query(max_length=255)] = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> dict[str, Any]:
    _ = user
    statement = select(MediaAsset).order_by(MediaAsset.created_at.desc()).limit(limit)
    if folder:
        statement = statement.where(MediaAsset.folder == folder)
    if search:
        statement = statement.where(MediaAsset.file_name.ilike(f"%{search}%"))
    items = [serialize_media(item) for item in db.scalars(statement)]
    return {"items": items, "total": len(items)}


@router.post("/media", status_code=status.HTTP_201_CREATED)
async def upload_media(
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_media"))],
    db: DBSession,
    file: Annotated[UploadFile, File()],
    folder: Annotated[str | None, Form()] = "uploads",
    alt_en: Annotated[str | None, Form()] = None,
    alt_ar: Annotated[str | None, Form()] = None,
) -> dict[str, Any]:
    storage_key, public_url, mime, size_bytes = await save_upload(file, folder=folder)
    alt_text = {key: value for key, value in {"en": alt_en, "ar": alt_ar}.items() if value}
    item = MediaAsset(
        storage_key=storage_key,
        public_url=public_url,
        file_name=file.filename or "file",
        mime_type=mime,
        size_bytes=size_bytes,
        alt_text=alt_text,
        folder=folder or "uploads",
        uploaded_by_id=user.id,
    )
    db.add(item)
    db.flush()
    audit(
        db,
        request,
        user,
        "cms.media_uploaded",
        "media",
        item.id,
        after={"file_name": item.file_name, "folder": item.folder},
    )
    db.commit()
    db.refresh(item)
    return serialize_media(item)


@router.patch("/media/{item_id}")
def update_media(
    item_id: uuid.UUID,
    payload: MediaUpdate,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_media"))],
    db: DBSession,
) -> dict[str, Any]:
    item = db.get(MediaAsset, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
    before = serialize_media(item)
    item.alt_text = payload.alt_text
    if payload.folder is not None:
        item.folder = payload.folder
    audit(
        db,
        request,
        user,
        "cms.media_updated",
        "media",
        item.id,
        before=before,
        after=serialize_media(item),
    )
    db.commit()
    db.refresh(item)
    return serialize_media(item)


@router.delete("/media/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(
    item_id: uuid.UUID,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_media"))],
    db: DBSession,
) -> None:
    item = db.get(MediaAsset, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
    storage_key = item.storage_key
    audit(db, request, user, "cms.media_deleted", "media", item.id, before=serialize_media(item))
    db.delete(item)
    db.commit()
    delete_stored_file(storage_key)


@router.get("/navigation")
def list_navigation(
    user: Annotated[User, Depends(require_permission("cms.view"))],
    db: DBSession,
    location: Annotated[str | None, Query(max_length=40)] = None,
) -> dict[str, Any]:
    _ = user
    statement = select(NavigationItem).order_by(NavigationItem.sort_order, NavigationItem.created_at)
    if location:
        statement = statement.where(NavigationItem.location == location)
    items = [serialize_nav(item) for item in db.scalars(statement)]
    return {"items": items, "total": len(items)}


@router.post("/navigation", status_code=status.HTTP_201_CREATED)
def create_navigation(
    payload: NavigationUpsert,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> dict[str, Any]:
    label = {"en": payload.label_en}
    if payload.label_ar:
        label["ar"] = payload.label_ar
    item = NavigationItem(
        location=payload.location,
        parent_id=payload.parent_id,
        label=label,
        url=payload.url,
        sort_order=payload.sort_order,
        is_visible=payload.is_visible,
    )
    db.add(item)
    db.flush()
    audit(db, request, user, "cms.nav_created", "navigation", item.id, after=serialize_nav(item))
    db.commit()
    db.refresh(item)
    return serialize_nav(item)


@router.patch("/navigation/{item_id}")
def update_navigation(
    item_id: uuid.UUID,
    payload: NavigationUpsert,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> dict[str, Any]:
    item = db.get(NavigationItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Navigation item not found")
    before = serialize_nav(item)
    item.location = payload.location
    item.parent_id = payload.parent_id
    label = {"en": payload.label_en}
    if payload.label_ar:
        label["ar"] = payload.label_ar
    item.label = label
    item.url = payload.url
    item.sort_order = payload.sort_order
    item.is_visible = payload.is_visible
    audit(
        db,
        request,
        user,
        "cms.nav_updated",
        "navigation",
        item.id,
        before=before,
        after=serialize_nav(item),
    )
    db.commit()
    db.refresh(item)
    return serialize_nav(item)


@router.delete("/navigation/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_navigation(
    item_id: uuid.UUID,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> None:
    item = db.get(NavigationItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Navigation item not found")
    audit(db, request, user, "cms.nav_deleted", "navigation", item.id, before=serialize_nav(item))
    db.delete(item)
    db.commit()


@router.get("/taxonomy/{kind}")
def list_taxonomy(
    kind: Literal["categories", "tags"],
    user: Annotated[User, Depends(require_permission("cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    model = Category if kind == "categories" else Tag
    items = [
        serialize_taxonomy(kind, item)
        for item in db.scalars(select(model).order_by(model.slug))
    ]
    return {"items": items, "total": len(items)}


@router.post("/taxonomy/{kind}", status_code=status.HTTP_201_CREATED)
def create_taxonomy(
    kind: Literal["categories", "tags"],
    payload: TaxonomyUpsert,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> dict[str, Any]:
    model = Category if kind == "categories" else Tag
    existing = db.scalar(select(model).where(model.slug == payload.slug))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")
    name = {"en": payload.name_en}
    if payload.name_ar:
        name["ar"] = payload.name_ar
    item = model(slug=payload.slug, name=name)
    db.add(item)
    db.flush()
    audit(
        db,
        request,
        user,
        "cms.taxonomy_created",
        kind,
        item.id,
        after=serialize_taxonomy(kind, item),
    )
    db.commit()
    db.refresh(item)
    return serialize_taxonomy(kind, item)


@router.patch("/taxonomy/{kind}/{item_id}")
def update_taxonomy(
    kind: Literal["categories", "tags"],
    item_id: uuid.UUID,
    payload: TaxonomyUpsert,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> dict[str, Any]:
    model = Category if kind == "categories" else Tag
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    before = serialize_taxonomy(kind, item)
    conflict = db.scalar(
        select(model).where(model.slug == payload.slug, model.id != item_id)
    )
    if conflict is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")
    item.slug = payload.slug
    name = {"en": payload.name_en}
    if payload.name_ar:
        name["ar"] = payload.name_ar
    item.name = name
    audit(
        db,
        request,
        user,
        "cms.taxonomy_updated",
        kind,
        item.id,
        before=before,
        after=serialize_taxonomy(kind, item),
    )
    db.commit()
    db.refresh(item)
    return serialize_taxonomy(kind, item)


@router.delete("/taxonomy/{kind}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_taxonomy(
    kind: Literal["categories", "tags"],
    item_id: uuid.UUID,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> None:
    model = Category if kind == "categories" else Tag
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    audit(
        db,
        request,
        user,
        "cms.taxonomy_deleted",
        kind,
        item.id,
        before=serialize_taxonomy(kind, item),
    )
    db.delete(item)
    db.commit()


@router.get("/roles")
def list_roles(
    user: Annotated[User, Depends(require_permission("cms.manage_users", "cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    items = [
        {
            "id": str(role.id),
            "name": role.name,
            "description": role.description,
            "permissions": [permission.code for permission in role.permissions],
        }
        for role in db.scalars(
            select(Role).options(selectinload(Role.permissions)).order_by(Role.name)
        )
    ]
    return {"items": items}


@router.get("/users")
def list_users(
    user: Annotated[User, Depends(require_permission("cms.manage_users", "cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    users = list(
        db.scalars(
            select(User).options(selectinload(User.roles)).order_by(User.created_at)
        )
    )
    return {
        "items": [
            {
                "id": str(item.id),
                "email": item.email,
                "full_name": item.full_name,
                "roles": [role.name for role in item.roles],
                "is_active": item.is_active,
                "last_login_at": item.last_login_at.isoformat()
                if item.last_login_at
                else None,
            }
            for item in users
            if item.deleted_at is None
        ]
    }


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_users"))],
    db: DBSession,
) -> dict[str, Any]:
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing is not None and existing.deleted_at is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    role = db.scalar(select(Role).where(Role.name == payload.role))
    if role is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown role")

    item = existing or User(email=payload.email.lower())
    item.password_hash = hash_password(payload.password)
    item.full_name = payload.full_name
    item.is_active = payload.is_active
    item.is_verified = True
    item.deleted_at = None
    item.roles = [role]
    db.add(item)
    db.flush()
    audit(
        db,
        request,
        user,
        "cms.user_created",
        "users",
        item.id,
        after={"email": item.email, "role": role.name},
    )
    db.commit()
    return {
        "id": str(item.id),
        "email": item.email,
        "full_name": item.full_name,
        "roles": [role.name],
        "is_active": item.is_active,
        "last_login_at": None,
    }


@router.patch("/users/{item_id}")
def update_user(
    item_id: uuid.UUID,
    payload: UserUpdate,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_users"))],
    db: DBSession,
) -> dict[str, Any]:
    item = db.scalar(
        select(User).options(selectinload(User.roles)).where(User.id == item_id)
    )
    if item is None or item.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    before = {
        "full_name": item.full_name,
        "roles": [role.name for role in item.roles],
        "is_active": item.is_active,
    }
    if payload.full_name is not None:
        item.full_name = payload.full_name
    if payload.is_active is not None:
        if item.id == user.id and payload.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own account",
            )
        item.is_active = payload.is_active
    if payload.role is not None:
        role = db.scalar(select(Role).where(Role.name == payload.role))
        if role is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unknown role",
            )
        item.roles = [role]
    if payload.password:
        item.password_hash = hash_password(payload.password)

    after = {
        "full_name": item.full_name,
        "roles": [role.name for role in item.roles],
        "is_active": item.is_active,
    }
    audit(db, request, user, "cms.user_updated", "users", item.id, before=before, after=after)
    db.commit()
    return {
        "id": str(item.id),
        "email": item.email,
        "full_name": item.full_name,
        "roles": [role.name for role in item.roles],
        "is_active": item.is_active,
        "last_login_at": item.last_login_at.isoformat() if item.last_login_at else None,
    }
