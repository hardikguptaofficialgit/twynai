"""Persist the selected generated avatar without changing uploaded photos.

Revision ID: 20261104_0003
Revises: 20261103_0002
"""
from alembic import op
import sqlalchemy as sa

revision = "20261104_0003"
down_revision = "20261103_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("personas", sa.Column("avatar_seed", sa.String(), nullable=False, server_default="twyn-01"))


def downgrade() -> None:
    op.drop_column("personas", "avatar_seed")
