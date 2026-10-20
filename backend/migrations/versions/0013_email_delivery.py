"""Identify the selected mail transport and retain safe delivery diagnostics."""

from alembic import op

revision = "0013_email_delivery"
down_revision = "0012_onboarding"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Historical rows have no reliable recorded provider. Never assume they were external.
    op.execute("""
        ALTER TABLE email_outbox ADD COLUMN delivery_provider text NOT NULL DEFAULT 'unknown';
        ALTER TABLE email_outbox ADD COLUMN provider_message_id text;
        ALTER TABLE email_outbox ADD COLUMN last_error_code text;
    """)


def downgrade() -> None:
    op.drop_column("email_outbox", "last_error_code")
    op.drop_column("email_outbox", "provider_message_id")
    op.drop_column("email_outbox", "delivery_provider")
