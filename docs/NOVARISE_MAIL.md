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

The app intentionally has no Firebase dependency. It refreshes on launch,
resume, pull-to-refresh, and while active. Reliable killed-app notifications
require direct APNs credentials for iOS and an Android push transport or a
self-hosted UnifiedPush distributor; those are deployment credentials, not
application source concerns.

## Release checklist

1. Apply Alembic migration `20260904_0010`.
2. Configure the production secrets above and deploy the API.
3. Verify IMAP/SMTP egress on ports 993 and 465 from the API container.
4. Run backend tests and a live test against a dedicated mailbox.
5. Build a signed Android App Bundle with the company keystore.
6. Archive iOS on macOS/Xcode with the Apple Developer team and distribute via
   TestFlight/App Store.
