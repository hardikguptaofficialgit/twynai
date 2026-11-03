"""Normalize avatar_path and enforce the model's non-null contract.

Revision ID: 20261103_0002
Revises: 20261103_0001
"""
from alembic import op
import sqlalchemy as sa

revision = "20261103_0002"
down_revision = "20261103_0001"
branch_labels = None
depends_on = None

LOCK_TIMEOUT = "5s"
STATEMENT_TIMEOUT = "60s"


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # SET LOCAL is scoped to Alembic's current transaction and cannot
        # permanently change Neon or the database role configuration.
        bind.execute(sa.text(f"SET LOCAL lock_timeout = '{LOCK_TIMEOUT}'"))
        bind.execute(sa.text(f"SET LOCAL statement_timeout = '{STATEMENT_TIMEOUT}'"))
    null_count = bind.execute(sa.text("SELECT COUNT(*) FROM personas WHERE avatar_path IS NULL")).scalar_one()
    if null_count:
        bind.execute(sa.text("UPDATE personas SET avatar_path = '' WHERE avatar_path IS NULL"))
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("personas") as batch:
            batch.alter_column("avatar_path", existing_type=sa.String(), nullable=False)
    else:
        op.alter_column("personas", "avatar_path", existing_type=sa.String(), nullable=False)


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("personas") as batch:
            batch.alter_column("avatar_path", existing_type=sa.String(), nullable=True)
    else:
        op.alter_column("personas", "avatar_path", existing_type=sa.String(), nullable=True)
