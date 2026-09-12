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
    # True only when an admin switched into this mailbox (see
    # admin_switch_account) - the mailbox's own `role` above stays whatever
    # it really is (so the UI still looks like that mailbox, no admin badge
    # appears), this just tells the client its current session has full
    # admin permissions here regardless.
    acting_as_admin: bool = False
    provider: str = "hostinger"


class MailProfileUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=160)
    cache_ttl_days: int = Field(ge=1, le=365)
    signature: str | None = Field(default=None, max_length=2000)


class MailPasswordChange(BaseModel):
    # Not required when an admin switched into this mailbox and is
    # resetting its password directly - they have no way to know its
    # current one. Still required for a mailbox changing its own.
    current_password: str | None = Field(default=None, min_length=8, max_length=256)
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


class DirectoryEntry(BaseModel):
    """One teammate's mailbox, for the compose recipient dropdown - a
    stripped-down view of MailAccount with nothing sensitive (no id,
    role, or hostinger identifiers), visible to every mail user rather
    than gated to admins like AdminAccountSummary is."""

    address: str
    display_name: str
    avatar_url: str | None = None


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
    """A member's own request to change something an admin must approve -
    password/display_name use `value`; delete_message (a member has no
    other way to remove a message at all) instead identifies the message
    via folder/uid, plus a destination to move it to once approved (the
    same "move to trash" a non-restricted user's delete button would do)
    or none if it's already in trash and approval should remove it
    outright, and a subject purely so the admin's review list is
    readable instead of a bare UID."""

    request_type: str = Field(pattern="^(password|display_name|delete_message)$")
    value: str | None = Field(default=None, max_length=500)
    folder: str | None = Field(default=None, min_length=1, max_length=200)
    uid: int | None = Field(default=None, ge=1)
    destination: str | None = Field(default=None, max_length=200)
    subject: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def check_required_fields(self) -> "MailChangeRequestCreate":
        if self.request_type in ("password", "display_name"):
            if not self.value:
                raise ValueError(f"{self.request_type} requires a value")
            if self.request_type == "password" and len(self.value) < 8:
                raise ValueError("Password must be at least 8 characters")
        elif self.request_type == "delete_message" and (not self.folder or not self.uid):
            raise ValueError("delete_message requires 'folder' and 'uid'")
        return self


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
    provider: str = "hostinger"


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


class AdminCreateMailboxRequest(BaseModel):
    """Creates a mailbox that has never existed on Hostinger at all -
    distinct from AdminProvisionMailboxRequest, which only ever adopts
    one that's already there."""

    local_part: str = Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9](?:[a-zA-Z0-9.]*[a-zA-Z0-9])?$")
    password: str = Field(min_length=8, max_length=50)
    role: str = Field(default="member", pattern="^(admin|member)$")

    @field_validator("local_part")
    @classmethod
    def no_consecutive_dots(cls, value: str) -> str:
        if ".." in value:
            raise ValueError("Local part can't contain consecutive periods")
        return value


class AdminSetRole(BaseModel):
    role: str = Field(pattern="^(admin|member)$")


class AdminConnectGoogleMailboxRequest(BaseModel):
    """Connects a mailbox that already exists on Google Workspace (same
    domain, hosted elsewhere) - unlike AdminCreateMailboxRequest/
    AdminProvisionMailboxRequest, nothing here is created or reset on
    Google's side; the app password is generated by the mailbox's own
    owner from their Google Account and just needs to be verified and
    stored."""

    address: EmailStr
    app_password: str = Field(min_length=8, max_length=64)
    role: str = Field(default="member", pattern="^(admin|member)$")

    @field_validator("app_password")
    @classmethod
    def strip_spaces(cls, value: str) -> str:
        # Google displays these grouped in 4s with spaces
        # ("abcd efgh ijkl mnop") - accept it pasted either way.
        return value.replace(" ", "")


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
