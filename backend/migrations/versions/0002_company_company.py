from collections.abc import Sequence

from alembic import op

revision: str = "0002_company"
down_revision: str | Sequence[str] | None = "0001_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
    CREATE TABLE workspaces (
     id uuid CONSTRAINT pk_workspaces PRIMARY KEY DEFAULT gen_random_uuid(), created_by_user_id uuid NOT NULL CONSTRAINT fk_workspaces_created_by_user_id REFERENCES users(id) ON DELETE CASCADE,
     name text NOT NULL, legal_name text, business_unit text, description text, industry text, operating_model text, business_model text,
     primary_customers text, primary_products text, strategic_context text, company_size text, headquarters_region text, website text, logo_url text,
     annual_revenue double precision, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    """
    )
    op.execute(
        """
    CREATE TABLE workspace_members (
     id uuid CONSTRAINT pk_workspace_members PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_workspace_members_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, user_id uuid NOT NULL CONSTRAINT fk_workspace_members_user_id REFERENCES users(id) ON DELETE CASCADE,
     created_by_user_id uuid NOT NULL CONSTRAINT fk_workspace_members_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, is_admin boolean DEFAULT false, joined_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
     CONSTRAINT uq_workspace_members_workspace_id UNIQUE (workspace_id, user_id)
    );
    """
    )
    op.execute(
        """
    CREATE TABLE workspace_invites (
     id uuid CONSTRAINT pk_workspace_invites PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_workspace_invites_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, invited_email citext NOT NULL,
     invited_by_user_id uuid NOT NULL CONSTRAINT fk_workspace_invites_invited_by_user_id REFERENCES users(id) ON DELETE CASCADE, invite_token text CONSTRAINT uq_workspace_invites_invite_token UNIQUE, status text CONSTRAINT ck_workspace_invites_status CHECK (status IN ('pending','accepted','expired')),
     expires_at timestamptz, accepted_at timestamptz, created_by_user_id uuid NOT NULL CONSTRAINT fk_workspace_invites_created_by_user_id REFERENCES users(id) ON DELETE CASCADE,
     created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    """
    )
    op.execute(
        """
    CREATE TABLE departments (
     id uuid CONSTRAINT pk_departments PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_departments_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, parent_department_id uuid CONSTRAINT fk_departments_parent_department_id REFERENCES departments(id) ON DELETE CASCADE,
     name text NOT NULL, description text, created_by_user_id uuid NOT NULL CONSTRAINT fk_departments_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    """
    )
    op.execute(
        """
    CREATE INDEX ix_workspaces_created_by_user_id ON workspaces (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_workspace_members_workspace_id ON workspace_members (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_workspace_members_user_id ON workspace_members (user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_workspace_members_created_by_user_id ON workspace_members (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_workspace_invites_workspace_id ON workspace_invites (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_workspace_invites_invited_by_user_id ON workspace_invites (invited_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_workspace_invites_created_by_user_id ON workspace_invites (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_departments_workspace_id ON departments (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_departments_parent_department_id ON departments (parent_department_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_departments_created_by_user_id ON departments (created_by_user_id);
    """
    )


def downgrade() -> None:
    op.drop_table("departments")
    op.drop_table("workspace_invites")
    op.drop_table("workspace_members")
    op.drop_table("workspaces")
