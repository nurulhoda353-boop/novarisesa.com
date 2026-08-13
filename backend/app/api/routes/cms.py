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
from sqlalchemy import func, or_, select, update
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
    EventDraft,
    EventTranslation,
    FaqItem,
    FaqItemTranslation,
    MediaAsset,
    NavigationItem,
    NewsletterSubscriber,
    Page,
    PageTranslation,
    Post,
    PostDraft,
    PostTranslation,
    Project,
    ProjectDraft,
    ProjectTranslation,
    Requirement,
    RequirementApplication,
    RequirementTranslation,
    RFQSubmission,
    Role,
    Service,
    ServiceDraft,
    ServiceTranslation,
    SiteSetting,
    SubmissionStatus,
    Tag,
    User,
)
from app.schemas.cms import (
    ContentItem,
    ContentListResponse,
    MediaUpdate,
    NavigationUpsert,
    ProjectCreateRequest,
    ProjectEditorPayload,
    PostCreateRequest,
    PostEditorPayload,
    EventCreateRequest,
    EventEditorPayload,
    ServiceEditorPayload,
    SettingUpsert,
    SubmissionStatusUpdate,
    TaxonomyUpsert,
    UserCreate,
    UserUpdate,
)

router = APIRouter(prefix="/cms")
DBSession = Annotated[Session, Depends(get_db)]
ResourceName = Literal["pages", "services", "projects", "posts", "requirements", "events", "faq"]
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
    "faq": {
        "model": FaqItem,
        "translation": FaqItemTranslation,
        "foreign_key": "faq_item_id",
        "title_key": "question",
    },
}

# The six launch articles and six launch events already use these public-site
# assets.  They remain the visible current image until an editor replaces one
# through the media library, at which point featured_media_id takes priority.
DEFAULT_CONTENT_IMAGES = {
    "posts": {
        "novarise-vision-2030-megaprojects": "/assets/news-energy.jpg",
        "zero-harm-culture-aramco-sites": "/assets/news-safety.jpg",
        "case-study-jubail-power-substation": "/assets/project-power.jpg",
        "heavy-equipment-rental-trends-2026": "/assets/project-equipment.jpg",
        "certified-manpower-mobilization-72-hours": "/assets/manpower.jpg",
        "civil-construction-mega-foundations": "/assets/project-civil.jpg",
    },
    "events": {
        "aramco-iktva-forum-2026": "/assets/vision-skyline.jpg",
        "future-projects-and-industrial-delivery-forum": "/assets/hero-industrial.jpg",
        "zero-harm-leadership-masterclass": "/assets/hse-safety.jpg",
        "vision-2030-industrial-localization-webinar": "/assets/news-supply-chain.jpg",
        "sabic-vendor-excellence-forum": "/assets/project-equipment.jpg",
        "saudi-construction-tech-summit-2026": "/assets/vision-team.jpg",
    },
}


def default_content_image(resource: str, slug: str) -> str | None:
    return DEFAULT_CONTENT_IMAGES.get(resource, {}).get(slug)

INBOX_CONFIG = {
    "contact": ContactSubmission,
    "rfq": RFQSubmission,
    "applications": RequirementApplication,
}


def inbox_summary(inbox: str, row: Any) -> str | None:
    if inbox == "contact":
        return getattr(row, "message", None) or getattr(row, "subject", None)
    if inbox == "rfq":
        return getattr(row, "scope", None) or getattr(row, "service", None)
    if inbox == "applications":
        message = getattr(row, "message", None)
        if message:
            return message
        phone = getattr(row, "phone", None)
        return f"{row.name} · {phone}" if phone else row.name
    return None


