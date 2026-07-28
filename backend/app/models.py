import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PublishStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class SubmissionStatus(StrEnum):
    NEW = "new"
    IN_REVIEW = "in_review"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    CLOSED = "closed"
    SPAM = "spam"


class RequirementStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    URGENT = "urgent"
    CLOSED = "closed"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class UUIDMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )


user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "permission_id",
        UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str]
    full_name: Mapped[str] = mapped_column(String(160))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    roles: Mapped[list["Role"]] = relationship(secondary=user_roles, back_populates="users")


class Role(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(80), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    users: Mapped[list[User]] = relationship(secondary=user_roles, back_populates="roles")
    permissions: Mapped[list["Permission"]] = relationship(
        secondary=role_permissions, back_populates="roles"
    )


class Permission(UUIDMixin, Base):
    __tablename__ = "permissions"

    code: Mapped[str] = mapped_column(String(120), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    roles: Mapped[list[Role]] = relationship(
        secondary=role_permissions, back_populates="permissions"
    )


class RefreshToken(UUIDMixin, Base):
    __tablename__ = "refresh_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ip_address: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(Text)


class MediaAsset(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "media_assets"

    storage_key: Mapped[str] = mapped_column(String(500), unique=True)
    public_url: Mapped[str] = mapped_column(String(1000))
    file_name: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(150))
    size_bytes: Mapped[int] = mapped_column(Integer)
    width: Mapped[int | None]
    height: Mapped[int | None]
    alt_text: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict)
    folder: Mapped[str | None] = mapped_column(String(255), index=True)
    uploaded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )


class SiteSetting(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "site_settings"
    __table_args__ = (UniqueConstraint("group_name", "key", name="uq_site_settings_group_key"),)

    group_name: Mapped[str] = mapped_column(String(80), index=True)
    key: Mapped[str] = mapped_column(String(120))
    value: Mapped[Any] = mapped_column(JSONB)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)


class Page(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "pages"

    slug: Mapped[str] = mapped_column(String(180), unique=True)
    template: Mapped[str] = mapped_column(String(80), default="standard")
    status: Mapped[PublishStatus] = mapped_column(
        Enum(PublishStatus, name="publish_status", values_callable=lambda e: [x.value for x in e]),
        default=PublishStatus.DRAFT,
    )
    sections: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    translations: Mapped[list["PageTranslation"]] = relationship(
        back_populates="page", cascade="all, delete-orphan"
    )


class PageTranslation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "page_translations"
    __table_args__ = (UniqueConstraint("page_id", "locale", name="uq_page_translation_locale"),)

    page_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pages.id", ondelete="CASCADE"))
    locale: Mapped[str] = mapped_column(String(10))
    title: Mapped[str] = mapped_column(String(255))
    meta_title: Mapped[str | None] = mapped_column(String(255))
    meta_description: Mapped[str | None] = mapped_column(Text)
    content: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    page: Mapped[Page] = relationship(back_populates="translations")


class NavigationItem(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "navigation_items"

    location: Mapped[str] = mapped_column(String(40), index=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("navigation_items.id", ondelete="CASCADE")
    )
    label: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict)
    url: Mapped[str] = mapped_column(String(500))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)


class Service(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "services"

    slug: Mapped[str] = mapped_column(String(180), unique=True)
    number: Mapped[str | None] = mapped_column(String(20))
    icon: Mapped[str | None] = mapped_column(String(80))
    hero_media_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("media_assets.id", ondelete="SET NULL")
    )
    status: Mapped[PublishStatus] = mapped_column(
        Enum(
            PublishStatus,
            name="publish_status",
            create_type=False,
            values_callable=lambda e: [x.value for x in e],
        ),
        default=PublishStatus.DRAFT,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    stats: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    capabilities: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    process: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    certifications: Mapped[list[str]] = mapped_column(JSONB, default=list)
    translations: Mapped[list["ServiceTranslation"]] = relationship(
        back_populates="service", cascade="all, delete-orphan"
    )


class ServiceTranslation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "service_translations"
    __table_args__ = (UniqueConstraint("service_id", "locale", name="uq_service_translation_locale"),)

    service_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"))
    locale: Mapped[str] = mapped_column(String(10))
    title: Mapped[str] = mapped_column(String(255))
    eyebrow: Mapped[str | None] = mapped_column(String(255))
    tagline: Mapped[str | None] = mapped_column(Text)
    lead: Mapped[str | None] = mapped_column(Text)
    intro: Mapped[str | None] = mapped_column(Text)
    meta_title: Mapped[str | None] = mapped_column(String(255))
    meta_description: Mapped[str | None] = mapped_column(Text)
    sub_services: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    faqs: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)
    service: Mapped[Service] = relationship(back_populates="translations")


