import secrets
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
from app.core.content_images import default_content_image
from app.core.database import get_db
from app.core.request import client_ip
from app.core.security import hash_password, verify_password
from app.core.storage import delete_stored_file, save_upload, stored_file_exists
from app.core.workflow import (
    application_stage_for_operational,
    operational_for_application_stage,
    operational_for_rfq_stage,
    rfq_stage_for_operational,
)
from app.models import (
    ApplicationActivity,
    AuditLog,
    Category,
    ContactSubmission,
    Event,
    EventDraft,
    EventTranslation,
    FaqItem,
    FaqItemTranslation,
    InboxActivity,
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
    RefreshToken,
    Requirement,
    RequirementApplication,
    RequirementContact,
    RequirementDraft,
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
    ApplicationNoteCreate,
    ApplicationOperationalStatusUpdate,
    ApplicationWorkflowUpdate,
    ContactConvertToRFQ,
    ContactOperationalStatusUpdate,
    ContactWorkflowUpdate,
    ContentItem,
    ContentListResponse,
    EventCreateRequest,
    EventEditorPayload,
    MediaUpdate,
    NavigationUpsert,
    PostCreateRequest,
    PostEditorPayload,
    ProjectCreateRequest,
    ProjectEditorPayload,
    RequirementCreateRequest,
    RequirementEditorPayload,
    RFQOperationalStatusUpdate,
    RFQWorkflowUpdate,
    SensitiveActionRequest,
    ServiceEditorPayload,
    SettingUpsert,
    TaxonomyUpsert,
    UserCreate,
    UserPasswordReset,
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
        assigned = getattr(row, "assigned_to", None)
        converted = getattr(row, "converted_rfq", None)
        payload.update(
            {
                "subject": row.subject,
                "message": row.message,
                "locale": row.locale,
                "source": row.source,
                "operational_status": row.operational_status or "pending",
                "notification_status": row.notification_status or "not_required",
                "notification_requested_at": row.notification_requested_at.isoformat() if row.notification_requested_at else None,
                "assigned_to_id": str(row.assigned_to_id) if row.assigned_to_id else None,
                "assigned_to_name": assigned.full_name if assigned else None,
                "follow_up_at": row.follow_up_at.isoformat() if row.follow_up_at else None,
                "response_summary": row.response_summary,
                "converted_rfq_id": str(row.converted_rfq_id) if row.converted_rfq_id else None,
                "converted_rfq_reference": converted.reference if converted else None,
            }
        )
    elif inbox == "rfq":
        assigned = getattr(row, "assigned_to", None)
        payload.update(
            {
                "reference": row.reference,
                "service": row.service,
                "location": row.location,
                "budget": row.budget,
                "timeline": row.timeline,
                "scope": row.scope,
                "attachments": row.attachments or [],
                "operational_status": row.operational_status or "pending",
                "commercial_stage": row.commercial_stage or "new",
                "notification_status": row.notification_status or "not_required",
                "notification_requested_at": row.notification_requested_at.isoformat() if row.notification_requested_at else None,
                "assigned_to_id": str(row.assigned_to_id) if row.assigned_to_id else None,
                "assigned_to_name": assigned.full_name if assigned else None,
                "follow_up_at": row.follow_up_at.isoformat() if row.follow_up_at else None,
                "meeting_at": row.meeting_at.isoformat() if row.meeting_at else None,
                "qualification": row.qualification or {},
                "proposal": row.proposal or {},
            }
        )
    elif inbox == "applications":
        requirement = getattr(row, "requirement", None)
        assigned = getattr(row, "assigned_to", None)
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
                "stage": getattr(row, "application_stage", None) or enum_value(row.status),
                "operational_status": getattr(row, "operational_status", None) or "pending",
                "notification_status": getattr(row, "notification_status", None) or "not_required",
                "notification_requested_at": row.notification_requested_at.isoformat() if getattr(row, "notification_requested_at", None) else None,
                "assigned_to_id": str(row.assigned_to_id) if row.assigned_to_id else None,
                "assigned_to_name": assigned.full_name if assigned else None,
                "follow_up_at": row.follow_up_at.isoformat() if row.follow_up_at else None,
                "interview_at": row.interview_at.isoformat() if row.interview_at else None,
                "documents": row.documents or [],
                "requirement": {
                    "id": str(requirement.id),
                    "code": requirement.code,
                    "position": (translation_for(requirement, "en").position if translation_for(requirement, "en") else requirement.code),
                    "project_name": requirement.project_name,
                    "location": requirement.location,
                    "status": enum_value(requirement.status),
                } if requirement else None,
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
            ip_address=client_ip(request),
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
            media_urls.get(str(thumbnail_media_id)) if thumbnail_media_id else None
        ) or default_content_image(resource, identifier),
    }
    if resource == "requirements":
        extra.update({
            "rate_amount": str(item.rate_amount) if item.rate_amount is not None else None,
            "rate_currency": item.rate_currency,
            "rate_unit": item.rate_unit,
            "opens_at": item.opens_at.isoformat() if item.opens_at else None,
            "closes_at": item.closes_at.isoformat() if item.closes_at else None,
        })
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
    asset = db.get(MediaAsset, media_id)
    return asset.public_url if asset and stored_file_exists(asset.storage_key) else None