def serialize_inbox_item(inbox: str, row: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": str(row.id),
        "name": row.name,
        "email": getattr(row, "email", None),
        "company": getattr(row, "company", None),
        "phone": getattr(row, "phone", None),
        "status": enum_value(row.status),
        "summary": inbox_summary(inbox, row),
        "created_at": row.created_at.isoformat(),
        "internal_notes": getattr(row, "internal_notes", None),
    }
    if inbox == "contact":
        payload.update(
            {
                "subject": row.subject,
                "message": row.message,
                "locale": row.locale,
                "source": row.source,
            }
        )
    elif inbox == "rfq":
        payload.update(
            {
                "reference": row.reference,
                "service": row.service,
                "location": row.location,
                "budget": row.budget,
                "timeline": row.timeline,
                "scope": row.scope,
                "attachments": row.attachments or [],
            }
        )
    elif inbox == "applications":
        payload.update(
            {
                "requirement_id": str(row.requirement_id),
                "nationality": row.nationality,
                "iqama_number": row.iqama_number,
                "years_experience": row.years_experience,
                "message": row.message,
                "resume_media_id": (
                    str(row.resume_media_id) if row.resume_media_id else None
                ),
            }
        )
    return payload


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
    for key in ("summary", "excerpt", "tagline", "description", "answer"):
        value = getattr(translation, key, None) if translation else None
        if value:
            summary = value
            break
    identifier = getattr(item, "slug", None) or item.code
    hero_media_id = getattr(item, "hero_media_id", None)
    featured_media_id = getattr(item, "featured_media_id", None)
    thumbnail_media_id = featured_media_id or hero_media_id
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
        "thumbnail_url": (
            media_urls.get(str(thumbnail_media_id))
            if thumbnail_media_id
            else default_content_image(resource, identifier)
        ),
    }
    if resource == "posts":
        extra["category_id"] = str(item.category_id) if item.category_id else None
        extra["tag_ids"] = [str(tag.id) for tag in getattr(item, "tags", [])]
        body = translation.body if translation and isinstance(translation.body, dict) else {}
        extra["category"] = (item.category.name.get("en") if item.category and item.category.name else body.get("category", "Insights"))
        extra["author"] = body.get("author", "NOVARISE Editorial Team")
        extra["read_mins"] = body.get("readMins", body.get("read_mins", 5))
        extra["published_on"] = item.published_at.isoformat() if item.published_at else None
    if resource == "events":
        extra["event_type"] = getattr(translation, "event_type", None) or "Event"
        extra["starts_on"] = item.starts_on.isoformat() if item.starts_on else None
        extra["ends_on"] = item.ends_on.isoformat() if item.ends_on else None
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


def media_url(db: Session, media_id: uuid.UUID | None) -> str | None:
    if media_id is None:
        return None
    return db.scalar(select(MediaAsset.public_url).where(MediaAsset.id == media_id))


def project_editor_payload(project: Project, *, draft: ProjectDraft | None = None) -> dict[str, Any]:
    if draft is not None and draft.payload:
        return draft.payload
    translation = translation_for(project, "en")
    body = translation.body if translation and isinstance(translation.body, dict) else {}
    return {
        "slug": project.slug,
        "title": translation.title if translation else project.slug,
        "summary": translation.summary or "" if translation else "",
        "is_featured": project.is_featured,
        "sort_order": project.sort_order,
        "thumbnail_media_id": str(project.featured_media_id) if project.featured_media_id else None,
        "hero_media_id": str(project.hero_media_id) if project.hero_media_id else None,
        "sector": str(body.get("sector", "")),
        "client_name": project.client_name or "",
        "location": project.location or "",
        "value": str(body.get("value", "")),
        "duration": str(body.get("duration", "")),
        "started_on": project.started_on.isoformat() if project.started_on else None,
        "completed_on": project.completed_on.isoformat() if project.completed_on else None,
        "overview": body.get("long", []) if isinstance(body.get("long"), list) else [],
        "highlights": body.get("highlights", []) if isinstance(body.get("highlights"), list) else [],
        "meta_title": translation.meta_title or "" if translation else "",
        "meta_description": translation.meta_description or "" if translation else "",
    }


def validate_project_media(db: Session, media_id: uuid.UUID | None, label: str) -> None:
    if media_id is not None and db.get(MediaAsset, media_id) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{label} image was not found",
        )


