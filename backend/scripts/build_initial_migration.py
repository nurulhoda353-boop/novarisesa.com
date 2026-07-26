"""Generate the frozen initial PostgreSQL migration from SQLAlchemy metadata."""

from pathlib import Path

from sqlalchemy import create_mock_engine

import app.models  # noqa: F401
from app.core.database import Base

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "alembic" / "versions" / "20260726_0001_initial_platform_schema.py"


def collect_ddl(create: bool) -> list[str]:
    statements: list[str] = []

    def capture(sql, *_, **__) -> None:
        compiled = str(sql.compile(dialect=engine.dialect)).strip()
        if compiled:
            statements.append(compiled)

    engine = create_mock_engine("postgresql+psycopg://", capture)
    if create:
        Base.metadata.create_all(engine)
    else:
        Base.metadata.drop_all(engine)
    return statements


def calls(statements: list[str], indent: str = "    ") -> str:
    return "\n".join(f"{indent}op.execute({statement!r})" for statement in statements)


upgrade = ['CREATE EXTENSION IF NOT EXISTS "pgcrypto"'] + collect_ddl(create=True)
downgrade = collect_ddl(create=False)

content = f'''"""Initial NOVARISE CMS and management platform schema.

Revision ID: 20260726_0001
Revises:
Create Date: 2026-07-26
"""

from alembic import op

revision = "20260726_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
{calls(upgrade)}


def downgrade() -> None:
{calls(downgrade)}
'''

OUTPUT.write_text(content, encoding="utf-8", newline="\n")
print(f"Generated {OUTPUT.name}: {len(upgrade)} upgrade and {len(downgrade)} downgrade statements")
