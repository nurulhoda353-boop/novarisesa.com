import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class MailLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)
    credential_type: str = Field(default="app_password", pattern="^(app_password|mailbox_password)$")
    device_name: str | None = Field(default=None, max_length=255)
    platform: str = Field(default="unknown", max_length=32)
    installation_id: str | None = Field(default=None, max_length=255)


class MobileRefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=40)


class MobileSessionResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    account: "MailAccountResponse"


class MailAccountResponse(BaseModel):
    id: uuid.UUID
    address: EmailStr
    display_name: str
    avatar_url: str | None
    cache_ttl_days: int
    hostinger_mailbox_id: str | None
    signature: str | None = None
    role: str = "member"


class MailProfileUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=160)
    cache_ttl_days: int = Field(ge=1, le=365)
    signature: str | None = Field(default=None, max_length=2000)


class MailPasswordChange(BaseModel):
    current_password: str = Field(min_length=8, max_length=256)
    new_password: str = Field(min_length=8, max_length=50)


class MailAddress(BaseModel):
    name: str = ""
    email: str = ""


class MailMessageSummary(BaseModel):
    uid: int
    folder: str
    message_id: str | None = None
    in_reply_to: str | None = None
    references: list[str] = []
    subject: str
    sender: MailAddress
    recipients: list[MailAddress]
    received_at: datetime | None = None
    flags: list[str]
    preview: str
    size_bytes: int | None = None
    has_attachments: bool = False


class MailAttachmentInfo(BaseModel):
    part: str
    filename: str
    content_type: str
    content_id: str | None = None
    size: int | None = None


class MailMessageDetail(MailMessageSummary):
    text_body: str
    html_body: str | None = None
    cc: list[MailAddress] = []
    attachments: list[MailAttachmentInfo] = []


class MailMessageList(BaseModel):
    data: list[MailMessageSummary]
    folder: str
    next_before_uid: int | None = None


class FlagRequest(BaseModel):
    value: bool


class MoveRequest(BaseModel):
    destination: str = Field(min_length=1, max_length=500)