def apply_project_payload(project: Project, payload: ProjectEditorPayload) -> None:
    translation = translation_for(project, "en")
    if translation is None:
        translation = ProjectTranslation(project_id=project.id, locale="en", title=payload.title)
        project.translations.append(translation)
    translation.title = payload.title
    translation.summary = payload.summary or None
    translation.scope = payload.summary or None
    translation.body = {
        **(translation.body if isinstance(translation.body, dict) else {}),
        "sector": payload.sector,
        "value": payload.value,
        "duration": payload.duration,
        "long": [entry.strip() for entry in payload.overview if entry.strip()],
        "highlights": [entry.strip() for entry in payload.highlights if entry.strip()],
    }
    translation.meta_title = payload.meta_title or None
    translation.meta_description = payload.meta_description or None
    project.slug = payload.slug
    project.is_featured = payload.is_featured
    project.sort_order = payload.sort_order
    project.featured_media_id = payload.thumbnail_media_id
    project.hero_media_id = payload.hero_media_id
    project.client_name = payload.client_name or None
    project.location = payload.location or None
    project.started_on = payload.started_on
    project.completed_on = payload.completed_on


def service_editor_payload(service: Service, *, draft: ServiceDraft | None = None) -> dict[str, Any]:
    if draft is not None and draft.payload:
        return draft.payload
    translation = translation_for(service, "en")
    return {
        "slug": service.slug,
        "title": translation.title if translation else service.slug,
        "summary": translation.tagline or "" if translation else "",
        "number": service.number or "",
        "icon": service.icon or "BriefcaseBusiness",
        "sort_order": service.sort_order,
        "hero_media_id": str(service.hero_media_id) if service.hero_media_id else None,
        "eyebrow": translation.eyebrow or "" if translation else "",
        "lead": translation.lead or "" if translation else "",
        "intro": translation.intro or "" if translation else "",
        "stats": service.stats or [],
        "sub_services": translation.sub_services or [] if translation else [],
        "capabilities": service.capabilities or [],
        "portfolio": service.portfolio or [],
        "process": service.process or [],
        "certifications": service.certifications or [],
        "faqs": translation.faqs or [] if translation else [],
        "meta_title": translation.meta_title or "" if translation else "",
        "meta_description": translation.meta_description or "" if translation else "",
    }


def apply_service_payload(service: Service, payload: ServiceEditorPayload) -> None:
    translation = translation_for(service, "en")
    if translation is None:
        translation = ServiceTranslation(service_id=service.id, locale="en", title=payload.title)
        service.translations.append(translation)
    translation.title = payload.title
    translation.tagline = payload.summary or None
    translation.eyebrow = payload.eyebrow or None
    translation.lead = payload.lead or None
    translation.intro = payload.intro or None
    translation.sub_services = payload.sub_services
    translation.faqs = payload.faqs
    translation.meta_title = payload.meta_title or None
    translation.meta_description = payload.meta_description or None
    service.slug = payload.slug
    service.number = payload.number or None
    service.icon = payload.icon or None
    service.sort_order = payload.sort_order
    service.hero_media_id = payload.hero_media_id
    service.stats = payload.stats
    service.capabilities = payload.capabilities
    service.portfolio = payload.portfolio
    service.process = payload.process
    service.certifications = payload.certifications


