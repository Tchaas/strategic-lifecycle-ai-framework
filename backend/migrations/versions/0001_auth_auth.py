from collections.abc import Sequence

from alembic import op

revision: str = "0001_auth"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
    CREATE EXTENSION IF NOT EXISTS citext;
    """
    )
    op.execute(
        """
    CREATE TABLE users (
     id uuid CONSTRAINT pk_users PRIMARY KEY DEFAULT gen_random_uuid(),
     email citext NOT NULL CONSTRAINT uq_users_email UNIQUE,
     full_name text, avatar_url text,
     auth_provider text NOT NULL CONSTRAINT ck_users_auth_provider CHECK (auth_provider IN ('password','google')),
     password_hash text, google_sub text, email_verified boolean DEFAULT false,
     last_login_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    """
    )
    op.execute(
        """
    CREATE TABLE refresh_tokens (
     id uuid CONSTRAINT pk_refresh_tokens PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL CONSTRAINT fk_refresh_tokens_user_id REFERENCES users(id) ON DELETE CASCADE,
     token_hash text NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now()
    );
    """
    )
    op.execute(
        """
    CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens (user_id);
    """
    )


def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("users")
