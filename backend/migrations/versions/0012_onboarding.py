"""Verified account entry and required workspace setup."""

from alembic import op

revision = "0012_onboarding"
down_revision = "0011_ai_layer"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE workspace_members ADD COLUMN role text NOT NULL DEFAULT 'member';
        UPDATE workspace_members SET role = 'admin' WHERE is_admin IS TRUE;
        ALTER TABLE workspace_members DROP COLUMN is_admin;
        ALTER TABLE workspace_members ADD CONSTRAINT ck_workspace_members_role CHECK (role IN ('admin','member'));
        ALTER TABLE workspace_members ADD CONSTRAINT uq_workspace_members_user_id UNIQUE (user_id);
        ALTER TABLE workspaces ADD COLUMN setup_completed_at timestamptz;
        ALTER TABLE workspaces ADD COLUMN owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX ix_workspaces_owner_user_id ON workspaces(owner_user_id);
        UPDATE workspaces SET owner_user_id = created_by_user_id;
        INSERT INTO business_architecture_components (workspace_id, name, created_by_user_id)
          SELECT w.id, w.name, w.created_by_user_id FROM workspaces w
          WHERE NOT EXISTS (SELECT 1 FROM business_architecture_components a WHERE a.workspace_id = w.id);
        ALTER TABLE departments ADD COLUMN business_architecture_id uuid REFERENCES business_architecture_components(id) ON DELETE CASCADE;
        UPDATE departments d SET business_architecture_id = a.id FROM business_architecture_components a WHERE a.workspace_id = d.workspace_id;
        ALTER TABLE departments ALTER COLUMN business_architecture_id SET NOT NULL;
        CREATE INDEX ix_departments_business_architecture_id ON departments(business_architecture_id);
        ALTER TABLE departments ADD COLUMN department_head text;
        ALTER TABLE departments ADD COLUMN contact_name text;
        ALTER TABLE departments ADD COLUMN contact_email text;
        ALTER TABLE departments ADD COLUMN location text;
        ALTER TABLE departments ADD COLUMN headcount integer CHECK (headcount >= 0);
        CREATE TABLE email_verification_tokens (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash text NOT NULL UNIQUE,
          expires_at timestamptz NOT NULL,
          used_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_email_verification_tokens_user_id ON email_verification_tokens(user_id);
        CREATE TABLE email_outbox (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES users(id) ON DELETE CASCADE,
          invite_id uuid REFERENCES workspace_invites(id) ON DELETE CASCADE,
          recipient text NOT NULL,
          subject text NOT NULL,
          body text NOT NULL,
          status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
          attempts integer NOT NULL DEFAULT 0,
          available_at timestamptz NOT NULL DEFAULT now(),
          sent_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_email_outbox_user_id ON email_outbox(user_id);
        CREATE INDEX ix_email_outbox_invite_id ON email_outbox(invite_id);
    """)


def downgrade() -> None:
    op.drop_table("email_outbox")
    op.drop_table("email_verification_tokens")
    for column in ("headcount", "location", "contact_email", "contact_name", "department_head", "business_architecture_id"):
        op.drop_column("departments", column)
    op.drop_column("workspaces", "owner_user_id")
    op.drop_column("workspaces", "setup_completed_at")
    op.execute("""
        ALTER TABLE workspace_members ADD COLUMN is_admin boolean DEFAULT false;
        UPDATE workspace_members SET is_admin = (role = 'admin');
        ALTER TABLE workspace_members DROP CONSTRAINT uq_workspace_members_user_id;
        ALTER TABLE workspace_members DROP COLUMN role;
    """)