def post_editor_payload(post: Post, *, draft: PostDraft | None = None) -> dict[str, Any]:
    if draft is not None and draft.payload:
        return draft.payload
    translation = translation_for(post, "en")
    body = translation.body if translation and isinstance(translation.body, dict) else {}
    category = post.category.name.get("en") if post.category and post.category.name else body.get("category", "Insights")
    return {
        "slug": post.slug,
        "title": translation.title if translation else post.slug,
        "excerpt": translation.excerpt or "" if translation else "",
        "is_featured": post.is_featured,
        "category": str(category or "Insights"),
        "published_on": post.published_at.date().isoformat() if post.published_at else None,
        "read_mins": int(body.get("readMins", body.get("read_mins", 5)) or 5),
        "author": str(body.get("author", "NOVARISE Editorial Team")),
        "author_role": str(body.get("authorRole", body.get("author_role", "Editorial Team"))),
        "featured_media_id": str(post.featured_media_id) if post.featured_media_id else None,
        "paragraphs": body.get("paragraphs", []) if isinstance(body.get("paragraphs"), list) else [],
        "pull_quote": str(body.get("pullQuote", body.get("pull_quote", "")) or ""),
        "key_takeaways": body.get("keyTakeaways", body.get("key_takeaways", [])) if isinstance(body.get("keyTakeaways", body.get("key_takeaways", [])), list) else [],
        "meta_title": translation.meta_title or "" if translation else "",
        "meta_description": translation.meta_description or "" if translation else "",
    }


def event_editor_payload(event: Event, *, draft: EventDraft | None = None) -> dict[str, Any]:
    if draft is not None and draft.payload:
        return draft.payload
    translation = translation_for(event, "en")
    body = translation.body if translation and isinstance(translation.body, dict) else {}
    agenda = body.get("agenda", []) if isinstance(body.get("agenda"), list) else []
    return {
        "slug": event.slug,
        "title": translation.title if translation else event.slug,
        "description": translation.description or "" if translation else "",
        "is_featured": event.is_featured,
        "event_type": translation.event_type or "Conference" if translation else "Conference",
        "starts_on": event.starts_on.isoformat() if event.starts_on else None,
        "ends_on": event.ends_on.isoformat() if event.ends_on else None,
        "time": str(body.get("time", "")),
        "location": translation.location or "" if translation else "",
        "venue": str(body.get("venue", "")),
        "date_display": translation.date_display or "" if translation else "",
        "featured_media_id": str(event.featured_media_id) if event.featured_media_id else None,
        "overview": body.get("overview", []) if isinstance(body.get("overview"), list) else [],
        "agenda": agenda,
        "takeaways": body.get("takeaways", []) if isinstance(body.get("takeaways"), list) else [],
        "meta_title": translation.meta_title or "" if translation else "",
        "meta_description": translation.meta_description or "" if translation else "",
    }


def apply_post_payload(post: Post, payload: PostEditorPayload) -> None:
    translation = translation_for(post, "en")
    if translation is None:
        translation = PostTranslation(post_id=post.id, locale="en", title=payload.title)
        post.translations.append(translation)
    translation.title = payload.title
    translation.excerpt = payload.excerpt or None
    translation.body = {
        **(translation.body if isinstance(translation.body, dict) else {}),
        "category": payload.category,
        "readMins": payload.read_mins,
        "author": payload.author,
        "authorRole": payload.author_role,
        "paragraphs": [entry.strip() for entry in payload.paragraphs],
        "pullQuote": payload.pull_quote.strip(),
        "keyTakeaways": [entry.strip() for entry in payload.key_takeaways],
    }
    translation.meta_title = payload.meta_title or None
    translation.meta_description = payload.meta_description or None
    post.slug = payload.slug
    post.is_featured = payload.is_featured
    post.featured_media_id = payload.featured_media_id
    post.published_at = datetime.combine(payload.published_on, datetime.min.time(), tzinfo=UTC) if payload.published_on else None


