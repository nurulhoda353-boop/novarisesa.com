"""Add production team access roles and account lifecycle fields.

Revision ID: 20260820_0009
Revises: 20260814_0008
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260820_0009"
down_revision: str | None = "20260814_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "must_change_password",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "users", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "users", sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column(
            "created_by_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
    )
    op.create_foreign_key(
        "fk_users_created_by_id_users",
        "users",
        "users",
        ["created_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_users_created_by_id", "users", ["created_by_id"])

    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM roles WHERE name = 'owner')
             AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'super_admin') THEN
            UPDATE roles
               SET name = 'super_admin',
                   description = 'Full developer-level access, security and team administration'
             WHERE name = 'owner';
          END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        DECLARE
          old_role uuid;
          new_role uuid;
        BEGIN
          SELECT id INTO old_role FROM roles WHERE name = 'owner';
          SELECT id INTO new_role FROM roles WHERE name = 'super_admin';
          IF old_role IS NOT NULL AND new_role IS NOT NULL THEN
            INSERT INTO user_roles (user_id, role_id)
            SELECT user_id, new_role FROM user_roles WHERE role_id = old_role
            ON CONFLICT DO NOTHING;
            DELETE FROM roles WHERE id = old_role;
          END IF;
        END $$;
        """
    )
    op.execute(
        """
        INSERT INTO permissions (id, code, description)
        VALUES
          (gen_random_uuid(), 'cms.manage_security', 'Reset passwords and revoke dashboard sessions'),
          (gen_random_uuid(), 'cms.view_audit', 'View security and account activity logs')
        ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

        INSERT INTO roles (id, name, description, is_system, created_at, updated_at)
        VALUES
          (gen_random_uuid(), 'super_admin', 'Full developer-level access, security and team administration', true, now(), now()),
          (gen_random_uuid(), 'admin', 'Publish content, manage enquiries and control website settings', true, now(), now()),
          (gen_random_uuid(), 'editor', 'Create and edit website content and media without publishing', true, now(), now())
        ON CONFLICT (name) DO UPDATE
          SET description = EXCLUDED.description,
              is_system = true,
              updated_at = now();

        DELETE FROM role_permissions
         WHERE role_id IN (SELECT id FROM roles WHERE name IN ('super_admin', 'admin', 'editor'));

        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
          FROM roles r CROSS JOIN permissions p
         WHERE r.name = 'super_admin'
        ON CONFLICT DO NOTHING;

        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
          FROM roles r JOIN permissions p ON p.code IN (
            'cms.view', 'cms.publish', 'cms.manage_content', 'cms.manage_media',
            'cms.manage_inbox', 'cms.manage_settings'
          )
         WHERE r.name = 'admin'
        ON CONFLICT DO NOTHING;

        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
          FROM roles r JOIN permissions p ON p.code IN (
            'cms.view', 'cms.manage_content', 'cms.manage_media'
          )
         WHERE r.name = 'editor'
        ON CONFLICT DO NOTHING;
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE name = 'admin')")
    op.execute("DELETE FROM roles WHERE name = 'admin'")
    op.execute("UPDATE roles SET name = 'owner' WHERE name = 'super_admin'")
    op.execute("DELETE FROM permissions WHERE code IN ('cms.manage_security', 'cms.view_audit')")
    op.drop_index("ix_users_created_by_id", table_name="users")
    op.drop_constraint("fk_users_created_by_id_users", "users", type_="foreignkey")
    op.drop_column("users", "created_by_id")
    op.drop_column("users", "suspended_at")
    op.drop_column("users", "password_changed_at")
    op.drop_column("users", "must_change_password")