class SendAttachment(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str = Field(default="application/octet-stream", max_length=150)
    content_base64: str


class SendMailRequest(BaseModel):
    to: list[EmailStr] = Field(min_length=1, max_length=100)
    cc: list[EmailStr] = Field(default=[], max_length=100)
    bcc: list[EmailStr] = Field(default=[], max_length=100)
    subject: str = Field(default="", max_length=998)
    text_body: str = ""
    html_body: str | None = None
    reply_to_message_id: str | None = Field(default=None, max_length=1000)
    attachments: list[SendAttachment] = Field(default=[], max_length=20)
    from_address: EmailStr | None = None


class ContactCreate(BaseModel):
    email: EmailStr
    display_name: str = Field(default="", max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    company: str | None = Field(default=None, max_length=255)
    is_favorite: bool = False

    @field_validator("email")
    @classmethod
    def lower_email(cls, value: EmailStr) -> str:
        return str(value).lower()


class ContactUpdate(BaseModel):
    display_name: str = Field(default="", max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    company: str | None = Field(default=None, max_length=255)
    is_favorite: bool = False


class ContactResponse(ContactCreate):
    id: uuid.UUID


class DraftUpsert(BaseModel):
    to: list[EmailStr] = []
    cc: list[EmailStr] = []
    bcc: list[EmailStr] = []
    subject: str = Field(default="", max_length=998)
    text_body: str = ""
    html_body: str | None = None
    attachments: list[dict] = []


class DraftResponse(DraftUpsert):
    id: uuid.UUID
    updated_at: datetime


class FolderResponse(BaseModel):
    name: str
    delimiter: str | None = None
    flags: list[str] = []
    unseen: int = 0
    total: int = 0


class SnoozeRequest(BaseModel):
    wake_at: datetime


class SnoozeResponse(BaseModel):
    id: uuid.UUID
    message_id: str
    subject: str
    original_folder: str
    wake_at: datetime


class MailRuleUpsert(BaseModel):
    name: str = Field(default="", max_length=160)
    from_contains: str | None = Field(default=None, max_length=255)
    subject_contains: str | None = Field(default=None, max_length=255)
    destination_folder: str = Field(min_length=1, max_length=500)
    is_enabled: bool = True

    @model_validator(mode="after")
    def require_a_condition(self) -> "MailRuleUpsert":
        if not self.from_contains and not self.subject_contains:
            raise ValueError("A rule needs at least a From or Subject condition")
        return self


class MailRuleResponse(BaseModel):
    id: uuid.UUID
    name: str
    from_contains: str | None
    subject_contains: str | None
    destination_folder: str
    is_enabled: bool
    sort_order: int


class AliasCreate(BaseModel):
    local_part: str = Field(pattern=r"^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,48}[a-zA-Z0-9])?$")


class ForwarderCreate(BaseModel):
    destination: EmailStr
    keep_copy: bool = True


class AutoreplyUpsert(BaseModel):
    subject: str = Field(min_length=1, max_length=998)
    body: str = Field(min_length=1)
    display_name: str = Field(default="", max_length=160)
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class MailChangeRequestCreate(BaseModel):
    """A member's own request to change something an admin must approve."""

    request_type: str = Field(pattern="^(password|display_name)$")
    value: str = Field(min_length=1, max_length=500)

    @field_validator("value")
    @classmethod
    def password_min_length(cls, value: str, info) -> str:  # noqa: ANN001
        if info.data.get("request_type") == "password" and len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        return value


class MailChangeRequestResponse(BaseModel):
    id: uuid.UUID
    request_type: str
    status: str
    rejection_reason: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None


class AdminAccountSummary(BaseModel):
    id: uuid.UUID
    address: EmailStr
    display_name: str
    avatar_url: str | None
    role: str
    is_active: bool
    last_connected_at: datetime | None = None


class AdminSetPassword(BaseModel):
    new_password: str = Field(min_length=8, max_length=50)


class AdminSetHostingerPassword(BaseModel):
    """The rarer, explicit action that touches the real mailbox password
    - `confirm` exists so a client can't trigger this by accidentally
    reusing the (much more common) Novamail-only reset call's shape."""

    new_password: str = Field(min_length=8, max_length=50)
    confirm: bool = Field(default=False, validate_default=True)

    @field_validator("confirm")
    @classmethod
    def must_confirm(cls, value: bool) -> bool:
        if not value:
            raise ValueError("This changes the real mailbox password - confirm to proceed")
        return value


class AdminHostingerPasswordResponse(BaseModel):
    address: EmailStr
    password: str


class HostingerMailboxSummary(BaseModel):
    """One row in the admin panel's live Hostinger view - every mailbox
    Hostinger actually has for the domain, not just ones that have logged
    into Novamail at least once (connected=True, with account_id/role).
    Usage figures come straight from Hostinger (storage in KB) - the only
    place this data exists, since it isn't tracked in our own DB."""

    address: EmailStr
    connected: bool
    account_id: uuid.UUID | None = None
    role: str | None = None
    storage_used: int | None = None
    storage_quota: int | None = None
    messages_used: int | None = None
    messages_quota: int | None = None


class AdminContactInfo(BaseModel):
    address: EmailStr
    display_name: str


class AdminProvisionMailboxRequest(BaseModel):
    address: EmailStr


class AdminSetProfile(BaseModel):
    display_name: str = Field(min_length=1, max_length=160)


class AdminChangeRequestDecision(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class AdminChangeRequestResponse(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    account_address: EmailStr
    request_type: str
    preview: str | None = None
    status: str
    rejection_reason: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None
    resolved_by_address: EmailStr | None = None


class AdminAuditLogEntry(BaseModel):
    id: uuid.UUID
    actor_address: EmailStr | None = None
    target_address: EmailStr | None = None
    action: str
    detail: str | None = None
    created_at: datetime


MobileSessionResponse.model_rebuild()