def apply_event_payload(event: Event, payload: EventEditorPayload) -> None:
    translation = translation_for(event, "en")
    if translation is None:
        translation = EventTranslation(event_id=event.id, locale="en", title=payload.title)
        event.translations.append(translation)
    translation.title = payload.title
    translation.description = payload.description or None
    translation.event_type = payload.event_type or None
    translation.location = payload.location or None
    translation.date_display = payload.date_display or None
    translation.body = {
        **(translation.body if isinstance(translation.body, dict) else {}),
        "time": payload.time,
        "venue": payload.venue,
        "overview": [entry.strip() for entry in payload.overview],
        "agenda": [entry.model_dump() for entry in payload.agenda],
        "takeaways": [entry.strip() for entry in payload.takeaways],
    }
    translation.meta_title = payload.meta_title or None
    translation.meta_description = payload.meta_description or None
    event.slug = payload.slug
    event.is_featured = payload.is_featured
    event.featured_media_id = payload.featured_media_id
    event.starts_on = payload.starts_on
    event.ends_on = payload.ends_on or payload.starts_on


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
        "events": db.scalar(select(func.count()).select_from(Event)) or 0,
        "faq": db.scalar(select(func.count()).select_from(FaqItem)) or 0,
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
        options.append(selectinload(Post.category))
    if resource == "requirements":
        options.append(selectinload(Requirement.contacts))
    order_columns = [model.updated_at.desc()]
    if hasattr(model, "sort_order"):
        order_columns = [model.sort_order, model.updated_at.desc()]
    statement = select(model).options(*options).order_by(*order_columns).limit(limit)
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