class Project(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    slug: Mapped[str] = mapped_column(String(180), unique=True)
    client_name: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255))
    started_on: Mapped[date | None] = mapped_column(Date)
    completed_on: Mapped[date | None] = mapped_column(Date)
    status: Mapped[PublishStatus] = mapped_column(
        Enum(
            PublishStatus,
            name="publish_status",
            create_type=False,
            values_callable=lambda e: [x.value for x in e],
        ),
        default=PublishStatus.DRAFT,
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    featured_media_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("media_assets.id", ondelete="SET NULL")
    )
    facts: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    translations: Mapped[list["ProjectTranslation"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class ProjectTranslation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "project_translations"
    __table_args__ = (UniqueConstraint("project_id", "locale", name="uq_project_translation_locale"),)

    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    locale: Mapped[str] = mapped_column(String(10))
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str | None] = mapped_column(Text)
    scope: Mapped[str | None] = mapped_column(Text)
    body: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    meta_title: Mapped[str | None] = mapped_column(String(255))
    meta_description: Mapped[str | None] = mapped_column(Text)
    project: Mapped[Project] = relationship(back_populates="translations")


class ProjectMedia(UUIDMixin, Base):
    __tablename__ = "project_media"
    __table_args__ = (UniqueConstraint("project_id", "media_id", name="uq_project_media"),)

    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    media_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("media_assets.id", ondelete="CASCADE"))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Category(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "categories"

    slug: Mapped[str] = mapped_column(String(180), unique=True)
    name: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict)


class Tag(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "tags"

    slug: Mapped[str] = mapped_column(String(180), unique=True)
    name: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict)


