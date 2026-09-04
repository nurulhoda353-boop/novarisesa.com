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

## Release checklist

1. Apply Alembic migration `20260904_0010`.
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