@router.get("/projects/{project_id}/editor")
def get_project_editor(
    project_id: uuid.UUID,
    user: Annotated[User, Depends(require_permission("cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    project = db.scalar(
        select(Project).options(selectinload(Project.translations)).where(Project.id == project_id)
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    draft = db.scalar(select(ProjectDraft).where(ProjectDraft.project_id == project.id))
    published = project_editor_payload(project)
    working = project_editor_payload(project, draft=draft)
    thumbnail_id = uuid.UUID(working["thumbnail_media_id"]) if working.get("thumbnail_media_id") else None
    hero_id = uuid.UUID(working["hero_media_id"]) if working.get("hero_media_id") else None
    return {
        "project_id": str(project.id),
        "status": enum_value(project.status),
        "updated_at": project.updated_at.isoformat(),
        "has_draft": draft is not None,
        "draft_updated_at": draft.updated_at.isoformat() if draft else None,
        "data": working,
        "preview": {
            "thumbnail_url": media_url(db, thumbnail_id),
            "hero_url": media_url(db, hero_id),
            "published_slug": published["slug"],
        },
    }


@router.get("/services/{service_id}/editor")
def get_service_editor(
    service_id: uuid.UUID,
    user: Annotated[User, Depends(require_permission("cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    service = db.scalar(
        select(Service).options(selectinload(Service.translations)).where(Service.id == service_id)
    )
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    draft = db.scalar(select(ServiceDraft).where(ServiceDraft.service_id == service.id))
    published = service_editor_payload(service)
    working = service_editor_payload(service, draft=draft)
    hero_id = uuid.UUID(working["hero_media_id"]) if working.get("hero_media_id") else None
    return {
        "service_id": str(service.id),
        "status": enum_value(service.status),
        "updated_at": service.updated_at.isoformat(),
        "has_draft": draft is not None,
        "draft_updated_at": draft.updated_at.isoformat() if draft else None,
        "data": working,
        "preview": {
            "hero_url": media_url(db, hero_id),
            "published_slug": published["slug"],
        },
    }


@router.put("/services/{service_id}/draft")
def save_service_draft(
    service_id: uuid.UUID,
    payload: ServiceEditorPayload,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> dict[str, Any]:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    validate_project_media(db, payload.hero_media_id, "Hero")
    draft = db.scalar(select(ServiceDraft).where(ServiceDraft.service_id == service.id))
    before = draft.payload if draft else None
    if draft is None:
        draft = ServiceDraft(service_id=service.id, payload=payload.model_dump(mode="json"))
        db.add(draft)
    else:
        draft.payload = payload.model_dump(mode="json")
    audit(db, request, user, "cms.service_draft_saved", "services", service.id, before=before, after=draft.payload)
    db.commit()
    db.refresh(draft)
    return {"status": "draft_saved", "updated_at": draft.updated_at.isoformat()}


@router.post("/services/{service_id}/publish")
def publish_service(
    service_id: uuid.UUID,
    payload: ServiceEditorPayload,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.publish"))],
    db: DBSession,
) -> dict[str, Any]:
    service = db.scalar(
        select(Service).options(selectinload(Service.translations)).where(Service.id == service_id)
    )
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    conflict = db.scalar(select(Service).where(Service.slug == payload.slug, Service.id != service.id))
    if conflict is not None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="That service URL is already in use")
    validate_project_media(db, payload.hero_media_id, "Hero")
    before = service_editor_payload(service)
    apply_service_payload(service, payload)
    service.status = "published"
    draft = db.scalar(select(ServiceDraft).where(ServiceDraft.service_id == service.id))
    if draft is not None:
        db.delete(draft)
    audit(db, request, user, "cms.service_published", "services", service.id, before=before, after=payload.model_dump(mode="json"))
    db.commit()
    return {"status": "published", "slug": service.slug, "updated_at": service.updated_at.isoformat()}


@router.post("/projects")
def create_project(
    payload: ProjectCreateRequest,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> dict[str, Any]:
    """Reserve a draft project before its five editor blocks are completed."""
    # Keep the latest project first within its own public group without affecting
    # the order of Featured versus Basic projects.
    db.execute(
        update(Project)
        .where(Project.is_featured.is_(payload.is_featured))
        .values(sort_order=Project.sort_order + 1)
    )
    project = Project(
        slug=f"new-project-{uuid.uuid4().hex[:8]}",
        status="draft",
        is_featured=payload.is_featured,
        sort_order=0,
    )
    project.translations.append(ProjectTranslation(locale="en", title=""))
    db.add(project)
    db.flush()
    audit(
        db,
        request,
        user,
        "cms.project_created",
        "projects",
        project.id,
        before=None,
        after={"is_featured": project.is_featured, "sort_order": project.sort_order},
    )
    db.commit()
    db.refresh(project)
    return {
        "id": str(project.id),
        "slug": project.slug,
        "status": enum_value(project.status),
        "is_featured": project.is_featured,
        "sort_order": project.sort_order,
        "updated_at": project.updated_at.isoformat(),
    }


@router.put("/projects/{project_id}/draft")
def save_project_draft(
    project_id: uuid.UUID,
    payload: ProjectEditorPayload,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> dict[str, Any]:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    validate_project_media(db, payload.thumbnail_media_id, "Thumbnail")
    validate_project_media(db, payload.hero_media_id, "Hero")
    draft = db.scalar(select(ProjectDraft).where(ProjectDraft.project_id == project.id))
    before = draft.payload if draft else None
    if draft is None:
        draft = ProjectDraft(project_id=project.id, payload=payload.model_dump(mode="json"))
        db.add(draft)
    else:
        draft.payload = payload.model_dump(mode="json")
    audit(
        db,
        request,
        user,
        "cms.project_draft_saved",
        "projects",
        project.id,
        before=before,
        after=draft.payload,
    )
    db.commit()
    db.refresh(draft)
    return {"status": "draft_saved", "updated_at": draft.updated_at.isoformat()}


@router.post("/projects/{project_id}/publish")
def publish_project(
    project_id: uuid.UUID,
    payload: ProjectEditorPayload,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.publish"))],
    db: DBSession,
) -> dict[str, Any]:
    project = db.scalar(
        select(Project).options(selectinload(Project.translations)).where(Project.id == project_id)
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    conflict = db.scalar(select(Project).where(Project.slug == payload.slug, Project.id != project.id))
    if conflict is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="That project URL is already in use",
        )
    validate_project_media(db, payload.thumbnail_media_id, "Thumbnail")
    validate_project_media(db, payload.hero_media_id, "Hero")
    before = project_editor_payload(project)
    apply_project_payload(project, payload)
    project.status = "published"
    draft = db.scalar(select(ProjectDraft).where(ProjectDraft.project_id == project.id))
    if draft is not None:
        db.delete(draft)
    audit(
        db,
        request,
        user,
        "cms.project_published",
        "projects",
        project.id,
        before=before,
        after=payload.model_dump(mode="json"),
    )
    db.commit()
    return {"status": "published", "slug": project.slug, "updated_at": project.updated_at.isoformat()}


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: uuid.UUID,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> None:
    project = db.scalar(
        select(Project).options(selectinload(Project.translations)).where(Project.id == project_id)
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    before = project_editor_payload(project)
    audit(db, request, user, "cms.project_deleted", "projects", project.id, before=before, after=None)
    db.delete(project)
    db.commit()


@router.get("/posts/{post_id}/editor")
def get_post_editor(
    post_id: uuid.UUID,
    user: Annotated[User, Depends(require_permission("cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    post = db.scalar(
        select(Post)
        .options(selectinload(Post.translations), selectinload(Post.category))
        .where(Post.id == post_id)
    )
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    draft = db.scalar(select(PostDraft).where(PostDraft.post_id == post.id))
    working = post_editor_payload(post, draft=draft)
    return {
        "post_id": str(post.id), "status": enum_value(post.status),
        "updated_at": post.updated_at.isoformat(), "has_draft": draft is not None,
        "draft_updated_at": draft.updated_at.isoformat() if draft else None,
        "data": working,
        "preview": {
            "image_url": media_url(db, uuid.UUID(working["featured_media_id"])) if working.get("featured_media_id") else default_content_image("posts", post.slug),
            "published_slug": post.slug,
        },
    }


@router.post("/posts")
def create_post(
    payload: PostCreateRequest,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> dict[str, Any]:
    post = Post(slug=f"new-article-{uuid.uuid4().hex[:8]}", status="draft", is_featured=payload.is_featured)
    post.translations.append(PostTranslation(locale="en", title=""))
    db.add(post)
    db.flush()
    audit(db, request, user, "cms.post_created", "posts", post.id, after={"is_featured": post.is_featured})
    db.commit()
    db.refresh(post)
    return {"id": str(post.id), "slug": post.slug, "status": enum_value(post.status), "is_featured": post.is_featured, "updated_at": post.updated_at.isoformat()}


@router.put("/posts/{post_id}/draft")
def save_post_draft(
    post_id: uuid.UUID,
    payload: PostEditorPayload,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> dict[str, Any]:
    post = db.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    validate_project_media(db, payload.featured_media_id, "Article image")
    draft = db.scalar(select(PostDraft).where(PostDraft.post_id == post.id))
    before = draft.payload if draft else None
    if draft is None:
        draft = PostDraft(post_id=post.id, payload=payload.model_dump(mode="json"))
        db.add(draft)
    else:
        draft.payload = payload.model_dump(mode="json")
    audit(db, request, user, "cms.post_draft_saved", "posts", post.id, before=before, after=draft.payload)
    db.commit()
    db.refresh(draft)
    return {"status": "draft_saved", "updated_at": draft.updated_at.isoformat()}


@router.post("/posts/{post_id}/publish")
def publish_post(
    post_id: uuid.UUID,
    payload: PostEditorPayload,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.publish"))],
    db: DBSession,
) -> dict[str, Any]:
    post = db.scalar(select(Post).options(selectinload(Post.translations)).where(Post.id == post_id))
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    conflict = db.scalar(select(Post).where(Post.slug == payload.slug, Post.id != post.id))
    if conflict is not None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="That article URL is already in use")
    validate_project_media(db, payload.featured_media_id, "Article image")
    before = post_editor_payload(post)
    apply_post_payload(post, payload)
    post.status = "published"
    draft = db.scalar(select(PostDraft).where(PostDraft.post_id == post.id))
    if draft is not None:
        db.delete(draft)
    audit(db, request, user, "cms.post_published", "posts", post.id, before=before, after=payload.model_dump(mode="json"))
    db.commit()
    return {"status": "published", "slug": post.slug, "updated_at": post.updated_at.isoformat()}


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: uuid.UUID,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> None:
    post = db.scalar(select(Post).options(selectinload(Post.translations)).where(Post.id == post_id))
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    audit(db, request, user, "cms.post_deleted", "posts", post.id, before=post_editor_payload(post), after=None)
    db.delete(post)
    db.commit()


@router.get("/events/{event_id}/editor")
def get_event_editor(
    event_id: uuid.UUID,
    user: Annotated[User, Depends(require_permission("cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    event = db.scalar(select(Event).options(selectinload(Event.translations)).where(Event.id == event_id))
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    draft = db.scalar(select(EventDraft).where(EventDraft.event_id == event.id))
    working = event_editor_payload(event, draft=draft)
    return {
        "event_id": str(event.id), "status": enum_value(event.status),
        "updated_at": event.updated_at.isoformat(), "has_draft": draft is not None,
        "draft_updated_at": draft.updated_at.isoformat() if draft else None,
        "data": working,
        "preview": {
            "image_url": media_url(db, uuid.UUID(working["featured_media_id"])) if working.get("featured_media_id") else default_content_image("events", event.slug),
            "published_slug": event.slug,
        },
    }


@router.post("/events")
def create_event(
    payload: EventCreateRequest,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> dict[str, Any]:
    event = Event(slug=f"new-event-{uuid.uuid4().hex[:8]}", status="draft", is_featured=payload.is_featured, sort_order=0)
    event.translations.append(EventTranslation(locale="en", title=""))
    db.add(event)
    db.flush()
    audit(db, request, user, "cms.event_created", "events", event.id, after={"is_featured": event.is_featured})
    db.commit()
    db.refresh(event)
    return {"id": str(event.id), "slug": event.slug, "status": enum_value(event.status), "is_featured": event.is_featured, "updated_at": event.updated_at.isoformat()}


@router.put("/events/{event_id}/draft")
def save_event_draft(
    event_id: uuid.UUID,
    payload: EventEditorPayload,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> dict[str, Any]:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    validate_project_media(db, payload.featured_media_id, "Event image")
    draft = db.scalar(select(EventDraft).where(EventDraft.event_id == event.id))
    before = draft.payload if draft else None
    if draft is None:
        draft = EventDraft(event_id=event.id, payload=payload.model_dump(mode="json"))
        db.add(draft)
    else:
        draft.payload = payload.model_dump(mode="json")
    audit(db, request, user, "cms.event_draft_saved", "events", event.id, before=before, after=draft.payload)
    db.commit()
    db.refresh(draft)
    return {"status": "draft_saved", "updated_at": draft.updated_at.isoformat()}


@router.post("/events/{event_id}/publish")
def publish_event(
    event_id: uuid.UUID,
    payload: EventEditorPayload,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.publish"))],
    db: DBSession,
) -> dict[str, Any]:
    event = db.scalar(select(Event).options(selectinload(Event.translations)).where(Event.id == event_id))
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    conflict = db.scalar(select(Event).where(Event.slug == payload.slug, Event.id != event.id))
    if conflict is not None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="That event URL is already in use")
    validate_project_media(db, payload.featured_media_id, "Event image")
    before = event_editor_payload(event)
    apply_event_payload(event, payload)
    event.status = "published"
    draft = db.scalar(select(EventDraft).where(EventDraft.event_id == event.id))
    if draft is not None:
        db.delete(draft)
    audit(db, request, user, "cms.event_published", "events", event.id, before=before, after=payload.model_dump(mode="json"))
    db.commit()
    return {"status": "published", "slug": event.slug, "updated_at": event.updated_at.isoformat()}


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: uuid.UUID,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> None:
    event = db.scalar(select(Event).options(selectinload(Event.translations)).where(Event.id == event_id))
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    audit(db, request, user, "cms.event_deleted", "events", event.id, before=event_editor_payload(event), after=None)
    db.delete(event)
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
    items = [serialize_inbox_item(inbox, row) for row in rows]
    return {"items": items, "total": len(items)}


@router.get("/inbox/{inbox}/{item_id}")
def get_inbox_item(
    inbox: InboxName,
    item_id: uuid.UUID,
    user: Annotated[User, Depends(require_permission("cms.manage_inbox", "cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    model = INBOX_CONFIG[inbox]
    row = db.get(model, item_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return serialize_inbox_item(inbox, row)


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
