import json
import secrets
import urllib.parse
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.mail_crypto import decrypt_mail_secret, encrypt_mail_secret
from app.core.mobile_auth import CurrentAdminAccount, CurrentMailAccount, MobileUser
from app.core.rate_limit import (
    clear_rate_events,
    enforce_rate_limit,
    rate_key,
    record_rate_event,
)
from app.core.request import client_ip
from app.core.security import (
    create_mobile_access_token,
    create_mobile_refresh_token,
    decode_mobile_token,
    digest_token,
    hash_password,
    verify_password,
)
from app.core.storage import save_upload
from app.models import (
    MailAccount,
    MailAuditLog,
    MailChangeRequest,
    MailContact,
    MailDevice,
    MailDraft,
    MailMessageCache,
    MailRule,
    MailSnooze,
    RefreshToken,
    User,
)
from app.schemas.mail import (
    AdminAccountSummary,
    AdminAuditLogEntry,
    AdminChangeRequestDecision,
    AdminChangeRequestResponse,
    AdminHostingerPasswordResponse,
    AdminSetHostingerPassword,
    AdminSetPassword,
    AdminSetProfile,
    AliasCreate,
    AutoreplyUpsert,
    ContactCreate,
    ContactResponse,
    ContactUpdate,
    DraftResponse,
    DraftUpsert,
    FlagRequest,
    FolderResponse,
    ForwarderCreate,
    HostingerMailboxSummary,
    MailAccountResponse,
    MailChangeRequestCreate,
    MailChangeRequestResponse,
    MailLoginRequest,
    MailMessageDetail,
    MailMessageList,
    MailPasswordChange,
    MailProfileUpdate,
    MailRuleResponse,
    MailRuleUpsert,
    MobileRefreshRequest,
    MobileSessionResponse,
    MoveRequest,
    SendMailRequest,
    SnoozeRequest,
    SnoozeResponse,
)
from app.services.hostinger_api import HostingerApiError, HostingerManagementClient
from app.services.mail_client import HostingerMailboxClient, MailConnectionError
from app.services.mail_snooze import SNOOZE_FOLDER
from app.services.mail_watcher import watcher_registry

router = APIRouter(prefix="/mail")
DBSession = Annotated[Session, Depends(get_db)]


def account_response(account: MailAccount) -> MailAccountResponse:
    return MailAccountResponse(
        id=account.id,
        address=account.address,
        display_name=account.display_name,
        avatar_url=account.avatar_url,
        cache_ttl_days=account.cache_ttl_days,
        hostinger_mailbox_id=account.hostinger_mailbox_id,
        signature=account.signature,
        role=account.role,
    )


def _require_not_member(account: MailAccount, action: str) -> None:
    if account.role == "member":
        raise HTTPException(status_code=403, detail=f"Members can't {action} — ask an admin.")


def _audit(
    db: Session,
    *,
    actor: MailAccount | None,
    target: MailAccount | None,
    action: str,
    detail: str | None = None,
) -> None:
    db.add(
        MailAuditLog(
            actor_account_id=actor.id if actor else None,
            target_account_id=target.id if target else None,
            action=action,
            detail=detail,
        )
    )


def _force_logout(db: Session, target: MailAccount) -> None:
    """Stamps password_changed_at and revokes every stored refresh token
    for this account's user, so every device is signed out immediately
    (see get_mobile_user's issued-at check) - not just once the
    short-lived access token happens to expire on its own. Shared by both
    kinds of password reset below."""
    now = datetime.now(UTC)
    target_user = db.get(User, target.user_id)
    if target_user:
        target_user.password_changed_at = now
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == target.user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )


def _apply_novamail_password_reset(db: Session, target: MailAccount, new_password: str) -> None:
    """The default, everyday reset: sets a Novamail-only login secret and
    force-logs-out every device. Never touches the real Hostinger mailbox
    password - mail_client keeps using credential_ciphertext, untouched,
    to actually fetch/send. This is what "give a member a new password"
    means day to day; see _apply_hostinger_password_reset for the rarer,
    explicit action that changes the real mailbox credential too."""
    target.novamail_password_hash = hash_password(new_password)
    _force_logout(db, target)


def _apply_hostinger_password_reset(db: Session, target: MailAccount, new_password: str) -> None:
    """The rarer, explicit action: actually changes the real Hostinger
    mailbox password (IMAP/SMTP), then force-logs-out every device. Used
    by an account's own self-service change (which only ever touches its
    own, real credential) and by the admin panel's separate, confirmed
    "also change the real mailbox password" action - never by an admin's
    everyday reset of someone else's Novamail login."""
    try:
        client = HostingerManagementClient()
        mailbox_id = target.hostinger_mailbox_id
        if not mailbox_id:
            found = client.find_mailbox(target.address)
            if not found:
                raise HostingerApiError("Mailbox was not found in the Hostinger account")
            target.hostinger_order_id, mailbox_id = found
            target.hostinger_mailbox_id = mailbox_id
        client.change_mailbox_password(mailbox_id, new_password)
    except HostingerApiError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    target.credential_ciphertext = encrypt_mail_secret(new_password)
    target.credential_type = "mailbox_password"
    _force_logout(db, target)


def issue_mobile_session(db: Session, user: User, account: MailAccount) -> MobileSessionResponse:
    token_id = uuid.uuid4()
    access = create_mobile_access_token(str(user.id))
    refresh = create_mobile_refresh_token(str(user.id), str(token_id))
    db.add(
        RefreshToken(
            id=token_id,
            user_id=user.id,
            token_hash=digest_token(refresh),
            expires_at=datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_DAYS),
            user_agent="Novarise Mail mobile",
        )
    )
    return MobileSessionResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_MINUTES * 60,
        account=account_response(account),
    )


