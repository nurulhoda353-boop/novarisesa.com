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
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.mail_crypto import decrypt_mail_secret, encrypt_mail_secret
from app.core.mobile_auth import CurrentMailAccount, MobileUser
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
)
from app.core.storage import save_upload
from app.models import (
    MailAccount,
    MailContact,
    MailDevice,
    MailDraft,
    MailMessageCache,
    RefreshToken,
    User,
)
from app.schemas.mail import (
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
    MailAccountResponse,
    MailLoginRequest,
    MailMessageDetail,
    MailMessageList,
    MailPasswordChange,
    MailProfileUpdate,
    MobileRefreshRequest,
    MobileSessionResponse,
    MoveRequest,
    SendMailRequest,
)
from app.services.hostinger_api import HostingerApiError, HostingerManagementClient
from app.services.mail_client import HostingerMailboxClient, MailConnectionError
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
    )


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
    try:
        HostingerMailboxClient(address, payload.password).verify()
    except MailConnectionError as exc:
        record_rate_event(db, scope="mail.login.identity", key_hash=identity_key)
        record_rate_event(db, scope="mail.login.ip", key_hash=ip_key)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid mailbox email or password") from exc
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
    account.display_name = payload.display_name.strip()
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
    account.avatar_url = url
    db.commit()
    db.refresh(account)
    return account_response(account)


@router.post("/account/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(payload: MailPasswordChange, account: CurrentMailAccount, db: DBSession) -> None:
    try:
        HostingerMailboxClient(account.address, payload.current_password).verify()
        client = HostingerManagementClient()
        mailbox_id = account.hostinger_mailbox_id
        if not mailbox_id:
            found = client.find_mailbox(account.address)
            if not found:
                raise HostingerApiError("Mailbox was not found in the Hostinger account")
            account.hostinger_order_id, mailbox_id = found
            account.hostinger_mailbox_id = mailbox_id
        client.change_mailbox_password(mailbox_id, payload.new_password)
    except MailConnectionError as exc:
        raise HTTPException(status_code=401, detail="Current mailbox password is incorrect") from exc
    except HostingerApiError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    account.credential_ciphertext = encrypt_mail_secret(payload.new_password)
    account.credential_type = "mailbox_password"
    db.commit()


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
    try:
        mailbox_client(account).move(folder, uid, payload.destination)
    except MailConnectionError as exc:
        raise mail_error(exc) from exc


@router.delete("/messages/{uid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(uid: int, account: CurrentMailAccount, folder: str = Query("INBOX")) -> None:
    try:
        mailbox_client(account).delete(folder, uid)
    except MailConnectionError as exc:
        raise mail_error(exc) from exc


@router.post("/messages/send")
def send_message(payload: SendMailRequest, account: CurrentMailAccount) -> dict[str, str]:
    try:
        message_id = mailbox_client(account).send(payload.model_dump(mode="json"), account.display_name)
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
