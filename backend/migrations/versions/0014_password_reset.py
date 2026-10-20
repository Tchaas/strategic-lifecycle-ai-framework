"""Single-use password reset tokens and outbox message kinds."""

from alembic import op

revision = "0014_password_reset"
down_revision = "0013_email_delivery"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE password_reset_tokens (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash text NOT NULL UNIQUE,
          expires_at timestamptz NOT NULL,
          used_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_password_reset_tokens_user_id ON password_reset_tokens(user_id);
        ALTER TABLE email_outbox ADD COLUMN kind text NOT NULL DEFAULT 'verification';
        UPDATE email_outbox SET kind = 'invitation' WHERE invite_id IS NOT NULL;
        ALTER TABLE email_outbox ALTER COLUMN kind DROP DEFAULT;
        ALTER TABLE email_outbox ADD CONSTRAINT ck_email_outbox_kind
          CHECK (kind IN ('verification','invitation','password_reset','password_changed'));
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE email_outbox DROP CONSTRAINT ck_email_outbox_kind")
    op.drop_column("email_outbox", "kind")
    op.drop_table("password_reset_tokens")