def mailbox_client(account: MailAccount) -> HostingerMailboxClient:
    try:
        password = decrypt_mail_secret(account.credential_ciphertext)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail="Mailbox credential must be reconnected") from exc
    return HostingerMailboxClient(account.address, password)


def mail_error(exc: Exception) -> HTTPException:
    return HTTPException(status_code=502, detail=str(exc))


def management_client(account: MailAccount, db: Session) -> HostingerManagementClient:
    try:
        client = HostingerManagementClient()
        if not account.hostinger_mailbox_id or not account.hostinger_order_id:
            found = client.find_mailbox(account.address)
            if not found:
                raise HostingerApiError("Mailbox was not found in the Hostinger account")
            account.hostinger_order_id, account.hostinger_mailbox_id = found
            db.commit()
        return client
    except HostingerApiError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def owned_items(items: list[dict], account: MailAccount) -> list[dict]:
    mailbox_id = account.hostinger_mailbox_id
    return [
        item
        for item in items
        if str((item.get("mailbox") or {}).get("id", item.get("mailbox_id", "")))
        == mailbox_id
    ]


@router.post("/auth/login", response_model=MobileSessionResponse)
def login(payload: MailLoginRequest, request: Request, db: DBSession) -> MobileSessionResponse:
    address = str(payload.email).lower()
    domain = address.rsplit("@", 1)[-1]
    if domain not in {item.lower() for item in settings.MAIL_ALLOWED_DOMAINS}:
        raise HTTPException(status_code=403, detail="This email domain is not allowed")
    ip = client_ip(request)
    identity_key = rate_key("mail.login", ip, address)
    ip_key = rate_key("mail.login", ip)
    window = timedelta(minutes=settings.LOGIN_WINDOW_MINUTES)
    enforce_rate_limit(
        db,
        scope="mail.login.identity",
        key_hash=identity_key,
        maximum=settings.LOGIN_MAX_ATTEMPTS,
        window=window,
    )
    enforce_rate_limit(
        db,
        scope="mail.login.ip",
        key_hash=ip_key,
        maximum=settings.LOGIN_MAX_ATTEMPTS * 4,
        window=window,
    )
    existing = db.scalar(select(MailAccount).where(MailAccount.address == address))

    def _reject(detail: str) -> HTTPException:
        record_rate_event(db, scope="mail.login.identity", key_hash=identity_key)
        record_rate_event(db, scope="mail.login.ip", key_hash=ip_key)
        db.commit()
        return HTTPException(status_code=401, detail=detail)

    # Members can no longer change their own password (see
    # _apply_novamail_password_reset) - a login failure is far more likely
    # to mean "an admin reset it" than "I mistyped it," so point there
    # instead of the generic message. Admin accounts (and unrecognized
    # emails, who have no role recorded yet) keep the generic message
    # since there's no one above an admin to contact.
    verified_against_hostinger = True
    if existing and existing.novamail_password_hash:
        # This account has a Novamail-only login set - check the
        # submitted password against that instead, and never touch (or
        # even look at) the real Hostinger mailbox password here.
        if not verify_password(payload.password, existing.novamail_password_hash):
            raise _reject("Password changed. Contact admin for new password.")
        verified_against_hostinger = False
    else:
        try:
            HostingerMailboxClient(address, payload.password).verify()
        except MailConnectionError as exc:
            if existing and existing.role == "member":
                raise _reject("Password changed. Contact admin for new password.") from exc
            raise _reject("Invalid mailbox email or password") from exc
    clear_rate_events(db, scope="mail.login.identity", key_hash=identity_key)
    clear_rate_events(db, scope="mail.login.ip", key_hash=ip_key)

    user = db.scalar(select(User).where(User.email == address))
    if user is None:
        user = User(
            email=address,
            full_name=address.split("@", 1)[0].replace(".", " ").title(),
            password_hash=hash_password(secrets.token_urlsafe(48)),
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.flush()
    account = db.scalar(select(MailAccount).where(MailAccount.user_id == user.id))
    now = datetime.now(UTC)
    if account is None:
        account = MailAccount(
            user_id=user.id,
            address=address,
            display_name=user.full_name,
            credential_ciphertext=encrypt_mail_secret(payload.password),
            credential_type=payload.credential_type,
            cache_ttl_days=settings.MAIL_CACHE_DAYS,
            last_connected_at=now,
        )
        db.add(account)
        db.flush()
    else:
        # Only refresh the stored Hostinger credential when this
        # submission was actually verified against Hostinger itself - a
        # Novamail-only login must never overwrite the real mailbox
        # password with whatever was just typed into the login screen.
        if verified_against_hostinger:
            account.credential_ciphertext = encrypt_mail_secret(payload.password)
            account.credential_type = payload.credential_type
        account.is_active = True
        account.last_connected_at = now

    if settings.HOSTINGER_API_TOKEN and not account.hostinger_mailbox_id:
        try:
            found = HostingerManagementClient().find_mailbox(address)
            if found:
                account.hostinger_order_id, account.hostinger_mailbox_id = found
        except HostingerApiError:
            pass

    if payload.installation_id:
        device = db.scalar(
            select(MailDevice).where(
                MailDevice.account_id == account.id,
                MailDevice.installation_id == payload.installation_id,
            )
        )
        if device is None:
            device = MailDevice(
                account_id=account.id,
                installation_id=payload.installation_id,
                platform=payload.platform,
                device_name=payload.device_name,
            )
            db.add(device)
        device.last_seen_at = now
    response = issue_mobile_session(db, user, account)
    db.commit()
    return response


@router.post("/auth/refresh", response_model=MobileSessionResponse)
def refresh(payload: MobileRefreshRequest, db: DBSession) -> MobileSessionResponse:
    unauthorized = HTTPException(status_code=401, detail="Session expired")
    try:
        decoded = decode_mobile_token(payload.refresh_token, "refresh")
        token_id = uuid.UUID(decoded["jti"])
        user_id = uuid.UUID(decoded["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError) as exc:
        raise unauthorized from exc
    stored = db.scalar(
        select(RefreshToken).where(
            RefreshToken.id == token_id,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
    )
    if (
        not stored
        or stored.expires_at < datetime.now(UTC)
        or stored.token_hash != digest_token(payload.refresh_token)
    ):
        raise unauthorized
    user = db.get(User, user_id)
    account = db.scalar(select(MailAccount).where(MailAccount.user_id == user_id))
    if not user or not account or not user.is_active or not account.is_active:
        raise unauthorized
    stored.revoked_at = datetime.now(UTC)
    response = issue_mobile_session(db, user, account)
    db.commit()
    return response


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(user: MobileUser, db: DBSession) -> None:
    now = datetime.now(UTC)
    for token in db.scalars(
        select(RefreshToken).where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
    ):
        token.revoked_at = now
    db.commit()


@router.get("/account", response_model=MailAccountResponse)
def get_account(account: CurrentMailAccount) -> MailAccountResponse:
    return account_response(account)


@router.patch("/account", response_model=MailAccountResponse)
def update_account(
    payload: MailProfileUpdate, account: CurrentMailAccount, db: DBSession
) -> MailAccountResponse:
    new_name = payload.display_name.strip()
    if account.role == "member" and new_name != account.display_name:
        raise HTTPException(
            status_code=403,
            detail="Changing your name needs admin approval — send a change request instead.",
        )
    account.display_name = new_name
    account.cache_ttl_days = payload.cache_ttl_days
    account.signature = payload.signature
    db.commit()
    db.refresh(account)
    return account_response(account)


@router.post("/account/avatar", response_model=MailAccountResponse)
async def update_avatar(
    account: CurrentMailAccount,
    db: DBSession,
    avatar: Annotated[UploadFile, File()],
) -> MailAccountResponse:
    if not (avatar.content_type or "").startswith("image/"):
        raise HTTPException(status_code=415, detail="Avatar must be an image")
    _, url, _, _ = await save_upload(avatar, folder=f"mail/avatars/{account.id}")
    if account.role == "member":
        db.add(MailChangeRequest(account_id=account.id, request_type="avatar", payload_url=url))
        _audit(db, actor=account, target=account, action="profile_change_requested", detail="avatar")
        db.commit()
        return account_response(account)
    account.avatar_url = url
    db.commit()
    db.refresh(account)
    return account_response(account)


@router.post("/account/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(payload: MailPasswordChange, account: CurrentMailAccount, db: DBSession) -> None:
    if account.role == "member":
        raise HTTPException(
            status_code=403,
            detail="Password changes need admin approval — send a change request instead.",
        )
    try:
        HostingerMailboxClient(account.address, payload.current_password).verify()
    except MailConnectionError as exc:
        raise HTTPException(status_code=401, detail="Current mailbox password is incorrect") from exc
    _apply_hostinger_password_reset(db, account, payload.new_password)
    db.commit()


@router.post(
    "/account/change-request",
    response_model=MailChangeRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_change_request(
    payload: MailChangeRequestCreate, account: CurrentMailAccount, db: DBSession
) -> MailChangeRequest:
    """A member's own request to change their password or display name -
    only an admin approving it (see admin_approve_change_request) actually
    applies it. Encrypting the pending password the same way a live
    mailbox credential is encrypted, rather than holding it as plain text
    while it waits for review."""
    request = MailChangeRequest(account_id=account.id, request_type=payload.request_type)
    if payload.request_type == "password":
        request.payload_ciphertext = encrypt_mail_secret(payload.value)
    else:
        request.payload_text = payload.value
    db.add(request)
    _audit(
        db,
        actor=account,
        target=account,
        action="profile_change_requested",
        detail=payload.request_type,
    )
    db.commit()
    db.refresh(request)
    return request


@router.get("/account/change-requests", response_model=list[MailChangeRequestResponse])
def list_my_change_requests(account: CurrentMailAccount, db: DBSession) -> list[MailChangeRequest]:
    return list(
        db.scalars(
            select(MailChangeRequest)
            .where(MailChangeRequest.account_id == account.id)
            .order_by(MailChangeRequest.created_at.desc())
        )
    )


@router.websocket("/ws")
async def mail_events(websocket: WebSocket, account: CurrentMailAccount) -> None:
    """Push channel replacing Firebase: broadcasts "new_mail" the instant IMAP IDLE sees it."""
    try:
        password = decrypt_mail_secret(account.credential_ciphertext)
    except ValueError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await websocket.accept()
    account_id = str(account.id)
    await watcher_registry.subscribe(account_id, account.address, password, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await watcher_registry.unsubscribe(account_id, websocket)


@router.get("/folders", response_model=list[FolderResponse])
def folders(account: CurrentMailAccount) -> list[FolderResponse]:
    try:
        return [FolderResponse(**item) for item in mailbox_client(account).folders()]
    except MailConnectionError as exc:
        raise mail_error(exc) from exc


@router.get("/messages", response_model=MailMessageList)
def list_messages(
    account: CurrentMailAccount,
    folder: str = Query(default="INBOX", max_length=500),
    limit: int = Query(default=30, ge=1, le=50),
    before_uid: int | None = Query(default=None, ge=1),
    q: str | None = Query(default=None, max_length=200),
    from_contains: str | None = Query(default=None, max_length=200),
    since: Annotated[date | None, Query()] = None,
    before: Annotated[date | None, Query()] = None,
    has_attachment: bool | None = Query(default=None),
    starred: bool | None = Query(default=None),
) -> MailMessageList:
    try:
        rows = mailbox_client(account).messages(
            folder,
            limit,
            before_uid,
            q,
            from_contains=from_contains,
            since=since,
            before=before,
            has_attachment=has_attachment,
            starred=starred,
        )
    except MailConnectionError as exc:
        raise mail_error(exc) from exc
    next_uid = min((item["uid"] for item in rows), default=None) if len(rows) == limit else None
    return MailMessageList(data=rows, folder=folder, next_before_uid=next_uid)


@router.get("/messages/{uid}", response_model=MailMessageDetail)
def get_message(
    uid: int,
    account: CurrentMailAccount,
    db: DBSession,
    folder: str = Query(default="INBOX", max_length=500),
) -> MailMessageDetail:
    now = datetime.now(UTC)
    db.execute(
        delete(MailMessageCache).where(
            MailMessageCache.account_id == account.id,
            MailMessageCache.retained_until.is_not(None),
            MailMessageCache.retained_until < now,
        )
    )
    try:
        data = mailbox_client(account).message(folder, uid)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Message not found") from exc
    except MailConnectionError as exc:
        raise mail_error(exc) from exc
    cached = db.scalar(
        select(MailMessageCache).where(
            MailMessageCache.account_id == account.id,
            MailMessageCache.folder == folder,
            MailMessageCache.remote_uid == uid,
        )
    )
    detail = MailMessageDetail(**data)
    serialized_body = json.dumps(
        {"text_body": detail.text_body, "html_body": detail.html_body}, ensure_ascii=False
    )
    if cached is None:
        cached = MailMessageCache(
            account_id=account.id,
            folder=folder,
            remote_uid=uid,
            message_id=detail.message_id,
            subject=detail.subject,
            sender=detail.sender.model_dump(),
            recipients=[value.model_dump() for value in detail.recipients],
            preview=detail.preview,
            flags=detail.flags,
            received_at=detail.received_at,
            size_bytes=detail.size_bytes,
        )
        db.add(cached)
    cached.body_ciphertext = encrypt_mail_secret(serialized_body)
    cached.retained_until = now + timedelta(days=account.cache_ttl_days)
    db.commit()
    return detail


@router.get("/messages/{uid}/attachments/{part_number}")
def download_attachment(
    uid: int,
    part_number: str,
    account: CurrentMailAccount,
    folder: str = Query(default="INBOX", max_length=500),
) -> Response:
    try:
        filename, content_type, content = mailbox_client(account).attachment(
            folder, uid, part_number
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Attachment not found") from exc
    except MailConnectionError as exc:
        raise mail_error(exc) from exc
    if len(content) > settings.MAIL_MAX_ATTACHMENT_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Attachment exceeds the download size limit")
    encoded_name = urllib.parse.quote(filename)
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_name}"},
    )


@router.put("/messages/{uid}/read", status_code=status.HTTP_204_NO_CONTENT)
def set_read(
    uid: int, payload: FlagRequest, account: CurrentMailAccount, folder: str = Query("INBOX")
) -> None:
    try:
        mailbox_client(account).set_flag(folder, uid, "\\Seen", payload.value)
    except MailConnectionError as exc:
        raise mail_error(exc) from exc


@router.put("/messages/{uid}/star", status_code=status.HTTP_204_NO_CONTENT)
def set_star(
    uid: int, payload: FlagRequest, account: CurrentMailAccount, folder: str = Query("INBOX")
) -> None:
    try:
        mailbox_client(account).set_flag(folder, uid, "\\Flagged", payload.value)
    except MailConnectionError as exc:
        raise mail_error(exc) from exc


@router.post("/messages/{uid}/move", status_code=status.HTTP_204_NO_CONTENT)
def move_message(
    uid: int,
    payload: MoveRequest,
    account: CurrentMailAccount,
    folder: str = Query("INBOX"),
) -> None:
    _require_not_member(account, "move or archive mail")
    try:
        mailbox_client(account).move(folder, uid, payload.destination)
    except MailConnectionError as exc:
        raise mail_error(exc) from exc


@router.delete("/messages/{uid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(uid: int, account: CurrentMailAccount, folder: str = Query("INBOX")) -> None:
    _require_not_member(account, "delete mail")
    try:
        mailbox_client(account).delete(folder, uid)
    except MailConnectionError as exc:
        raise mail_error(exc) from exc


@router.post(
    "/messages/{uid}/snooze", response_model=SnoozeResponse, status_code=status.HTTP_201_CREATED
)
def snooze_message(
    uid: int,
    payload: SnoozeRequest,
    account: CurrentMailAccount,
    db: DBSession,
    folder: str = Query(default="INBOX", max_length=500),
) -> MailSnooze:
    client = mailbox_client(account)
    try:
        detail = client.message(folder, uid)
        client.ensure_folder(SNOOZE_FOLDER)
        client.move(folder, uid, SNOOZE_FOLDER)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Message not found") from exc
    except MailConnectionError as exc:
        raise mail_error(exc) from exc
    snooze = MailSnooze(
        account_id=account.id,
        message_id=detail.get("message_id") or f"novarise-uid-{uid}",
        subject=detail.get("subject", ""),
        original_folder=folder,
        snoozed_folder=SNOOZE_FOLDER,
        wake_at=payload.wake_at,
    )
    db.add(snooze)
    db.commit()
    db.refresh(snooze)
    return snooze


@router.get("/snoozes", response_model=list[SnoozeResponse])
def list_snoozes(account: CurrentMailAccount, db: DBSession) -> list[MailSnooze]:
    return list(
        db.scalars(
            select(MailSnooze)
            .where(MailSnooze.account_id == account.id, MailSnooze.woken_at.is_(None))
            .order_by(MailSnooze.wake_at)
        )
    )


@router.delete("/snoozes/{snooze_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_snooze(snooze_id: uuid.UUID, account: CurrentMailAccount, db: DBSession) -> None:
    snooze = db.scalar(
        select(MailSnooze).where(MailSnooze.id == snooze_id, MailSnooze.account_id == account.id)
    )
    if not snooze or snooze.woken_at is not None:
        raise HTTPException(status_code=404, detail="Snooze not found")
    client = mailbox_client(account)
    try:
        found_uid = client.find_uid_by_message_id(snooze.snoozed_folder, snooze.message_id)
        if found_uid is not None:
            client.move(snooze.snoozed_folder, found_uid, snooze.original_folder)
    except MailConnectionError as exc:
        raise mail_error(exc) from exc
    snooze.woken_at = datetime.now(UTC)
    db.commit()


@router.post("/messages/send")
def send_message(payload: SendMailRequest, account: CurrentMailAccount, db: DBSession) -> dict[str, str]:
    from_address = str(payload.from_address).lower() if payload.from_address else None
    if from_address and from_address != account.address.lower():
        client = management_client(account, db)
        try:
            aliases = owned_items(client.list_aliases(account.hostinger_order_id or ""), account)
        except HostingerApiError as exc:
            raise mail_error(exc) from exc
        alias_addresses = {str(item.get("address", "")).lower() for item in aliases}
        if from_address not in alias_addresses:
            raise HTTPException(status_code=400, detail="That address isn't one of your aliases")
    try:
        message_id = mailbox_client(account).send(
            payload.model_dump(mode="json"), account.display_name, from_address=from_address
        )
    except (MailConnectionError, ValueError) as exc:
        raise mail_error(exc) from exc
    return {"status": "sent", "message_id": message_id}


@router.get("/contacts", response_model=list[ContactResponse])
def list_contacts(account: CurrentMailAccount, db: DBSession) -> list[MailContact]:
    return list(
        db.scalars(
            select(MailContact).where(MailContact.account_id == account.id).order_by(MailContact.display_name)
        )
    )


@router.post("/contacts", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(payload: ContactCreate, account: CurrentMailAccount, db: DBSession) -> MailContact:
    contact = MailContact(account_id=account.id, **payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.patch("/contacts/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: uuid.UUID,
    payload: ContactUpdate,
    account: CurrentMailAccount,
    db: DBSession,
) -> MailContact:
    contact = db.scalar(
        select(MailContact).where(MailContact.id == contact_id, MailContact.account_id == account.id)
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    contact.display_name = payload.display_name
    contact.phone = payload.phone
    contact.company = payload.company
    contact.is_favorite = payload.is_favorite
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: uuid.UUID, account: CurrentMailAccount, db: DBSession) -> None:
    contact = db.scalar(
        select(MailContact).where(MailContact.id == contact_id, MailContact.account_id == account.id)
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()


def draft_response(draft: MailDraft) -> DraftResponse:
    return DraftResponse(
        id=draft.id,
        to=draft.recipients.get("to", []),
        cc=draft.recipients.get("cc", []),
        bcc=draft.recipients.get("bcc", []),
        subject=draft.subject,
        text_body=draft.text_body,
        html_body=draft.html_body,
        attachments=draft.attachments,
        updated_at=draft.updated_at,
    )


@router.get("/drafts", response_model=list[DraftResponse])
def list_drafts(account: CurrentMailAccount, db: DBSession) -> list[DraftResponse]:
    drafts = db.scalars(
        select(MailDraft)
        .where(MailDraft.account_id == account.id)
        .order_by(MailDraft.updated_at.desc())
    )
    return [draft_response(draft) for draft in drafts]


@router.post("/drafts", response_model=DraftResponse, status_code=status.HTTP_201_CREATED)
def create_draft(payload: DraftUpsert, account: CurrentMailAccount, db: DBSession) -> DraftResponse:
    draft = MailDraft(
        account_id=account.id,
        recipients={
            "to": [str(item) for item in payload.to],
            "cc": [str(item) for item in payload.cc],
            "bcc": [str(item) for item in payload.bcc],
        },
        subject=payload.subject,
        text_body=payload.text_body,
        html_body=payload.html_body,
        attachments=payload.attachments,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft_response(draft)


@router.put("/drafts/{draft_id}", response_model=DraftResponse)
def update_draft(
    draft_id: uuid.UUID,
    payload: DraftUpsert,
    account: CurrentMailAccount,
    db: DBSession,
) -> DraftResponse:
    draft = db.scalar(
        select(MailDraft).where(
            MailDraft.id == draft_id,
            MailDraft.account_id == account.id,
        )
    )
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    draft.recipients = {
        "to": [str(item) for item in payload.to],
        "cc": [str(item) for item in payload.cc],
        "bcc": [str(item) for item in payload.bcc],
    }
    draft.subject = payload.subject
    draft.text_body = payload.text_body
    draft.html_body = payload.html_body
    draft.attachments = payload.attachments
    db.commit()
    db.refresh(draft)
    return draft_response(draft)


@router.delete("/drafts/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_draft(
    draft_id: uuid.UUID,
    account: CurrentMailAccount,
    db: DBSession,
) -> None:
    draft = db.scalar(
        select(MailDraft).where(
            MailDraft.id == draft_id,
            MailDraft.account_id == account.id,
        )
    )
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    db.delete(draft)
    db.commit()


@router.get("/management/aliases")
def list_aliases(account: CurrentMailAccount, db: DBSession) -> list[dict]:
    client = management_client(account, db)
    try:
        return owned_items(client.list_aliases(account.hostinger_order_id or ""), account)
    except HostingerApiError as exc:
        raise mail_error(exc) from exc


@router.post("/management/aliases", status_code=status.HTTP_201_CREATED)
def create_alias(payload: AliasCreate, account: CurrentMailAccount, db: DBSession) -> dict:
    client = management_client(account, db)
    try:
        return client.create_alias(account.hostinger_mailbox_id or "", payload.local_part.lower())
    except HostingerApiError as exc:
        raise mail_error(exc) from exc


@router.delete("/management/aliases/{alias_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alias(alias_id: str, account: CurrentMailAccount, db: DBSession) -> None:
    client = management_client(account, db)
    try:
        aliases = owned_items(client.list_aliases(account.hostinger_order_id or ""), account)
        if alias_id not in {str(item.get("id")) for item in aliases}:
            raise HTTPException(status_code=404, detail="Alias not found")
        client.delete_alias(alias_id)
    except HostingerApiError as exc:
        raise mail_error(exc) from exc


@router.get("/management/forwarders")
def list_forwarders(account: CurrentMailAccount, db: DBSession) -> list[dict]:
    client = management_client(account, db)
    try:
        return owned_items(client.list_forwarders(account.hostinger_order_id or ""), account)
    except HostingerApiError as exc:
        raise mail_error(exc) from exc


@router.post("/management/forwarders", status_code=status.HTTP_201_CREATED)
def create_forwarder(
    payload: ForwarderCreate,
    account: CurrentMailAccount,
    db: DBSession,
) -> dict:
    client = management_client(account, db)
    try:
        return client.create_forwarder(
            account.hostinger_mailbox_id or "",
            str(payload.destination),
            payload.keep_copy,
        )
    except HostingerApiError as exc:
        raise mail_error(exc) from exc


@router.delete("/management/forwarders/{forwarder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_forwarder(
    forwarder_id: str,
    account: CurrentMailAccount,
    db: DBSession,
) -> None:
    client = management_client(account, db)
    try:
        rows = owned_items(client.list_forwarders(account.hostinger_order_id or ""), account)
        if forwarder_id not in {str(item.get("id")) for item in rows}:
            raise HTTPException(status_code=404, detail="Forwarder not found")
        client.delete_forwarder(forwarder_id)
    except HostingerApiError as exc:
        raise mail_error(exc) from exc


@router.get("/management/autoreplies")
def list_autoreplies(account: CurrentMailAccount, db: DBSession) -> list[dict]:
    client = management_client(account, db)
    try:
        return owned_items(client.list_autoreplies(account.hostinger_order_id or ""), account)
    except HostingerApiError as exc:
        raise mail_error(exc) from exc


@router.post("/management/autoreplies", status_code=status.HTTP_201_CREATED)
def create_autoreply(
    payload: AutoreplyUpsert,
    account: CurrentMailAccount,
    db: DBSession,
) -> dict:
    client = management_client(account, db)
    try:
        return client.create_autoreply(
            account.hostinger_mailbox_id or "",
            payload.model_dump(mode="json", exclude_none=True),
        )
    except HostingerApiError as exc:
        raise mail_error(exc) from exc


@router.put("/management/autoreplies/{autoreply_id}")
def update_autoreply(
    autoreply_id: str,
    payload: AutoreplyUpsert,
    account: CurrentMailAccount,
    db: DBSession,
) -> dict:
    client = management_client(account, db)
    try:
        rows = owned_items(client.list_autoreplies(account.hostinger_order_id or ""), account)
        if autoreply_id not in {str(item.get("id")) for item in rows}:
            raise HTTPException(status_code=404, detail="Auto-reply not found")
        return client.update_autoreply(
            autoreply_id, payload.model_dump(mode="json", exclude_none=True)
        )
    except HostingerApiError as exc:
        raise mail_error(exc) from exc


@router.delete(
    "/management/autoreplies/{autoreply_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_autoreply(
    autoreply_id: str,
    account: CurrentMailAccount,
    db: DBSession,
) -> None:
    client = management_client(account, db)
    try:
        rows = owned_items(client.list_autoreplies(account.hostinger_order_id or ""), account)
        if autoreply_id not in {str(item.get("id")) for item in rows}:
            raise HTTPException(status_code=404, detail="Auto-reply not found")
        client.delete_autoreply(autoreply_id)
    except HostingerApiError as exc:
        raise mail_error(exc) from exc


@router.get("/rules", response_model=list[MailRuleResponse])
def list_rules(account: CurrentMailAccount, db: DBSession) -> list[MailRule]:
    return list(
        db.scalars(
            select(MailRule)
            .where(MailRule.account_id == account.id)
            .order_by(MailRule.sort_order, MailRule.created_at)
        )
    )


@router.post("/rules", response_model=MailRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(payload: MailRuleUpsert, account: CurrentMailAccount, db: DBSession) -> MailRule:
    max_order = db.scalar(
        select(func.max(MailRule.sort_order)).where(MailRule.account_id == account.id)
    )
    rule = MailRule(account_id=account.id, sort_order=(max_order or 0) + 1, **payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/rules/{rule_id}", response_model=MailRuleResponse)
def update_rule(
    rule_id: uuid.UUID, payload: MailRuleUpsert, account: CurrentMailAccount, db: DBSession
) -> MailRule:
    rule = db.scalar(select(MailRule).where(MailRule.id == rule_id, MailRule.account_id == account.id))
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    for key, value in payload.model_dump().items():
        setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(rule_id: uuid.UUID, account: CurrentMailAccount, db: DBSession) -> None:
    rule = db.scalar(select(MailRule).where(MailRule.id == rule_id, MailRule.account_id == account.id))
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()


# ---------------------------------------------------------------------------
# Admin panel: one "admin" mailbox controls every "member" mailbox - switch
# into any of them without its password, reset any member's password/name/
# avatar directly, review pending member change-requests, and see every
# mailbox's audit trail. Every route below requires CurrentAdminAccount.
# ---------------------------------------------------------------------------


@router.get("/admin/accounts", response_model=list[AdminAccountSummary])
def admin_list_accounts(admin: CurrentAdminAccount, db: DBSession) -> list[MailAccount]:
    return list(db.scalars(select(MailAccount).order_by(MailAccount.address)))


@router.post("/admin/accounts/{account_id}/switch", response_model=MobileSessionResponse)
def admin_switch_account(
    account_id: uuid.UUID, admin: CurrentAdminAccount, db: DBSession
) -> MobileSessionResponse:
    target = db.get(MailAccount, account_id)
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="Mailbox not found")
    target_user = db.get(User, target.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Mailbox not found")
    _audit(db, actor=admin, target=target, action="switched_in")
    response = issue_mobile_session(db, target_user, target)
    db.commit()
    return response


@router.post("/admin/accounts/{account_id}/password", status_code=status.HTTP_204_NO_CONTENT)
def admin_set_password(
    account_id: uuid.UUID, payload: AdminSetPassword, admin: CurrentAdminAccount, db: DBSession
) -> None:
    """The everyday reset: sets a fresh Novamail-only login for the
    target mailbox. Never touches its real Hostinger mailbox password -
    see admin_set_hostinger_password for that separate, confirmed action."""
    target = db.get(MailAccount, account_id)
    if not target:
        raise HTTPException(status_code=404, detail="Mailbox not found")
    _apply_novamail_password_reset(db, target, payload.new_password)
    _audit(db, actor=admin, target=target, action="password_reset")
    db.commit()


@router.post(
    "/admin/accounts/{account_id}/hostinger-password", status_code=status.HTTP_204_NO_CONTENT
)
def admin_set_hostinger_password(
    account_id: uuid.UUID,
    payload: AdminSetHostingerPassword,
    admin: CurrentAdminAccount,
    db: DBSession,
) -> None:
    """The rarer, explicit action: actually changes the real Hostinger
    mailbox password. The target's Novamail login is unaffected by this
    - if it already has its own Novamail-only password set, that keeps
    working exactly as before; this only ever changes the real mailbox
    credential mail_client uses to fetch/send."""
    target = db.get(MailAccount, account_id)
    if not target:
        raise HTTPException(status_code=404, detail="Mailbox not found")
    _apply_hostinger_password_reset(db, target, payload.new_password)
    _audit(db, actor=admin, target=target, action="hostinger_password_reset")
    db.commit()


@router.get(
    "/admin/accounts/{account_id}/hostinger-password",
    response_model=AdminHostingerPasswordResponse,
)
def admin_view_hostinger_password(
    account_id: uuid.UUID, admin: CurrentAdminAccount, db: DBSession
) -> AdminHostingerPasswordResponse:
    target = db.get(MailAccount, account_id)
    if not target:
        raise HTTPException(status_code=404, detail="Mailbox not found")
    try:
        password = decrypt_mail_secret(target.credential_ciphertext)
    except ValueError as exc:
        raise HTTPException(
            status_code=503, detail="Mailbox credential must be reconnected"
        ) from exc
    _audit(db, actor=admin, target=target, action="hostinger_password_viewed")
    db.commit()
    return AdminHostingerPasswordResponse(address=target.address, password=password)


@router.get("/admin/hostinger-mailboxes", response_model=list[HostingerMailboxSummary])
def admin_hostinger_mailboxes(admin: CurrentAdminAccount, db: DBSession) -> list[HostingerMailboxSummary]:
    """The live view: every mailbox Hostinger actually has for the
    domain, cross-referenced with which ones have ever logged into
    Novamail (and so have a mail_accounts row/role) - not just the ones
    that happen to be in our own table already."""
    known = {row.address.lower(): row for row in db.scalars(select(MailAccount))}
    domains = {item.lower() for item in settings.MAIL_ALLOWED_DOMAINS}
    try:
        client = HostingerManagementClient()
        rows: list[dict] = []
        for domain in domains:
            rows.extend(client.list_all_mailboxes(domain))
    except HostingerApiError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    summaries: list[HostingerMailboxSummary] = []
    seen: set[str] = set()
    for row in rows:
        address = str(row.get("address", "")).lower()
        if not address or address in seen:
            continue
        seen.add(address)
        match = known.get(address)
        summaries.append(
            HostingerMailboxSummary(
                address=address,
                connected=match is not None,
                account_id=match.id if match else None,
                role=match.role if match else None,
            )
        )
    return summaries


@router.patch("/admin/accounts/{account_id}/profile", response_model=AdminAccountSummary)
def admin_set_profile(
    account_id: uuid.UUID, payload: AdminSetProfile, admin: CurrentAdminAccount, db: DBSession
) -> MailAccount:
    target = db.get(MailAccount, account_id)
    if not target:
        raise HTTPException(status_code=404, detail="Mailbox not found")
    target.display_name = payload.display_name.strip()
    _audit(db, actor=admin, target=target, action="profile_changed", detail="display_name")
    db.commit()
    db.refresh(target)
    return target


@router.post("/admin/accounts/{account_id}/avatar", response_model=AdminAccountSummary)
async def admin_set_avatar(
    account_id: uuid.UUID,
    admin: CurrentAdminAccount,
    db: DBSession,
    avatar: Annotated[UploadFile, File()],
) -> MailAccount:
    target = db.get(MailAccount, account_id)
    if not target:
        raise HTTPException(status_code=404, detail="Mailbox not found")
    if not (avatar.content_type or "").startswith("image/"):
        raise HTTPException(status_code=415, detail="Avatar must be an image")
    _, url, _, _ = await save_upload(avatar, folder=f"mail/avatars/{target.id}")
    target.avatar_url = url
    _audit(db, actor=admin, target=target, action="profile_changed", detail="avatar")
    db.commit()
    db.refresh(target)
    return target


@router.get("/admin/change-requests", response_model=list[AdminChangeRequestResponse])
def admin_list_change_requests(
    admin: CurrentAdminAccount,
    db: DBSession,
    status_filter: str = Query(default="pending", alias="status"),
) -> list[AdminChangeRequestResponse]:
    query = select(MailChangeRequest).order_by(MailChangeRequest.created_at.desc())
    if status_filter != "all":
        query = query.where(MailChangeRequest.status == status_filter)
    rows = list(db.scalars(query))
    accounts = {row.id: row for row in db.scalars(select(MailAccount))}
    return [
        AdminChangeRequestResponse(
            id=row.id,
            account_id=row.account_id,
            account_address=accounts[row.account_id].address if row.account_id in accounts else "",
            request_type=row.request_type,
            preview=row.payload_text if row.request_type != "password" else None,
            status=row.status,
            rejection_reason=row.rejection_reason,
            created_at=row.created_at,
            resolved_at=row.resolved_at,
            resolved_by_address=(
                accounts[row.resolved_by_account_id].address
                if row.resolved_by_account_id and row.resolved_by_account_id in accounts
                else None
            ),
        )
        for row in rows
    ]


@router.post("/admin/change-requests/{request_id}/approve", status_code=status.HTTP_204_NO_CONTENT)
def admin_approve_change_request(
    request_id: uuid.UUID, admin: CurrentAdminAccount, db: DBSession
) -> None:
    request = db.get(MailChangeRequest, request_id)
    if not request or request.status != "pending":
        raise HTTPException(status_code=404, detail="Request not found")
    target = db.get(MailAccount, request.account_id)
    if not target:
        raise HTTPException(status_code=404, detail="Mailbox not found")
    if request.request_type == "password":
        assert request.payload_ciphertext is not None
        new_password = decrypt_mail_secret(request.payload_ciphertext)
        _apply_novamail_password_reset(db, target, new_password)
        request.payload_ciphertext = None
    elif request.request_type == "display_name":
        assert request.payload_text is not None
        target.display_name = request.payload_text
    elif request.request_type == "avatar":
        assert request.payload_url is not None
        target.avatar_url = request.payload_url
    request.status = "approved"
    request.resolved_at = datetime.now(UTC)
    request.resolved_by_account_id = admin.id
    _audit(db, actor=admin, target=target, action="change_request_approved", detail=request.request_type)
    db.commit()


@router.post("/admin/change-requests/{request_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
def admin_reject_change_request(
    request_id: uuid.UUID,
    payload: AdminChangeRequestDecision,
    admin: CurrentAdminAccount,
    db: DBSession,
) -> None:
    request = db.get(MailChangeRequest, request_id)
    if not request or request.status != "pending":
        raise HTTPException(status_code=404, detail="Request not found")
    request.status = "rejected"
    request.rejection_reason = payload.reason
    request.resolved_at = datetime.now(UTC)
    request.resolved_by_account_id = admin.id
    request.payload_ciphertext = None
    _audit(
        db,
        actor=admin,
        target=db.get(MailAccount, request.account_id),
        action="change_request_rejected",
        detail=request.request_type,
    )
    db.commit()


@router.get("/admin/audit-log", response_model=list[AdminAuditLogEntry])
def admin_audit_log(
    admin: CurrentAdminAccount,
    db: DBSession,
    limit: int = Query(default=100, ge=1, le=500),
) -> list[AdminAuditLogEntry]:
    rows = list(db.scalars(select(MailAuditLog).order_by(MailAuditLog.created_at.desc()).limit(limit)))
    ids = {row.actor_account_id for row in rows} | {row.target_account_id for row in rows}
    ids.discard(None)
    accounts = (
        {a.id: a for a in db.scalars(select(MailAccount).where(MailAccount.id.in_(ids)))} if ids else {}
    )
    return [
        AdminAuditLogEntry(
            id=row.id,
            actor_address=(
                accounts[row.actor_account_id].address if row.actor_account_id in accounts else None
            ),
            target_address=(
                accounts[row.target_account_id].address if row.target_account_id in accounts else None
            ),
            action=row.action,
            detail=row.detail,
            created_at=row.created_at,
        )
        for row in rows
    ]
