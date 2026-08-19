import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, EmailStr, Field, field_validator

ContentStatus = Literal["draft", "published", "archived", "active", "urgent", "closed"]
ApplicationStage = Literal[
    "new", "under_review", "shortlisted", "contacted", "interview",
    "documents_pending", "selected", "hired", "on_hold", "rejected", "withdrawn",
]


class RequirementContactInput(BaseModel):
    display: str = Field(min_length=3, max_length=80)
    raw: str = Field(pattern=r"^\+?[0-9]{7,18}$")
    whatsapp: bool = True


class ContentUpsert(BaseModel):
    slug: str | None = Field(default=None, min_length=2, max_length=180)
    code: str | None = Field(default=None, min_length=2, max_length=80)
    locale: str = Field(default="en", pattern="^(en|ar)$")
    title: str = Field(min_length=2, max_length=255)
    summary: str | None = None
    body: dict[str, Any] = Field(default_factory=dict)
    status: ContentStatus = "draft"
    is_featured: bool = False
    number: str | None = Field(default=None, max_length=20)
    icon: str | None = Field(default=None, max_length=80)
    headcount: int | None = Field(default=None, ge=1, le=100000)
    location: str | None = Field(default=None, max_length=255)
    project_name: str | None = Field(default=None, max_length=255)
    client_name: str | None = Field(default=None, max_length=255)
    started_on: date | None = None
    completed_on: date | None = None
    rate_amount: Decimal | None = Field(default=None, ge=0)
    rate_currency: str = Field(default="SAR", min_length=3, max_length=3)
    rate_unit: str | None = Field(default=None, max_length=40)
    opens_at: datetime | None = None
    closes_at: datetime | None = None
    contacts: list[RequirementContactInput] = Field(default_factory=list)
    sort_order: int = Field(default=0, ge=0)
    stats: list[dict[str, Any]] = Field(default_factory=list)
    capabilities: list[dict[str, Any]] = Field(default_factory=list)
    process: list[dict[str, Any]] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    facts: dict[str, Any] = Field(default_factory=dict)
    meta_title: str | None = Field(default=None, max_length=255)
    meta_description: str | None = None
    category_id: uuid.UUID | None = None
    tag_ids: list[uuid.UUID] = Field(default_factory=list)
    featured_media_id: uuid.UUID | None = None
    hero_media_id: uuid.UUID | None = None


class ContentItem(BaseModel):
    id: uuid.UUID
    resource: str
    slug: str
    title: str
    locale: str
    status: str
    summary: str | None
    is_featured: bool
    updated_at: datetime
    extra: dict[str, Any] = Field(default_factory=dict)


class ContentDetail(ContentItem):
    body: dict[str, Any] = Field(default_factory=dict)
    meta_title: str | None = None
    meta_description: str | None = None


class ProjectEditorPayload(BaseModel):
    slug: str = Field(min_length=2, max_length=180, pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=2, max_length=255)
    summary: str = Field(default="", max_length=1200)
    is_featured: bool = False
    sort_order: int = Field(default=0, ge=0, le=999)
    thumbnail_media_id: uuid.UUID | None = None
    hero_media_id: uuid.UUID | None = None
    sector: str = Field(default="", max_length=120)
    client_name: str = Field(default="", max_length=255)
    location: str = Field(default="", max_length=255)
    value: str = Field(default="", max_length=160)
    duration: str = Field(default="", max_length=160)
    started_on: date | None = None
    completed_on: date | None = None
    overview: list[str] = Field(default_factory=lambda: ["", ""], min_length=2, max_length=2)
    highlights: list[str] = Field(
        default_factory=lambda: ["", "", "", ""], min_length=4, max_length=4
    )
    meta_title: str = Field(default="", max_length=255)
    meta_description: str = Field(default="", max_length=320)


class ProjectCreateRequest(BaseModel):
    """Creates the blank workspace that is completed in the project editor."""

    is_featured: bool = False


class ServiceEditorPayload(BaseModel):
    slug: str = Field(min_length=2, max_length=180, pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=2, max_length=255)
    summary: str = Field(default="", max_length=1200)
    number: str = Field(default="", max_length=20)
    icon: str = Field(default="BriefcaseBusiness", max_length=80)
    sort_order: int = Field(default=0, ge=0, le=999)
    hero_media_id: uuid.UUID | None = None
    eyebrow: str = Field(default="", max_length=255)
    lead: str = Field(default="", max_length=3000)
    intro: str = Field(default="", max_length=6000)
    stats: list[dict[str, Any]] = Field(default_factory=list, min_length=4, max_length=4)
    sub_services: list[dict[str, str]] = Field(default_factory=list, min_length=6, max_length=6)
    capabilities: list[dict[str, str]] = Field(default_factory=list, min_length=6, max_length=6)
    portfolio: list[dict[str, str]] = Field(default_factory=list, min_length=3, max_length=3)
    process: list[dict[str, str]] = Field(default_factory=list, min_length=4, max_length=4)
    certifications: list[str] = Field(default_factory=list, min_length=5, max_length=5)
    faqs: list[dict[str, str]] = Field(default_factory=list, max_length=5)
    meta_title: str = Field(default="", max_length=255)
    meta_description: str = Field(default="", max_length=320)