def requirement_editor_payload(requirement: Requirement, *, draft: RequirementDraft | None = None) -> dict[str, Any]:
    if draft is not None and draft.payload:
        return draft.payload
    translation = translation_for(requirement, "en")
    return {
        "code": requirement.code,
        "position": translation.position if translation else requirement.code,
        "status": enum_value(requirement.status),
        "approval": translation.approval or "" if translation else "",
        "description": translation.description or "" if translation else "",
        "headcount": requirement.headcount,
        "project_name": requirement.project_name or "",
        "location": requirement.location or "",
        "rate_amount": str(requirement.rate_amount) if requirement.rate_amount is not None else None,
        "rate_currency": requirement.rate_currency,
        "rate_unit": requirement.rate_unit or "hour",
        "duration": translation.duration or "" if translation else "",
        "salary_cycle": translation.salary_cycle or "Monthly" if translation else "Monthly",
        "food": translation.food or "" if translation else "",
        "accommodation": translation.accommodation or "" if translation else "",
        "documents": translation.documents or [] if translation else [],
        "contacts": [
            {"display": contact.display_phone, "raw": contact.phone_e164, "whatsapp": contact.has_whatsapp}
            for contact in sorted(requirement.contacts, key=lambda row: row.sort_order)
        ],
        "opens_at": requirement.opens_at.isoformat() if requirement.opens_at else None,
        "closes_at": requirement.closes_at.isoformat() if requirement.closes_at else None,
    }


def apply_requirement_payload(requirement: Requirement, payload: RequirementEditorPayload) -> None:
    translation = translation_for(requirement, "en")
    if translation is None:
        translation = RequirementTranslation(requirement_id=requirement.id, locale="en", position=payload.position)
        requirement.translations.append(translation)
    translation.position = payload.position
    translation.approval = payload.approval or None
    translation.description = payload.description or None
    translation.duration = payload.duration or None
    translation.salary_cycle = payload.salary_cycle or None
    translation.food = payload.food or None
    translation.accommodation = payload.accommodation or None
    translation.documents = [entry.strip() for entry in payload.documents if entry.strip()]
    requirement.code = payload.code
    requirement.status = payload.status
    requirement.headcount = payload.headcount
    requirement.project_name = payload.project_name or None
    requirement.location = payload.location or None
    requirement.rate_amount = payload.rate_amount
    requirement.rate_currency = payload.rate_currency.upper()
    requirement.rate_unit = payload.rate_unit or None
    requirement.opens_at = payload.opens_at
    requirement.closes_at = payload.closes_at
    requirement.contacts.clear()
    for index, contact in enumerate(payload.contacts):
        requirement.contacts.append(RequirementContact(
            display_phone=contact.display,
            phone_e164=contact.raw.lstrip("+"),
            has_whatsapp=contact.whatsapp,
            sort_order=index,
        ))


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
        rows = db.scalars(select(MediaAsset).where(MediaAsset.id.in_(media_ids)))
        media_urls = {
            str(asset.id): asset.public_url
            for asset in rows
            if stored_file_exists(asset.storage_key)
        }
    serialized = [serialize_content(resource, item, locale, media_urls) for item in items]
    if resource == "requirements" and items:
        application_counts = dict(db.execute(
            select(RequirementApplication.requirement_id, func.count())
            .where(RequirementApplication.requirement_id.in_([item.id for item in items]))
            .group_by(RequirementApplication.requirement_id)
        ).all())
        for content, row in zip(serialized, items, strict=True):
            content.extra["application_count"] = application_counts.get(row.id, 0)
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
            "thumbnail_url": media_url(db, thumbnail_id)
            or default_content_image("projects", project.slug),
            "hero_url": media_url(db, hero_id)
            or default_content_image("projects", project.slug),
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
            "hero_url": media_url(db, hero_id)
            or default_content_image("services", service.slug),
            "published_slug": published["slug"],
        },
    }


