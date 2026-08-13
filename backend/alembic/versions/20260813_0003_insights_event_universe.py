"""Add event stories and complete the six-item public demo universe.

Revision ID: 20260813_0003
Revises: 20260813_0002
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg

revision: str = "20260813_0003"
down_revision: str | None = "20260813_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "event_translations",
        sa.Column("body", pg.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
    )

    # Keep the original launch records recoverable while presenting the six
    # curated long-form stories requested for the public journal.
    op.execute(
        """
        UPDATE posts SET status = 'archived'
        WHERE slug IN (
          'oil-gas-shutdown-readiness',
          'supply-chain-localization-vision-2030',
          'psm-process-safety-management'
        )
        """
    )

    op.execute(
        """
        INSERT INTO events (slug, starts_on, ends_on, status, is_featured, sort_order)
        VALUES
          ('future-projects-and-industrial-delivery-forum', '2026-10-19', '2026-10-20', 'published', false, 2),
          ('zero-harm-leadership-masterclass', '2026-11-12', '2026-11-12', 'published', false, 3)
        ON CONFLICT (slug) DO UPDATE SET
          starts_on = EXCLUDED.starts_on,
          ends_on = EXCLUDED.ends_on,
          status = EXCLUDED.status,
          sort_order = EXCLUDED.sort_order
        """
    )

    op.execute(
        """
        INSERT INTO event_translations
          (event_id, locale, title, event_type, location, description, date_display, body, meta_title, meta_description)
        SELECT id, 'en',
          'Future Projects & Industrial Delivery Forum', 'Conference', 'Riyadh, Saudi Arabia',
          'A two-day leadership forum on scaling delivery capacity across Saudi Arabia''s next wave of industrial and infrastructure programmes.',
          'October 19–20, 2026',
          '{"time":"8:30 AM–5:30 PM","venue":"King Abdullah Financial District Conference Centre","overview":["Project leaders are entering a delivery cycle defined by concurrent programmes and shared resource constraints.","NOVARISE will contribute field evidence on mobilisation readiness, equipment planning and multi-discipline coordination."],"takeaways":["Practical capacity-planning frameworks","Peer insight from major programmes","Direct access to delivery specialists"]}'::jsonb,
          'Future Projects & Industrial Delivery Forum — NOVARISE',
          'Join NOVARISE in Riyadh for a leadership forum on scaling industrial project delivery capacity.'
        FROM events WHERE slug = 'future-projects-and-industrial-delivery-forum'
        ON CONFLICT (event_id, locale) DO UPDATE SET
          title = EXCLUDED.title, event_type = EXCLUDED.event_type, location = EXCLUDED.location,
          description = EXCLUDED.description, date_display = EXCLUDED.date_display, body = EXCLUDED.body,
          meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description
        """
    )

    op.execute(
        """
        INSERT INTO event_translations
          (event_id, locale, title, event_type, location, description, date_display, body, meta_title, meta_description)
        SELECT id, 'en',
          'Zero-Harm Leadership Masterclass', 'Webinar', 'Online · Live + On-demand',
          'A practical masterclass for supervisors and project leaders on turning HSE expectations into consistent workfront behaviour.',
          'November 12, 2026',
          '{"time":"2:00–3:15 PM AST","venue":"Microsoft Teams Live","overview":["Safety performance changes when leaders translate policy into observable routines.","Participants will leave with a compact leadership framework that can be applied immediately."],"takeaways":["A repeatable field-leadership routine","Better leading-indicator conversations","Live access to NOVARISE HSE specialists"]}'::jsonb,
          'Zero-Harm Leadership Masterclass — NOVARISE',
          'Join NOVARISE HSE leadership for a practical live masterclass on building zero-harm behaviour.'
        FROM events WHERE slug = 'zero-harm-leadership-masterclass'
        ON CONFLICT (event_id, locale) DO UPDATE SET
          title = EXCLUDED.title, event_type = EXCLUDED.event_type, location = EXCLUDED.location,
          description = EXCLUDED.description, date_display = EXCLUDED.date_display, body = EXCLUDED.body,
          meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE posts SET status = 'published'
        WHERE slug IN (
          'oil-gas-shutdown-readiness',
          'supply-chain-localization-vision-2030',
          'psm-process-safety-management'
        )
        """
    )
    op.execute(
        "DELETE FROM events WHERE slug IN ('future-projects-and-industrial-delivery-forum', 'zero-harm-leadership-masterclass')"
    )
    op.drop_column("event_translations", "body")