class PostEditorPayload(BaseModel):
    slug: str = Field(min_length=2, max_length=180, pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=2, max_length=255)
    excerpt: str = Field(default="", max_length=1200)
    is_featured: bool = False
    category: str = Field(default="Insights", max_length=120)
    published_on: date | None = None
    read_mins: int = Field(default=5, ge=1, le=120)
    author: str = Field(default="NOVARISE Editorial Team", max_length=160)
    author_role: str = Field(default="Editorial Team", max_length=160)
    featured_media_id: uuid.UUID | None = None
    paragraphs: list[str] = Field(default_factory=lambda: ["", "", "", ""], min_length=4, max_length=4)
    pull_quote: str = Field(default="", max_length=1200)
    key_takeaways: list[str] = Field(default_factory=lambda: ["", "", ""], min_length=3, max_length=3)
    meta_title: str = Field(default="", max_length=255)
    meta_description: str = Field(default="", max_length=320)


class PostCreateRequest(BaseModel):
    is_featured: bool = False


class EventAgendaInput(BaseModel):
    time: str = Field(default="", max_length=120)
    title: str = Field(default="", max_length=255)
    description: str = Field(default="", max_length=1200)


class EventEditorPayload(BaseModel):
    slug: str = Field(min_length=2, max_length=180, pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=2, max_length=255)
    description: str = Field(default="", max_length=1200)
    is_featured: bool = False
    event_type: str = Field(default="Conference", max_length=120)
    starts_on: date | None = None
    ends_on: date | None = None
    time: str = Field(default="", max_length=160)
    location: str = Field(default="", max_length=255)
    venue: str = Field(default="", max_length=255)
    date_display: str = Field(default="", max_length=120)
    featured_media_id: uuid.UUID | None = None
    overview: list[str] = Field(default_factory=lambda: ["", ""], min_length=2, max_length=2)
    agenda: list[EventAgendaInput] = Field(default_factory=lambda: [EventAgendaInput(), EventAgendaInput(), EventAgendaInput()], min_length=3, max_length=3)
    takeaways: list[str] = Field(default_factory=lambda: ["", "", ""], min_length=3, max_length=3)
    meta_title: str = Field(default="", max_length=255)
    meta_description: str = Field(default="", max_length=320)


class EventCreateRequest(BaseModel):
    is_featured: bool = False


class RequirementEditorPayload(BaseModel):
    code: str = Field(min_length=2, max_length=80, pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$")
    position: str = Field(min_length=2, max_length=255)
    status: Literal["draft", "active", "urgent", "closed"] = "active"
    approval: str = Field(default="", max_length=255)
    description: str = Field(default="", max_length=3000)
    headcount: int = Field(default=1, ge=1, le=100000)
    project_name: str = Field(default="", max_length=255)
    location: str = Field(default="", max_length=255)
    rate_amount: Decimal | None = Field(default=None, ge=0)
    rate_currency: str = Field(default="SAR", min_length=3, max_length=3)
    rate_unit: str = Field(default="hour", max_length=40)
    duration: str = Field(default="", max_length=120)
    salary_cycle: str = Field(default="Monthly", max_length=120)
    food: str = Field(default="", max_length=255)
    accommodation: str = Field(default="", max_length=255)
    documents: list[str] = Field(default_factory=list, max_length=6)
    contacts: list[RequirementContactInput] = Field(default_factory=list, max_length=2)
    opens_at: datetime | None = None
    closes_at: datetime | None = None


class RequirementCreateRequest(BaseModel):
    target_status: Literal["active", "urgent"] = "active"


class ApplicationDocumentInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    status: Literal["not_requested", "pending", "received", "verified", "rejected", "expired"] = "pending"


class ApplicationWorkflowUpdate(BaseModel):
    stage: ApplicationStage
    internal_notes: str | None = Field(default=None, max_length=8000)
    assigned_to_id: uuid.UUID | None = None
    follow_up_at: datetime | None = None
    interview_at: datetime | None = None
    documents: list[ApplicationDocumentInput] = Field(default_factory=list, max_length=20)
    note: str | None = Field(default=None, max_length=2000)


class ApplicationNoteCreate(BaseModel):
    note: str = Field(min_length=1, max_length=2000)


class ApplicationOperationalStatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "completed", "cancelled"]


