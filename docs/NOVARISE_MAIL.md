# Novarise Mail

Novarise Mail is the first-party Android/iOS client for mailboxes hosted under
`novarisesa.com`. Hostinger remains the mailbox system of record. The existing
FastAPI and PostgreSQL deployment provides mobile sessions, encrypted mailbox
credential storage, profile data, cache policy, drafts, contacts, and a safe
gateway to IMAP, SMTP, and the Hostinger management API.

## Backend configuration

Production requires these additional secrets/settings in Coolify:

```env
MAIL_CREDENTIAL_SECRET=<independent random value of at least 32 characters>
MAIL_ALLOWED_DOMAINS=["novarisesa.com"]
HOSTINGER_API_TOKEN=<rotated Hostinger account API token>
```

Do not copy `Access token.js` into an image or commit any token. Rotate the
existing Hostinger token before deployment because it has previously been kept
in plaintext in the workspace.

The mobile app defaults to `https://api.novarisesa.com/api/v1`. Override it for
a development build with:

```powershell
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

## Mail behavior

- IMAP over TLS reads and synchronizes folders and messages.
- SMTP over TLS sends messages using the mailbox identity.
- Message bodies read in the app are cached encrypted on the API for the
  mailbox-configured retention period (30 days by default).
- Hostinger's management API changes the real mailbox password and manages
  aliases, forwarders, and automatic replies.
- Sender display name and avatar are Novarise Mail profile properties. SMTP
  carries the display name to recipients, but Hostinger does not expose an API
  that also updates its separate Webmail Identity UI.
- Hostinger does not support renaming an existing mailbox address. A new
  mailbox or alias plus migration is required.

## Notifications without Firebase

The app has no Firebase dependency. Instead it uses a self-hosted push
channel:

- The API exposes a WebSocket at `/mail/ws` (`app/api/routes/mail.py`,
  `app/services/mail_watcher.py`). On connect it starts (or reuses) an IMAP
  IDLE watcher thread for that mailbox — one real IMAP connection held open
  per actively-watched account — and broadcasts `{"event": "new_mail", ...}`
  to every subscribed device the instant IMAP reports new mail. This needs
  the `imapclient` dependency (already in `pyproject.toml`).
- The mobile app (`mobile/lib/core/push_service.dart`) keeps that socket open
  while the app is alive (foreground or recently backgrounded) and shows a
  local notification the instant an event arrives — effectively instant,
  same as FCM, with no Google dependency.
- When the app has been fully killed, Android's WorkManager
  (`registerBackgroundSync`) runs a lightweight inbox check roughly every 15
  minutes (the OS's minimum interval for periodic background work) and posts
  a notification if new mail is found. This is the same category of
  mechanism apps like K-9 Mail/FairEmail use without Google Play Services.
- iOS killed-app push still has no equivalent in this build: that requires
  direct APNs credentials (an Apple-issued mechanism, not Firebase) which are
  a deployment credential, not something built in source. Foreground/
  background-alive push works identically to Android via the same WebSocket.
- The in-memory watcher registry is per-process. If the API is ever scaled to
  multiple workers, replace it with a shared broker (e.g. Redis pub/sub) so
  every worker's WebSocket connections see the same IMAP IDLE events.

## Server-side snooze

Snoozing a message is real, not a local reminder: `POST
/mail/messages/{uid}/snooze` moves it into an `INBOX.Snoozed` folder
(created on first use) and records the wake time in the `mail_snoozes`
table. A background poll loop started from `app.main`'s lifespan
(`app/services/mail_snooze.py`, every 30s) moves each message back to its
original folder the instant its wake time arrives, whether or not the
user's device is online then. The mobile app also schedules a local
notification for the same moment via WorkManager so the device pings, but
the actual hide/reveal is entirely server-driven. Like the IMAP IDLE
watcher registry, this loop is per-process — scaling the API to multiple
workers would double-process due snoozes without adding a shared lock
(e.g. a Postgres advisory lock) first.

## Web client

`webmail/` is a separate Next.js app (own `package.json`/Dockerfile,
deployed as the Coolify app `novamail-web` at `mail.novarisesa.com`) that
is purely a frontend against the same `/mail/*` API the mobile app uses —
no server-side changes were needed beyond the two below. It stores the
access token in memory and the refresh token in `localStorage` per saved
account (mirroring the mobile app's secure-storage multi-account model),
and reuses `/mail/ws` for real-time push.

Two small API changes exist only to support the web client:
- `GET /mail/messages` takes a `starred` query param (IMAP `FLAGGED`
  search) — used for the Starred view, since browsers have no equivalent
  of the mobile app's per-row star icon as a dedicated screen.
- `/mail/ws` (and the shared mobile-auth dependency behind it) accepts the
  access token via an `access_token` query parameter as well as the
  `Authorization` header, because a browser's native WebSocket API cannot
  set custom headers on the handshake.

## Release checklist

1. Apply Alembic migrations `20260904_0010` through `20260905_0012`.
2. Configure the production secrets above and deploy the API (with the
   `imapclient` dependency installed — it ships in `pyproject.toml`).
3. Verify IMAP/SMTP egress on ports 993 and 465 from the API container, and
   that long-lived WebSocket connections aren't dropped by an
   idle-connection timeout in front of the API (Coolify/Traefik/Cloudflare) —
   the mobile client pings every 30s, but a very aggressive proxy timeout
   below that would still cut IMAP IDLE watchers off from their devices.
4. Run backend tests (`pytest`) and a live test against a dedicated mailbox,
   including opening `/mail/ws` and confirming a `new_mail` event arrives
   when a test message is delivered.
5. Build a signed Android App Bundle with the company keystore. The debug
   build in this repo enables `isCoreLibraryDesugaringEnabled` in
   `android/app/build.gradle.kts` for `flutter_local_notifications` — keep
   that when regenerating Gradle config.
6. Archive iOS on macOS/Xcode with the Apple Developer team and distribute via
   TestFlight/App Store.

## Additions since the first release

- **Google Workspace mailboxes** (`MailAccount.provider = "google"`): same
  `HostingerMailboxClient`, pointed at Gmail's IMAP/SMTP via
  `MAIL_GOOGLE_*` settings. Connected by an admin with an app password;
  Hostinger-only features (aliases, forwarders, auto-reply) don't apply.
  Gmail names its system folders differently (`[Gmail]/Sent Mail`, ...), so
  the web client maps its Sent/Archive/Spam/Trash entries to each mailbox's
  real folder by special-use flag (`resolveSystemFolders` in
  `webmail/lib/types.ts`), keeping Hostinger's own `INBOX.*` names when
  they exist.
- **Roles and admin panel** (`/admin` on the web app): admins can switch
  into any mailbox without its password, reset Novamail-only logins, create
  mailboxes, connect Google ones, review member change requests (name,
  photo, password, message deletion) and read the audit log. Members can't
  move/archive/delete mail directly.
- **Rules** (`/mail/rules`): applied by the IMAP IDLE watcher to new INBOX
  mail (first enabled match wins).
- **Send later / Undo send**: both are rows in `mail_scheduled_sends`,
  fired by a 5-second poll loop (`mail_scheduled_send.py`).
- **Directory sync**: a 30-minute loop creates stub accounts for every
  Hostinger mailbox so the compose dropdown lists all teammates.
- **Health monitor**: logs a greppable `ALERT:` line when mail loggers warn
  repeatedly or webmail refreshes keep failing.
- **Sessions**: `POST /mail/auth/logout` takes an optional
  `{"refresh_token": ...}` and then revokes only that session; with no body
  it still revokes every session for the mailbox. The web and mobile apps
  send it, so signing out on one device no longer kills an admin's saved
  "switched into this mailbox" sessions. Web `switchAccount` leaves the
  current account untouched if the target's saved sign-in has expired.
- **Message list performance**: `HostingerMailboxClient.messages()` fetches
  headers/preview for up to 25 UIDs per IMAP FETCH instead of one round
  trip per message.
- **WebSocket event shape**: `{"event": "new_mail", "folder", "uid"}` - both
  clients read `event`.
- Drafts now keep their attached files (base64 in the draft's JSON column,
  capped at 10 MB per draft on the web client).