class Post(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "posts"

    slug: Mapped[str] = mapped_column(String(180), unique=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), index=True
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    featured_media_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("media_assets.id", ondelete="SET NULL")
    )
    status: Mapped[PublishStatus] = mapped_column(
        Enum(
            PublishStatus,
            name="publish_status",
            create_type=False,
            values_callable=lambda e: [x.value for x in e],
        ),
        default=PublishStatus.DRAFT,
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    tags: Mapped[list[Tag]] = relationship(secondary=post_tags)
    translations: Mapped[list["PostTranslation"]] = relationship(
        back_populates="post", cascade="all, delete-orphan"
    )


class PostTranslation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "post_translations"
    __table_args__ = (UniqueConstraint("post_id", "locale", name="uq_post_translation_locale"),)

    post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"))
    locale: Mapped[str] = mapped_column(String(10))
    title: Mapped[str] = mapped_column(String(255))
    excerpt: Mapped[str | None] = mapped_column(Text)
    body: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    meta_title: Mapped[str | None] = mapped_column(String(255))
    meta_description: Mapped[str | None] = mapped_column(Text)
    post: Mapped[Post] = relationship(back_populates="translations")


class Requirement(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "requirements"

    code: Mapped[str] = mapped_column(String(80), unique=True)
    status: Mapped[RequirementStatus] = mapped_column(
        Enum(
            RequirementStatus,
            name="requirement_status",
            values_callable=lambda e: [x.value for x in e],
        ),
        default=RequirementStatus.DRAFT,
    )
    headcount: Mapped[int] = mapped_column(Integer)
    rate_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    rate_currency: Mapped[str] = mapped_column(String(3), default="SAR")
    rate_unit: Mapped[str | None] = mapped_column(String(40))
    location: Mapped[str | None] = mapped_column(String(255))
    project_name: Mapped[str | None] = mapped_column(String(255))
    opens_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    translations: Mapped[list["RequirementTranslation"]] = relationship(
        back_populates="requirement", cascade="all, delete-orphan"
    )
    contacts: Mapped[list["RequirementContact"]] = relationship(
        back_populates="requirement", cascade="all, delete-orphan"
    )


class RequirementTranslation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "requirement_translations"
    __table_args__ = (
        UniqueConstraint("requirement_id", "locale", name="uq_requirement_translation_locale"),
    )

    requirement_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("requirements.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(10))
    position: Mapped[str] = mapped_column(String(255))
    approval: Mapped[str | None] = mapped_column(String(255))
    duration: Mapped[str | None] = mapped_column(String(120))
    salary_cycle: Mapped[str | None] = mapped_column(String(120))
    food: Mapped[str | None] = mapped_column(String(255))
    accommodation: Mapped[str | None] = mapped_column(String(255))
    documents: Mapped[list[str]] = mapped_column(JSONB, default=list)
    description: Mapped[str | None] = mapped_column(Text)
    requirement: Mapped[Requirement] = relationship(back_populates="translations")


class RequirementContact(UUIDMixin, Base):
    __tablename__ = "requirement_contacts"

    requirement_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("requirements.id", ondelete="CASCADE"), index=True
    )
    display_phone: Mapped[str] = mapped_column(String(40))
    phone_e164: Mapped[str] = mapped_column(String(20))
    has_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    requirement: Mapped[Requirement] = relationship(back_populates="contacts")


class ContactSubmission(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "contact_submissions"

    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(320), index=True)
    company: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(40))
    subject: Mapped[str | None] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(
            SubmissionStatus,
            name="submission_status",
            values_callable=lambda e: [x.value for x in e],
        ),
        default=SubmissionStatus.NEW,
        index=True,
    )
    source: Mapped[str] = mapped_column(String(80), default="website")
    locale: Mapped[str] = mapped_column(String(10), default="en")
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    internal_notes: Mapped[str | None] = mapped_column(Text)
    ip_address: Mapped[str | None] = mapped_column(INET)


class RFQSubmission(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "rfq_submissions"

    reference: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(320), index=True)
    company: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(40))
    service: Mapped[str] = mapped_column(String(180))
    location: Mapped[str | None] = mapped_column(String(255))
    budget: Mapped[str | None] = mapped_column(String(120))
    timeline: Mapped[str | None] = mapped_column(String(120))
    scope: Mapped[str] = mapped_column(Text)
    attachments: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(
            SubmissionStatus,
            name="submission_status",
            create_type=False,
            values_callable=lambda e: [x.value for x in e],
        ),
        default=SubmissionStatus.NEW,
        index=True,
    )
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    internal_notes: Mapped[str | None] = mapped_column(Text)


class RequirementApplication(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "requirement_applications"

    requirement_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("requirements.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str | None] = mapped_column(String(320), index=True)
    phone: Mapped[str] = mapped_column(String(40))
    nationality: Mapped[str | None] = mapped_column(String(120))
    iqama_number: Mapped[str | None] = mapped_column(String(40))
    years_experience: Mapped[int | None]
    message: Mapped[str | None] = mapped_column(Text)
    resume_media_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("media_assets.id", ondelete="SET NULL")
    )
    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(
            SubmissionStatus,
            name="submission_status",
            create_type=False,
            values_callable=lambda e: [x.value for x in e],
        ),
        default=SubmissionStatus.NEW,
        index=True,
    )
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )


class NewsletterSubscriber(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "newsletter_subscribers"

    email: Mapped[str] = mapped_column(String(320), unique=True)
    locale: Mapped[str] = mapped_column(String(10), default="en")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    subscribed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    unsubscribed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    consent_ip: Mapped[str | None] = mapped_column(INET)


class AuditLog(UUIDMixin, Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_created_at", "created_at"),
    )

    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(80))
    entity_type: Mapped[str] = mapped_column(String(120))
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    before: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    after: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    ip_address: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