class ContactOperationalStatusUpdate(BaseModel):
    status: Literal["pending", "contacted", "resolved", "spam"]


class ContactWorkflowUpdate(BaseModel):
    assigned_to_id: uuid.UUID | None = None
    follow_up_at: datetime | None = None
    internal_notes: str | None = Field(default=None, max_length=8000)
    response_summary: str | None = Field(default=None, max_length=4000)
    note: str | None = Field(default=None, max_length=2000)


class ContactConvertToRFQ(BaseModel):
    company: str = Field(default="Individual enquiry", min_length=2, max_length=255)
    service: str = Field(min_length=2, max_length=180)
    location: str | None = Field(default=None, max_length=255)
    budget: str | None = Field(default=None, max_length=120)
    timeline: str | None = Field(default=None, max_length=120)


class RFQOperationalStatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "completed", "cancelled"]


class RFQQualificationInput(BaseModel):
    decision_maker: bool = False
    budget_verified: bool = False
    scope_verified: bool = False
    site_visit_required: bool = False
    technical_clarification: str = Field(default="", max_length=4000)


class RFQProposalInput(BaseModel):
    number: str = Field(default="", max_length=80)
    amount: Decimal | None = Field(default=None, ge=0)
    currency: str = Field(default="SAR", min_length=3, max_length=3)
    valid_until: date | None = None
    status: Literal["not_started", "draft", "ready", "sent", "revised", "accepted", "declined"] = "not_started"
    file_url: str = Field(default="", max_length=1000)

    @field_validator("file_url")
    @classmethod
    def safe_file_url(cls, value: str) -> str:
        value = value.strip()
        if not value:
            return value
        if value.startswith("/") and not value.startswith("//"):
            return value
        parsed = urlsplit(value)
        if parsed.scheme == "https" and parsed.netloc:
            return value
        raise ValueError("Proposal file URL must be an HTTPS or internal URL")


class RFQWorkflowUpdate(BaseModel):
    commercial_stage: Literal[
        "new", "under_review", "qualified", "estimation", "proposal_ready",
        "proposal_sent", "negotiation", "won", "lost",
    ]
    assigned_to_id: uuid.UUID | None = None
    follow_up_at: datetime | None = None
    meeting_at: datetime | None = None
    internal_notes: str | None = Field(default=None, max_length=8000)
    qualification: RFQQualificationInput = Field(default_factory=RFQQualificationInput)
    proposal: RFQProposalInput = Field(default_factory=RFQProposalInput)
    note: str | None = Field(default=None, max_length=2000)


class ContentListResponse(BaseModel):
    items: list[ContentItem]
    total: int


class SettingUpsert(BaseModel):
    group_name: str = Field(min_length=2, max_length=80)
    key: str = Field(min_length=2, max_length=120)
    value: Any
    is_public: bool = True


class MediaUpdate(BaseModel):
    alt_text: dict[str, str] = Field(default_factory=dict)
    folder: str | None = Field(default=None, max_length=255)


class NavigationUpsert(BaseModel):
    location: str = Field(default="header", min_length=2, max_length=40)
    parent_id: uuid.UUID | None = None
    label_en: str = Field(min_length=1, max_length=120)
    label_ar: str | None = Field(default=None, max_length=120)
    url: str = Field(min_length=1, max_length=500)
    sort_order: int = Field(default=0, ge=0)
    is_visible: bool = True

    @field_validator("url")
    @classmethod
    def safe_navigation_url(cls, value: str) -> str:
        value = value.strip()
        if value.startswith("/") and not value.startswith("//"):
            return value
        if value.startswith("#") and "\n" not in value and "\r" not in value:
            return value
        parsed = urlsplit(value)
        if parsed.scheme == "https" and parsed.netloc:
            return value
        if parsed.scheme in {"mailto", "tel"} and parsed.path:
            return value
        raise ValueError("Navigation URL must be internal or use a safe protocol")


class TaxonomyUpsert(BaseModel):
    slug: str = Field(min_length=2, max_length=180)
    name_en: str = Field(min_length=1, max_length=120)
    name_ar: str | None = Field(default=None, max_length=120)


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=12, max_length=128)
    role: str = Field(default="editor", min_length=2, max_length=80)
    is_active: bool = True
    require_password_change: bool = True


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    role: str | None = Field(default=None, min_length=2, max_length=80)
    is_active: bool | None = None


class UserPasswordReset(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)
    require_password_change: bool = True


class SensitiveActionRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
