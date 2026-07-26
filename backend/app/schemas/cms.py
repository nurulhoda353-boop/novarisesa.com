import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ContentStatus = Literal["draft", "published", "archived", "active", "urgent", "closed"]
SubmissionStatusValue = Literal[
    "new",
    "in_review",
    "contacted",
    "qualified",
    "closed",
    "spam",
]


class ContentUpsert(BaseModel):
    slug: str | None = Field(default=None, min_length=2, max_length=180)
    code: str | None = Field(default=None, min_length=2, max_length=80)
    locale: str = Field(default="en", pattern="^(en|ar)$")
    title: str = Field(min_length=2, max_length=255)
    summary: str | None = None
    body: dict[str, Any] = Field(default_factory=dict)
    status: ContentStatus = "draft"
    is_featured: bool = False
    headcount: int | None = Field(default=None, ge=1, le=100000)
    location: str | None = Field(default=None, max_length=255)
    project_name: str | None = Field(default=None, max_length=255)
    sort_order: int = Field(default=0, ge=0)
    meta_title: str | None = Field(default=None, max_length=255)
    meta_description: str | None = None


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
