import uuid
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models import (
    AuditLog,
    ContactSubmission,
    MediaAsset,
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
    RequirementStatus,
    RequirementTranslation,
    RFQSubmission,
    Service,
    ServiceTranslation,
    SiteSetting,
    SubmissionStatus,
    User,
)
from app.schemas.cms import (
    ContentItem,
    ContentListResponse,
    ContentUpsert,
    SettingUpsert,
    SubmissionStatusUpdate,
)

router = APIRouter(prefix="/cms")
DBSession = Annotated[Session, Depends(get_db)]
ResourceName = Literal["pages", "services", "projects", "posts", "requirements"]
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


def serialize_content(resource: str, item: Any, locale: str) -> ContentItem:
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
        extra={
            "location": getattr(item, "location", None),
            "headcount": getattr(item, "headcount", None),
            "project_name": getattr(item, "project_name", None),
        },
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
            "intro": payload.body.get("intro"),
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


@router.get("/overview")
def overview(user: CurrentUser, db: DBSession) -> dict[str, Any]:
    _ = user
    counts = {
        "pages": db.scalar(select(func.count()).select_from(Page)) or 0,
        "services": db.scalar(select(func.count()).select_from(Service)) or 0,
        "projects": db.scalar(select(func.count()).select_from(Project)) or 0,
        "posts": db.scalar(select(func.count()).select_from(Post)) or 0,
        "requirements": db.scalar(select(func.count()).select_from(Requirement)) or 0,
        "media": db.scalar(select(func.count()).select_from(MediaAsset)) or 0,
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


@router.get("/content/{resource}", response_model=ContentListResponse)
def list_content(
    resource: ResourceName,
    user: CurrentUser,
    db: DBSession,
    locale: Annotated[str, Query(pattern="^(en|ar)$")] = "en",
    search: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> ContentListResponse:
    _ = user
    config = RESOURCE_CONFIG[resource]
    model = config["model"]
    statement = (
        select(model)
        .options(selectinload(model.translations))
        .order_by(model.updated_at.desc())
        .limit(limit)
    )
    items = list(db.scalars(statement))
    serialized = [serialize_content(resource, item, locale) for item in items]
    if search:
        needle = search.casefold()
        serialized = [
            item
            for item in serialized
            if needle in item.title.casefold() or needle in item.slug.casefold()
        ]
    return ContentListResponse(items=serialized, total=len(serialized))


@router.post(
    "/content/{resource}",
    response_model=ContentItem,
    status_code=status.HTTP_201_CREATED,
)
def create_content(
    resource: ResourceName,
    payload: ContentUpsert,
    request: Request,
    user: CurrentUser,
    db: DBSession,
) -> ContentItem:
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
        item = model(**model_values)

    db.add(item)
    db.flush()
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
    db.refresh(item)
    item = db.scalar(
        select(model)
        .options(selectinload(model.translations))
        .where(model.id == item.id)
    )
    return serialize_content(resource, item, payload.locale)


@router.patch("/content/{resource}/{item_id}", response_model=ContentItem)
def update_content(
    resource: ResourceName,
    item_id: uuid.UUID,
    payload: ContentUpsert,
    request: Request,
    user: CurrentUser,
    db: DBSession,
) -> ContentItem:
    config = RESOURCE_CONFIG[resource]
    model = config["model"]
    item = db.scalar(
        select(model)
        .options(selectinload(model.translations))
        .where(model.id == item_id)
    )
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
    user: CurrentUser,
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
    user: CurrentUser,
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
    user: CurrentUser,
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
def list_settings(user: CurrentUser, db: DBSession) -> dict[str, Any]:
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
    user: CurrentUser,
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


@router.get("/users")
def list_users(user: CurrentUser, db: DBSession) -> dict[str, Any]:
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
        ]
    }
