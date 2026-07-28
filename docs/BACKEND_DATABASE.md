# NOVARISE Backend and Database Architecture

## Deployment targets

- Public website: `https://novarisesa.com`
- FastAPI: `https://api.novarisesa.com`
- CMS dashboard: `https://my.novarisesa.com` (app in `dashboard/`, port 3001)
- Database: private PostgreSQL in the Coolify `novarisesa / production` environment

The browser applications communicate only with FastAPI. PostgreSQL must not be exposed to the public internet.

## Data domains

| Domain | Main tables | Purpose |
| --- | --- | --- |
| Identity and access | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `refresh_tokens` | Dashboard users, RBAC, and session rotation |
| CMS foundation | `pages`, `page_translations`, `navigation_items`, `site_settings`, `media_assets` | Editable pages, EN/AR content, menus, settings, and media |
| Services | `services`, `service_translations` | Service pages, capabilities, stats, process, certifications, and FAQs |
| Projects | `projects`, `project_translations`, `project_media` | Portfolio content and galleries |
| Publishing | `posts`, `post_translations`, `categories`, `tags`, `post_tags` | Blog/news publishing |
| Manpower | `requirements`, `requirement_translations`, `requirement_contacts`, `requirement_applications` | Urgent requirements and candidate intake |
| Sales and communication | `contact_submissions`, `rfq_submissions`, `newsletter_subscribers` | Contact leads, quotations, and subscriptions |
| Governance | `audit_logs` | Immutable record of dashboard mutations |

## Design decisions

- UUID primary keys avoid predictable public identifiers and simplify future distributed services.
- All timestamps are timezone-aware.
- EN/AR text uses translation tables where content is searchable and independently publishable.
- Flexible page sections and rich editor content use PostgreSQL `JSONB`.
- Public content uses explicit draft, published, and archived states.
- Incoming leads use a consistent workflow: new, in review, contacted, qualified, closed, or spam.
- Foreign keys define deliberate delete behavior; operational submissions cannot disappear through casual CMS deletion.
- Audit records capture actor, action, entity, before/after values, IP, and user agent.
- Secrets and credentials never belong in database content, Git, or CMS settings.
- Media files are stored under `MEDIA_ROOT` and served from `/media` (or a CDN/base URL via `MEDIA_PUBLIC_BASE_URL`).

## Initial migration

Revision `20260726_0001` creates:

- 29 tables
- three shared PostgreSQL enum types
- indexes and uniqueness constraints
- `pgcrypto` for database-side UUID generation

Revision `20260726_0002` makes application email nullable.

The API container applies migrations before starting. A failed migration prevents the API from accepting traffic.

## Current platform status

Delivered:

1. Authentication, refresh-token rotation, seeded `owner` / `editor` roles, and permission enforcement on CMS routes.
2. Public write endpoints for contact, RFQ, newsletter, and requirement applications.
3. Public read endpoint `/public/site-content` (collections, settings, navigation).
4. Local media upload/storage API with CMS media library UI.
5. Dashboard CRUD for content, inbox, settings, navigation, categories/tags, users, and audit logging.
6. Workspace search (`/cms/search`) and permission-aware Control Center UI.

## Next implementation milestone

1. Optional S3-compatible object storage for media (Coolify volume or external bucket).
2. Daily PostgreSQL backups in Coolify with off-server S3-compatible storage.
3. Rich-text / block editor for page and post body content.
4. Broader integration tests for authenticated CMS flows against a real Postgres instance.