@router.get("/requirements/{requirement_id}/editor")
def get_requirement_editor(
    requirement_id: uuid.UUID,
    user: Annotated[User, Depends(require_permission("cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    requirement = db.scalar(
        select(Requirement)
        .options(selectinload(Requirement.translations), selectinload(Requirement.contacts))
        .where(Requirement.id == requirement_id)
    )
    if requirement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")
    draft = db.scalar(select(RequirementDraft).where(RequirementDraft.requirement_id == requirement.id))
    return {
        "requirement_id": str(requirement.id),
        "status": enum_value(requirement.status),
        "updated_at": requirement.updated_at.isoformat(),
        "has_draft": draft is not None,
        "draft_updated_at": draft.updated_at.isoformat() if draft else None,
        "data": requirement_editor_payload(requirement, draft=draft),
        "application_count": db.scalar(select(func.count()).select_from(RequirementApplication).where(RequirementApplication.requirement_id == requirement.id)) or 0,
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
            "image_url": (
                media_url(db, uuid.UUID(working["featured_media_id"]))
                if working.get("featured_media_id")
                else None
            ) or default_content_image("posts", post.slug),
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
            "image_url": (
                media_url(db, uuid.UUID(working["featured_media_id"]))
                if working.get("featured_media_id")
                else None
            ) or default_content_image("events", event.slug),
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


@router.post("/requirements")
def create_requirement(
    payload: RequirementCreateRequest,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> dict[str, Any]:
    requirement = Requirement(
        code=f"new-requirement-{uuid.uuid4().hex[:8]}",
        status="draft",
        headcount=1,
        rate_currency="SAR",
    )
    requirement.translations.append(RequirementTranslation(locale="en", position=""))
    db.add(requirement)
    db.flush()
    draft_payload = RequirementEditorPayload(
        code=requirement.code,
        position="New requirement",
        status=payload.target_status,
    ).model_dump(mode="json")
    draft_payload["position"] = ""
    db.add(RequirementDraft(requirement_id=requirement.id, payload=draft_payload))
    audit(db, request, user, "cms.requirement_created", "requirements", requirement.id, after={"target_status": payload.target_status})
    db.commit()
    db.refresh(requirement)
    return {"id": str(requirement.id), "code": requirement.code, "status": "draft", "updated_at": requirement.updated_at.isoformat()}


@router.put("/requirements/{requirement_id}/draft")
def save_requirement_draft(
    requirement_id: uuid.UUID,
    payload: RequirementEditorPayload,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> dict[str, Any]:
    requirement = db.get(Requirement, requirement_id)
    if requirement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")
    conflict = db.scalar(select(Requirement).where(Requirement.code == payload.code, Requirement.id != requirement.id))
    if conflict is not None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="That requirement code is already in use")
    draft = db.scalar(select(RequirementDraft).where(RequirementDraft.requirement_id == requirement.id))
    before = draft.payload if draft else None
    if draft is None:
        draft = RequirementDraft(requirement_id=requirement.id, payload=payload.model_dump(mode="json"))
        db.add(draft)
    else:
        draft.payload = payload.model_dump(mode="json")
    audit(db, request, user, "cms.requirement_draft_saved", "requirements", requirement.id, before=before, after=draft.payload)
    db.commit()
    db.refresh(draft)
    return {"status": "draft_saved", "updated_at": draft.updated_at.isoformat()}


@router.post("/requirements/{requirement_id}/publish")
def publish_requirement(
    requirement_id: uuid.UUID,
    payload: RequirementEditorPayload,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.publish"))],
    db: DBSession,
) -> dict[str, Any]:
    requirement = db.scalar(
        select(Requirement)
        .options(selectinload(Requirement.translations), selectinload(Requirement.contacts))
        .where(Requirement.id == requirement_id)
    )
    if requirement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")
    conflict = db.scalar(select(Requirement).where(Requirement.code == payload.code, Requirement.id != requirement.id))
    if conflict is not None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="That requirement code is already in use")
    if payload.status == "draft":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose Active, Urgent or Closed before publishing")
    before = requirement_editor_payload(requirement)
    apply_requirement_payload(requirement, payload)
    draft = db.scalar(select(RequirementDraft).where(RequirementDraft.requirement_id == requirement.id))
    if draft is not None:
        db.delete(draft)
    audit(db, request, user, "cms.requirement_published", "requirements", requirement.id, before=before, after=payload.model_dump(mode="json"))
    db.commit()
    return {"status": enum_value(requirement.status), "code": requirement.code, "updated_at": requirement.updated_at.isoformat()}


@router.delete("/requirements/{requirement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_requirement(
    requirement_id: uuid.UUID,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_content"))],
    db: DBSession,
) -> None:
    requirement = db.scalar(
        select(Requirement).options(selectinload(Requirement.translations), selectinload(Requirement.contacts)).where(Requirement.id == requirement_id)
    )
    if requirement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")
    application_count = db.scalar(select(func.count()).select_from(RequirementApplication).where(RequirementApplication.requirement_id == requirement.id)) or 0
    if application_count:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This requirement has applications. Close it instead so candidate history remains intact.")
    audit(db, request, user, "cms.requirement_deleted", "requirements", requirement.id, before=requirement_editor_payload(requirement))
    db.delete(requirement)
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
    statement = select(model).order_by(model.created_at.desc()).limit(limit)
    if inbox == "applications":
        statement = statement.options(
            selectinload(RequirementApplication.requirement).selectinload(Requirement.translations),
            selectinload(RequirementApplication.assigned_to),
        )
    elif inbox == "contact":
        statement = statement.options(
            selectinload(ContactSubmission.assigned_to),
            selectinload(ContactSubmission.converted_rfq),
        )
    elif inbox == "rfq":
        statement = statement.options(selectinload(RFQSubmission.assigned_to))
    rows = list(db.scalars(statement))
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
    if inbox == "applications":
        row = db.scalar(
            select(RequirementApplication)
            .options(
                selectinload(RequirementApplication.requirement).selectinload(Requirement.translations),
                selectinload(RequirementApplication.assigned_to),
                selectinload(RequirementApplication.activities),
            )
            .where(RequirementApplication.id == item_id)
        )
    elif inbox == "contact":
        row = db.scalar(
            select(ContactSubmission)
            .options(
                selectinload(ContactSubmission.assigned_to),
                selectinload(ContactSubmission.converted_rfq),
            )
            .where(ContactSubmission.id == item_id)
        )
    else:
        row = db.scalar(
            select(RFQSubmission)
            .options(selectinload(RFQSubmission.assigned_to))
            .where(RFQSubmission.id == item_id)
        )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    result = serialize_inbox_item(inbox, row)
    if inbox == "applications":
        result["activities"] = [
            {
                "id": str(activity.id),
                "action": activity.action,
                "note": activity.note,
                "details": activity.details or {},
                "created_at": activity.created_at.isoformat(),
            }
            for activity in sorted(row.activities, key=lambda item: item.created_at, reverse=True)
        ]
    elif inbox in ("contact", "rfq"):
        activities = list(db.scalars(
            select(InboxActivity)
            .where(InboxActivity.entity_type == inbox, InboxActivity.entity_id == item_id)
            .order_by(InboxActivity.created_at.desc())
        ))
        result["activities"] = [
            {
                "id": str(activity.id),
                "action": activity.action,
                "note": activity.note,
                "details": activity.details or {},
                "created_at": activity.created_at.isoformat(),
            }
            for activity in activities
        ]
    return result


def active_team_users(db: Session) -> list[dict[str, str]]:
    return [
        {"id": str(row.id), "name": row.full_name, "email": row.email}
        for row in db.scalars(select(User).where(User.is_active.is_(True)).order_by(User.full_name))
    ]


def add_inbox_activity(
    db: Session,
    entity_type: Literal["contact", "rfq"],
    entity_id: uuid.UUID,
    actor_id: uuid.UUID | None,
    action: str,
    *,
    note: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    db.add(InboxActivity(
        entity_type=entity_type,
        entity_id=entity_id,
        actor_id=actor_id,
        action=action,
        note=note,
        details=details or {},
    ))


@router.get("/contacts/overview")
def contacts_overview(
    user: Annotated[User, Depends(require_permission("cms.manage_inbox", "cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    operational = dict(db.execute(
        select(ContactSubmission.operational_status, func.count()).group_by(ContactSubmission.operational_status)
    ).all())
    return {"operational": operational, "users": active_team_users(db)}


@router.patch("/contacts/{contact_id}/status")
def update_contact_operational_status(
    contact_id: uuid.UUID,
    payload: ContactOperationalStatusUpdate,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_inbox"))],
    db: DBSession,
) -> dict[str, Any]:
    contact = db.get(ContactSubmission, contact_id)
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact enquiry not found")
    before = contact.operational_status
    contact.operational_status = payload.status
    contact.status = {
        "pending": SubmissionStatus.NEW,
        "contacted": SubmissionStatus.CONTACTED,
        "resolved": SubmissionStatus.CLOSED,
        "spam": SubmissionStatus.SPAM,
    }[payload.status]
    notification_requested = payload.status == "contacted" and before != "contacted"
    if notification_requested:
        contact.notification_status = "awaiting_integration"
        contact.notification_requested_at = datetime.now(UTC)
    elif payload.status == "pending":
        contact.notification_status = "not_required"
        contact.notification_requested_at = None
    add_inbox_activity(
        db, "contact", contact.id, user.id, f"status_{payload.status}",
        note="Contact acknowledgement queued for the future email/SMS integration." if notification_requested else None,
        details={"before": before, "after": payload.status, "notification_status": contact.notification_status},
    )
    audit(db, request, user, "cms.contact_status_updated", "contact", contact.id, before={"status": before}, after={"status": payload.status, "notification_status": contact.notification_status})
    db.commit()
    return {
        "status": payload.status,
        "notification_status": contact.notification_status,
        "notification_requested_at": contact.notification_requested_at.isoformat() if contact.notification_requested_at else None,
    }


@router.patch("/contacts/{contact_id}/workflow")
def update_contact_workflow(
    contact_id: uuid.UUID,
    payload: ContactWorkflowUpdate,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_inbox"))],
    db: DBSession,
) -> dict[str, str]:
    contact = db.get(ContactSubmission, contact_id)
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact enquiry not found")
    if payload.assigned_to_id and db.get(User, payload.assigned_to_id) is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Assigned team member not found")
    before = {
        "assigned_to_id": str(contact.assigned_to_id) if contact.assigned_to_id else None,
        "follow_up_at": contact.follow_up_at.isoformat() if contact.follow_up_at else None,
        "internal_notes": contact.internal_notes,
        "response_summary": contact.response_summary,
    }
    contact.assigned_to_id = payload.assigned_to_id
    contact.follow_up_at = payload.follow_up_at
    contact.internal_notes = payload.internal_notes
    contact.response_summary = payload.response_summary
    after = payload.model_dump(mode="json", exclude={"note"})
    if before != after or payload.note:
        add_inbox_activity(db, "contact", contact.id, user.id, "workflow_updated", note=payload.note, details={"before": before, "after": after})
    audit(db, request, user, "cms.contact_workflow_updated", "contact", contact.id, before=before, after=after)
    db.commit()
    return {"status": "saved"}


@router.post("/contacts/{contact_id}/convert-to-rfq", status_code=status.HTTP_201_CREATED)
def convert_contact_to_rfq(
    contact_id: uuid.UUID,
    payload: ContactConvertToRFQ,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_inbox"))],
    db: DBSession,
) -> dict[str, str]:
    contact = db.get(ContactSubmission, contact_id)
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact enquiry not found")
    if contact.converted_rfq_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This enquiry is already linked to an RFQ")
    reference = f"RFQ-{datetime.now(UTC):%Y%m%d}-{secrets.token_hex(3).upper()}"
    rfq = RFQSubmission(
        reference=reference,
        name=contact.name,
        email=contact.email,
        company=payload.company,
        phone=contact.phone,
        service=payload.service,
        location=payload.location,
        budget=payload.budget,
        timeline=payload.timeline,
        scope=contact.message,
        assigned_to_id=contact.assigned_to_id,
        internal_notes=f"Converted from contact enquiry {contact.id}.",
    )
    db.add(rfq)
    db.flush()
    contact.converted_rfq_id = rfq.id
    contact.operational_status = "resolved"
    contact.status = SubmissionStatus.CLOSED
    add_inbox_activity(db, "contact", contact.id, user.id, "converted_to_rfq", note=f"Created {reference}.", details={"rfq_id": str(rfq.id), "reference": reference})
    add_inbox_activity(db, "rfq", rfq.id, user.id, "created_from_contact", note=f"Converted from {contact.name}'s contact enquiry.", details={"contact_id": str(contact.id)})
    audit(db, request, user, "cms.contact_converted_to_rfq", "contact", contact.id, after={"rfq_id": str(rfq.id), "reference": reference})
    db.commit()
    return {"id": str(rfq.id), "reference": reference, "status": "created"}


@router.get("/rfqs/overview")
def rfqs_overview(
    user: Annotated[User, Depends(require_permission("cms.manage_inbox", "cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    operational = dict(db.execute(
        select(RFQSubmission.operational_status, func.count()).group_by(RFQSubmission.operational_status)
    ).all())
    stages = dict(db.execute(
        select(RFQSubmission.commercial_stage, func.count()).group_by(RFQSubmission.commercial_stage)
    ).all())
    services = [value for value in db.scalars(select(RFQSubmission.service).distinct().order_by(RFQSubmission.service)) if value]
    return {"operational": operational, "stages": stages, "services": services, "users": active_team_users(db)}


@router.patch("/rfqs/{rfq_id}/status")
def update_rfq_operational_status(
    rfq_id: uuid.UUID,
    payload: RFQOperationalStatusUpdate,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_inbox"))],
    db: DBSession,
) -> dict[str, Any]:
    rfq = db.get(RFQSubmission, rfq_id)
    if rfq is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")
    before = rfq.operational_status
    rfq.operational_status = payload.status
    rfq.commercial_stage = rfq_stage_for_operational(
        rfq.commercial_stage, payload.status
    )
    rfq.status = {
        "new": SubmissionStatus.NEW,
        "under_review": SubmissionStatus.IN_REVIEW,
        "qualified": SubmissionStatus.QUALIFIED,
        "estimation": SubmissionStatus.QUALIFIED,
        "proposal_ready": SubmissionStatus.QUALIFIED,
        "proposal_sent": SubmissionStatus.QUALIFIED,
        "negotiation": SubmissionStatus.QUALIFIED,
        "won": SubmissionStatus.CLOSED,
        "lost": SubmissionStatus.CLOSED,
    }[rfq.commercial_stage]
    notification_requested = payload.status == "confirmed" and before != "confirmed"
    if notification_requested:
        rfq.notification_status = "awaiting_integration"
        rfq.notification_requested_at = datetime.now(UTC)
    elif payload.status == "pending":
        rfq.notification_status = "not_required"
        rfq.notification_requested_at = None
    add_inbox_activity(db, "rfq", rfq.id, user.id, f"status_{payload.status}", note="RFQ confirmation queued for the future email/SMS integration." if notification_requested else None, details={"before": before, "after": payload.status, "stage": rfq.commercial_stage, "notification_status": rfq.notification_status})
    audit(db, request, user, "cms.rfq_status_updated", "rfq", rfq.id, before={"status": before}, after={"status": payload.status, "stage": rfq.commercial_stage})
    db.commit()
    return {"status": payload.status, "commercial_stage": rfq.commercial_stage, "notification_status": rfq.notification_status, "notification_requested_at": rfq.notification_requested_at.isoformat() if rfq.notification_requested_at else None}


@router.patch("/rfqs/{rfq_id}/workflow")
def update_rfq_workflow(
    rfq_id: uuid.UUID,
    payload: RFQWorkflowUpdate,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_inbox"))],
    db: DBSession,
) -> dict[str, str]:
    rfq = db.get(RFQSubmission, rfq_id)
    if rfq is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")
    if payload.assigned_to_id and db.get(User, payload.assigned_to_id) is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Assigned team member not found")
    before = {
        "commercial_stage": rfq.commercial_stage,
        "assigned_to_id": str(rfq.assigned_to_id) if rfq.assigned_to_id else None,
        "follow_up_at": rfq.follow_up_at.isoformat() if rfq.follow_up_at else None,
        "meeting_at": rfq.meeting_at.isoformat() if rfq.meeting_at else None,
        "qualification": rfq.qualification or {},
        "proposal": rfq.proposal or {},
        "internal_notes": rfq.internal_notes,
    }
    rfq.commercial_stage = payload.commercial_stage
    rfq.assigned_to_id = payload.assigned_to_id
    rfq.follow_up_at = payload.follow_up_at
    rfq.meeting_at = payload.meeting_at
    rfq.internal_notes = payload.internal_notes
    rfq.qualification = payload.qualification.model_dump(mode="json")
    rfq.proposal = payload.proposal.model_dump(mode="json")
    rfq.operational_status = operational_for_rfq_stage(
        rfq.operational_status, payload.commercial_stage
    )
    if payload.commercial_stage in ("qualified", "estimation", "proposal_ready", "proposal_sent", "negotiation"):
        rfq.status = SubmissionStatus.QUALIFIED
    elif payload.commercial_stage in ("won", "lost"):
        rfq.status = SubmissionStatus.CLOSED
    else:
        rfq.status = SubmissionStatus.IN_REVIEW if payload.commercial_stage == "under_review" else SubmissionStatus.NEW
    after = payload.model_dump(mode="json", exclude={"note"})
    if before != after or payload.note:
        add_inbox_activity(db, "rfq", rfq.id, user.id, "workflow_updated", note=payload.note, details={"before": before, "after": after})
    audit(db, request, user, "cms.rfq_workflow_updated", "rfq", rfq.id, before=before, after=after)
    db.commit()
    return {"status": "saved", "commercial_stage": rfq.commercial_stage}


@router.get("/applications/overview")
def applications_overview(
    user: Annotated[User, Depends(require_permission("cms.manage_inbox", "cms.view"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    stages = dict(db.execute(select(RequirementApplication.application_stage, func.count()).group_by(RequirementApplication.application_stage)).all())
    operational = dict(db.execute(select(RequirementApplication.operational_status, func.count()).group_by(RequirementApplication.operational_status)).all())
    requirements = list(db.scalars(select(Requirement).options(selectinload(Requirement.translations)).order_by(Requirement.updated_at.desc())))
    counts = dict(db.execute(select(RequirementApplication.requirement_id, func.count()).group_by(RequirementApplication.requirement_id)).all())
    users = [
        {"id": str(row.id), "name": row.full_name, "email": row.email}
        for row in db.scalars(select(User).where(User.is_active.is_(True)).order_by(User.full_name))
    ]
    return {
        "stages": {str(key): value for key, value in stages.items()},
        "operational": {str(key): value for key, value in operational.items()},
        "requirements": [
            {
                "id": str(row.id),
                "code": row.code,
                "position": translation_for(row, "en").position if translation_for(row, "en") else row.code,
                "project_name": row.project_name,
                "status": enum_value(row.status),
                "applications": counts.get(row.id, 0),
            }
            for row in requirements
        ],
        "users": users,
    }


@router.patch("/applications/{application_id}/workflow")
def update_application_workflow(
    application_id: uuid.UUID,
    payload: ApplicationWorkflowUpdate,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_inbox"))],
    db: DBSession,
) -> dict[str, Any]:
    application = db.get(RequirementApplication, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if payload.assigned_to_id and db.get(User, payload.assigned_to_id) is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Assigned team member not found")
    before = {
        "stage": application.application_stage,
        "assigned_to_id": str(application.assigned_to_id) if application.assigned_to_id else None,
        "follow_up_at": application.follow_up_at.isoformat() if application.follow_up_at else None,
        "interview_at": application.interview_at.isoformat() if application.interview_at else None,
        "documents": application.documents or [],
    }
    application.application_stage = payload.stage
    application.operational_status = operational_for_application_stage(
        application.operational_status, payload.stage
    )
    application.status = {
        "new": SubmissionStatus.NEW,
        "under_review": SubmissionStatus.IN_REVIEW,
        "shortlisted": SubmissionStatus.QUALIFIED,
        "contacted": SubmissionStatus.CONTACTED,
        "interview": SubmissionStatus.IN_REVIEW,
        "documents_pending": SubmissionStatus.IN_REVIEW,
        "selected": SubmissionStatus.QUALIFIED,
        "hired": SubmissionStatus.CLOSED,
        "on_hold": SubmissionStatus.IN_REVIEW,
        "rejected": SubmissionStatus.CLOSED,
        "withdrawn": SubmissionStatus.CLOSED,
    }[payload.stage]
    application.internal_notes = payload.internal_notes
    application.assigned_to_id = payload.assigned_to_id
    application.follow_up_at = payload.follow_up_at
    application.interview_at = payload.interview_at
    application.documents = [entry.model_dump() for entry in payload.documents]
    after = payload.model_dump(mode="json", exclude={"note"})
    if before != after or payload.note:
        db.add(ApplicationActivity(
            application_id=application.id,
            actor_id=user.id,
            action="workflow_updated",
            note=payload.note,
            details={"before": before, "after": after},
        ))
    audit(db, request, user, "cms.application_workflow_updated", "applications", application.id, before=before, after=after)
    db.commit()
    return {"status": "saved", "stage": application.application_stage}


@router.patch("/applications/{application_id}/status")
def update_application_operational_status(
    application_id: uuid.UUID,
    payload: ApplicationOperationalStatusUpdate,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_inbox"))],
    db: DBSession,
) -> dict[str, Any]:
    application = db.get(RequirementApplication, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    before = application.operational_status
    application.operational_status = payload.status
    application.application_stage = application_stage_for_operational(
        application.application_stage, payload.status
    )
    application.status = {
        "new": SubmissionStatus.NEW,
        "under_review": SubmissionStatus.IN_REVIEW,
        "shortlisted": SubmissionStatus.QUALIFIED,
        "contacted": SubmissionStatus.CONTACTED,
        "interview": SubmissionStatus.IN_REVIEW,
        "documents_pending": SubmissionStatus.IN_REVIEW,
        "selected": SubmissionStatus.QUALIFIED,
        "hired": SubmissionStatus.CLOSED,
        "on_hold": SubmissionStatus.IN_REVIEW,
        "rejected": SubmissionStatus.CLOSED,
        "withdrawn": SubmissionStatus.CLOSED,
    }[application.application_stage]
    notification_requested = payload.status == "confirmed" and before != "confirmed"
    if notification_requested:
        application.notification_status = "awaiting_integration"
        application.notification_requested_at = datetime.now(UTC)
    elif payload.status == "pending":
        application.notification_status = "not_required"
        application.notification_requested_at = None
    db.add(ApplicationActivity(
        application_id=application.id,
        actor_id=user.id,
        action=f"status_{payload.status}",
        note=(
            "Confirmation notification queued for the future SMS/email integration."
            if notification_requested else None
        ),
        details={"before": before, "after": payload.status, "notification_status": application.notification_status},
    ))
    audit(
        db,
        request,
        user,
        "cms.application_status_updated",
        "applications",
        application.id,
        before={"status": before},
        after={"status": payload.status, "notification_status": application.notification_status},
    )
    db.commit()
    return {
        "status": payload.status,
        "stage": application.application_stage,
        "notification_status": application.notification_status,
        "notification_requested_at": application.notification_requested_at.isoformat() if application.notification_requested_at else None,
    }


@router.post("/applications/{application_id}/notes", status_code=status.HTTP_201_CREATED)
def add_application_note(
    application_id: uuid.UUID,
    payload: ApplicationNoteCreate,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_inbox"))],
    db: DBSession,
) -> dict[str, Any]:
    application = db.get(RequirementApplication, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    activity = ApplicationActivity(application_id=application.id, actor_id=user.id, action="note_added", note=payload.note, details={})
    db.add(activity)
    audit(db, request, user, "cms.application_note_added", "applications", application.id, after={"note": payload.note})
    db.commit()
    db.refresh(activity)
    return {"id": str(activity.id), "status": "created", "created_at": activity.created_at.isoformat()}


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
    items = [
        serialize_media(item)
        for item in db.scalars(statement)
        if stored_file_exists(item.storage_key)
    ]
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
    try:
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
    except Exception:
        db.rollback()
        delete_stored_file(storage_key)
        raise
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


TEAM_ROLE_NAMES = {"super_admin", "admin", "editor"}


def team_role_label(name: str) -> str:
    return {
        "super_admin": "Super Admin / Developer",
        "admin": "Admin",
        "editor": "Editor",
    }.get(name, name.replace("_", " ").title())


def is_super_admin(user: User) -> bool:
    return any(role.name == "super_admin" for role in user.roles)


def ensure_team_management_scope(
    actor: User, *, target_role: str | None = None, target_user: User | None = None
) -> None:
    """Keep Super Admin identities and privileges outside an Admin's scope."""
    if is_super_admin(actor):
        return
    target_is_super_admin = target_user is not None and is_super_admin(target_user)
    if target_role == "super_admin" or target_is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a Super Admin / Developer can manage Super Admin accounts",
        )


def revoke_user_sessions(db: Session, user_id: uuid.UUID) -> int:
    now = datetime.now(UTC)
    tokens = list(
        db.scalars(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
        )
    )
    for token in tokens:
        token.revoked_at = now
    return len(tokens)


def active_super_admin_count(db: Session) -> int:
    return db.scalar(
        select(func.count(User.id))
        .join(User.roles)
        .where(
            Role.name == "super_admin",
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        )
    ) or 0


def ensure_super_admin_remains(
    db: Session, item: User, *, final_role: str, final_active: bool, deleting: bool = False
) -> None:
    is_super = any(role.name == "super_admin" for role in item.roles)
    if (
        is_super
        and (final_role != "super_admin" or not final_active or deleting)
        and active_super_admin_count(db) <= 1
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="At least one active Super Admin / Developer account is required",
        )


def serialize_team_user(item: User, active_sessions: int = 0) -> dict[str, Any]:
    role_names = [role.name for role in item.roles]
    status_name = "deleted" if item.deleted_at else (
        "suspended" if not item.is_active else (
            "password_change_required" if item.must_change_password else "active"
        )
    )
    return {
        "id": str(item.id),
        "email": item.email,
        "full_name": item.full_name,
        "roles": role_names,
        "role_label": team_role_label(role_names[0]) if role_names else "No role",
        "permissions": sorted(
            {permission.code for role in item.roles for permission in role.permissions}
        ),
        "status": status_name,
        "is_active": item.is_active,
        "must_change_password": item.must_change_password,
        "last_login_at": item.last_login_at.isoformat() if item.last_login_at else None,
        "password_changed_at": (
            item.password_changed_at.isoformat() if item.password_changed_at else None
        ),
        "suspended_at": item.suspended_at.isoformat() if item.suspended_at else None,
        "created_at": item.created_at.isoformat(),
        "deleted_at": item.deleted_at.isoformat() if item.deleted_at else None,
        "active_sessions": active_sessions,
    }


@router.get("/roles")
def list_roles(
    user: Annotated[User, Depends(require_permission("cms.manage_users"))],
    db: DBSession,
) -> dict[str, Any]:
    roles = list(
        db.scalars(
            select(Role)
            .options(selectinload(Role.permissions))
            .where(Role.name.in_(TEAM_ROLE_NAMES))
        )
    )
    order = {"super_admin": 0, "admin": 1, "editor": 2}
    if not is_super_admin(user):
        roles = [role for role in roles if role.name != "super_admin"]
    return {
        "items": [
            {
                "id": str(role.id),
                "name": role.name,
                "label": team_role_label(role.name),
                "description": role.description,
                "permissions": sorted(permission.code for permission in role.permissions),
            }
            for role in sorted(roles, key=lambda role: order.get(role.name, 99))
        ]
    }


@router.get("/users")
def list_users(
    user: Annotated[User, Depends(require_permission("cms.manage_users"))],
    db: DBSession,
) -> dict[str, Any]:
    statement = (
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .order_by(User.created_at.desc())
    )
    if not is_super_admin(user):
        statement = statement.where(~User.roles.any(Role.name == "super_admin"))
    users = list(db.scalars(statement))
    session_counts = dict(
        db.execute(
            select(RefreshToken.user_id, func.count(RefreshToken.id))
            .where(
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > datetime.now(UTC),
            )
            .group_by(RefreshToken.user_id)
        ).all()
    )
    items = [serialize_team_user(item, session_counts.get(item.id, 0)) for item in users]
    return {
        "items": items,
        "summary": {
            "total": len([item for item in users if item.deleted_at is None]),
            "active": len([item for item in users if item.deleted_at is None and item.is_active]),
            "suspended": len([item for item in users if item.deleted_at is None and not item.is_active]),
            "super_admins": len([
                item for item in users
                if item.deleted_at is None
                and any(role.name == "super_admin" for role in item.roles)
            ]),
        },
    }


@router.get("/users/{item_id}")
def get_user_detail(
    item_id: uuid.UUID,
    user: Annotated[User, Depends(require_permission("cms.manage_users"))],
    db: DBSession,
) -> dict[str, Any]:
    _ = user
    item = db.scalar(
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.id == item_id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    ensure_team_management_scope(user, target_user=item)
    now = datetime.now(UTC)
    sessions = list(
        db.scalars(
            select(RefreshToken)
            .where(
                RefreshToken.user_id == item.id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now,
            )
            .order_by(RefreshToken.created_at.desc())
        )
    )
    activity = list(
        db.scalars(
            select(AuditLog)
            .where(or_(AuditLog.actor_id == item.id, AuditLog.entity_id == item.id))
            .order_by(AuditLog.created_at.desc())
            .limit(80)
        )
    )
    actor_ids = {entry.actor_id for entry in activity if entry.actor_id}
    actor_names = {
        actor.id: actor.full_name
        for actor in db.scalars(select(User).where(User.id.in_(actor_ids)))
    } if actor_ids else {}
    payload = serialize_team_user(item, len(sessions))
    payload["sessions"] = [
        {
            "id": str(session.id),
            "created_at": session.created_at.isoformat(),
            "expires_at": session.expires_at.isoformat(),
            "ip_address": str(session.ip_address) if session.ip_address else None,
            "user_agent": session.user_agent,
        }
        for session in sessions
    ]
    payload["activity"] = [
        {
            "id": str(entry.id),
            "action": entry.action,
            "entity_type": entry.entity_type,
            "actor_name": actor_names.get(entry.actor_id, "System"),
            "created_at": entry.created_at.isoformat(),
            "before": entry.before,
            "after": entry.after,
        }
        for entry in activity
    ]
    return payload


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_users"))],
    db: DBSession,
) -> dict[str, Any]:
    existing = db.scalar(
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.email == payload.email.lower())
    )
    if existing is not None and existing.deleted_at is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if payload.role not in TEAM_ROLE_NAMES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown role")
    ensure_team_management_scope(user, target_role=payload.role)
    role = db.scalar(select(Role).where(Role.name == payload.role))
    if role is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown role")

    item = existing or User(email=payload.email.lower())
    item.password_hash = hash_password(payload.password)
    item.full_name = payload.full_name
    item.is_active = payload.is_active
    item.is_verified = True
    item.must_change_password = False
    item.password_changed_at = datetime.now(UTC)
    item.suspended_at = None if payload.is_active else datetime.now(UTC)
    item.created_by_id = user.id
    item.deleted_at = None
    item.roles = [role]
    if existing is not None:
        revoke_user_sessions(db, item.id)
    db.add(item)
    db.flush()
    audit(
        db, request, user, "cms.user_created", "users", item.id,
        after={"email": item.email, "role": role.name, "is_active": item.is_active, "password_policy": "admin_set_permanent"},
    )
    db.commit()
    db.refresh(item)
    return serialize_team_user(item)


@router.patch("/users/{item_id}")
def update_user(
    item_id: uuid.UUID,
    payload: UserUpdate,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_users"))],
    db: DBSession,
) -> dict[str, Any]:
    item = db.scalar(
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.id == item_id)
    )
    if item is None or item.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    current_role = item.roles[0].name if item.roles else "editor"
    final_role = payload.role or current_role
    final_active = payload.is_active if payload.is_active is not None else item.is_active
    if final_role not in TEAM_ROLE_NAMES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown role")
    ensure_team_management_scope(user, target_role=final_role, target_user=item)
    if item.id == user.id and (not final_active or final_role != current_role):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role or suspend your own account",
        )
    ensure_super_admin_remains(
        db, item, final_role=final_role, final_active=final_active
    )
    before = {
        "full_name": item.full_name,
        "role": current_role,
        "is_active": item.is_active,
    }
    if payload.full_name is not None:
        item.full_name = payload.full_name
    if payload.is_active is not None:
        item.is_active = payload.is_active
        item.suspended_at = None if payload.is_active else datetime.now(UTC)
    if payload.role is not None and payload.role != current_role:
        role = db.scalar(select(Role).where(Role.name == payload.role))
        if role is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown role")
        item.roles = [role]
    if payload.is_active is not None or payload.role is not None:
        revoke_user_sessions(db, item.id)
    after = {
        "full_name": item.full_name,
        "role": final_role,
        "is_active": item.is_active,
    }
    audit(db, request, user, "cms.user_updated", "users", item.id, before=before, after=after)
    db.commit()
    return serialize_team_user(item)


@router.post("/users/{item_id}/reset-password")
def reset_user_password(
    item_id: uuid.UUID,
    payload: UserPasswordReset,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_security"))],
    db: DBSession,
) -> dict[str, Any]:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your password is incorrect")
    if item_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use your own password-change screen to change your password",
        )
    item = db.scalar(
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.id == item_id, User.deleted_at.is_(None))
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    ensure_team_management_scope(user, target_user=item)
    if verify_password(payload.new_password, item.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different")
    item.password_hash = hash_password(payload.new_password)
    item.must_change_password = payload.require_password_change
    item.password_changed_at = None if payload.require_password_change else datetime.now(UTC)
    revoked = revoke_user_sessions(db, item.id)
    audit(
        db, request, user, "cms.user_password_reset", "users", item.id,
        after={"require_password_change": payload.require_password_change, "sessions_revoked": revoked},
    )
    db.commit()
    return {"ok": True, "sessions_revoked": revoked}


@router.post("/users/{item_id}/revoke-sessions")
def revoke_sessions(
    item_id: uuid.UUID,
    payload: SensitiveActionRequest,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_security"))],
    db: DBSession,
) -> dict[str, Any]:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your password is incorrect")
    item = db.get(User, item_id)
    if item is None or item.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    ensure_team_management_scope(user, target_user=item)
    revoked = revoke_user_sessions(db, item.id)
    audit(
        db, request, user, "cms.user_sessions_revoked", "users", item.id,
        after={"sessions_revoked": revoked},
    )
    db.commit()
    return {"ok": True, "sessions_revoked": revoked}


@router.delete("/users/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    item_id: uuid.UUID,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_users"))],
    db: DBSession,
) -> None:
    item = db.scalar(select(User).options(selectinload(User.roles)).where(User.id == item_id))
    if item is None or item.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    ensure_team_management_scope(user, target_user=item)
    if item.id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )
    current_role = item.roles[0].name if item.roles else "editor"
    ensure_super_admin_remains(
        db, item, final_role=current_role, final_active=False, deleting=True
    )
    before = {"email": item.email, "role": current_role, "is_active": item.is_active}
    item.deleted_at = datetime.now(UTC)
    item.is_active = False
    item.suspended_at = item.deleted_at
    revoke_user_sessions(db, item.id)
    audit(db, request, user, "cms.user_deleted", "users", item.id, before=before)
    db.commit()


@router.post("/users/{item_id}/restore")
def restore_user(
    item_id: uuid.UUID,
    request: Request,
    user: Annotated[User, Depends(require_permission("cms.manage_users"))],
    db: DBSession,
) -> dict[str, Any]:
    item = db.scalar(
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.id == item_id)
    )
    if item is None or item.deleted_at is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deleted user not found")
    ensure_team_management_scope(user, target_user=item)
    item.deleted_at = None
    item.is_active = False
    item.suspended_at = datetime.now(UTC)
    item.must_change_password = True
    revoke_user_sessions(db, item.id)
    audit(
        db, request, user, "cms.user_restored", "users", item.id,
        after={"is_active": False, "must_change_password": True},
    )
    db.commit()
    return serialize_team_user(item)
