"""Baseline schema matching the existing Twyn database.

Revision ID: 20261103_0001
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "20261103_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "owners",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("google_tokens", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="owners_email_key"),
    )
    op.create_table(
        "personas",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("handle", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("headline", sa.String(), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False),
        sa.Column("rates", sa.Text(), nullable=False),
        sa.Column("faqs", sa.Text(), nullable=False),
        sa.Column("links", sa.Text(), nullable=False),
        sa.Column("tone", sa.String(), nullable=False),
        sa.Column("accent", sa.String(), nullable=False),
        sa.Column("avatar_path", sa.String(), nullable=True, server_default=sa.text("''")),
        sa.Column("voice_embedding", sa.Text(), nullable=False),
        sa.Column("voice_sample_path", sa.String(), nullable=False),
        sa.Column("languages", sa.Text(), nullable=False),
        sa.Column("availability", sa.Text(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False),
        sa.Column("onboarding_step", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["owners.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("handle", name="personas_handle_key"),
    )
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["owners.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "chunks",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("persona_id", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("embedding", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["persona_id"], ["personas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "document_assets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("persona_id", sa.String(), nullable=False),
        sa.Column("original_name", sa.String(), nullable=False),
        sa.Column("object_path", sa.String(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("checksum_sha256", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["persona_id"], ["personas.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("object_path", name="document_assets_object_path_key"),
    )
    op.create_index("ix_document_assets_persona_id", "document_assets", ["persona_id"], unique=False)
    op.create_table(
        "conversations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("persona_id", sa.String(), nullable=False),
        sa.Column("visitor_name", sa.String(), nullable=False),
        sa.Column("channel", sa.String(), nullable=False),
        sa.Column("language", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("takeover", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["persona_id"], ["personas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "messages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("conversation_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("meta", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "leads",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("persona_id", sa.String(), nullable=False),
        sa.Column("conversation_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("contact", sa.String(), nullable=False),
        sa.Column("intent", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["persona_id"], ["personas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "bookings",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("persona_id", sa.String(), nullable=False),
        sa.Column("conversation_id", sa.String(), nullable=False),
        sa.Column("guest_name", sa.String(), nullable=False),
        sa.Column("guest_email", sa.String(), nullable=False),
        sa.Column("start", sa.String(), nullable=False),
        sa.Column("end", sa.String(), nullable=False),
        sa.Column("topic", sa.String(), nullable=False),
        sa.Column("calendar_event_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["persona_id"], ["personas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "provider_spend",
        sa.Column("month", sa.String(), nullable=False),
        sa.Column("spent_micros", sa.Integer(), nullable=False),
        sa.Column("reserved_micros", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("month"),
    )


def downgrade() -> None:
    op.drop_index("ix_document_assets_persona_id", table_name="document_assets")
    for table in ("provider_spend", "bookings", "leads", "messages", "conversations", "document_assets", "chunks", "sessions", "personas", "owners"):
        op.drop_table(table)
