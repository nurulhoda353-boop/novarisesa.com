import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field

ContentStatus = Literal["draft", "published", "archived", "active", "urgent", "closed"]
SubmissionStatusValue = Literal[
    "new",
    "in_review",
    "contacted",
    "qualified",
    "closed",
    "spam",
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


class ContentListResponse(BaseModel):
    items: list[ContentItem]
    total: int


class SubmissionStatusUpdate(BaseModel):
    status: SubmissionStatusValue
    internal_notes: str | None = Field(default=None, max_length=5000)


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


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    role: str | None = Field(default=None, min_length=2, max_length=80)
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=12, max_length=128)
