from collections.abc import Sequence

from alembic import op

revision: str = "0003_architecture_core"
down_revision: str | Sequence[str] | None = "0002_company"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
    CREATE TABLE business_architecture_components (id uuid CONSTRAINT pk_business_architecture_components PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT uq_business_architecture_components_workspace_id UNIQUE CONSTRAINT fk_business_architecture_components_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, name text NOT NULL, description text, current_state_summary text, future_state_summary text, origin text DEFAULT 'architecture' CONSTRAINT ck_business_architecture_components_origin CHECK (origin IN ('architecture','discovery')), status text DEFAULT 'draft' CONSTRAINT ck_business_architecture_components_status CHECK (status IN ('draft','active')), created_by_user_id uuid NOT NULL CONSTRAINT fk_business_architecture_components_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE value_streams (id uuid CONSTRAINT pk_value_streams PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_value_streams_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, business_architecture_id uuid NOT NULL CONSTRAINT fk_value_streams_business_architecture_id REFERENCES business_architecture_components(id) ON DELETE CASCADE, name text NOT NULL, description text, value_stream_type text CONSTRAINT ck_value_streams_value_stream_type CHECK (value_stream_type IN ('current_state','future_state','modified_existing')), strategic_alignment text, triggering_stakeholder text, value_recipient text, linked_department_id uuid CONSTRAINT fk_value_streams_linked_department_id REFERENCES departments(id) ON DELETE CASCADE, origin text DEFAULT 'architecture' CONSTRAINT ck_value_streams_origin CHECK (origin IN ('architecture','discovery')), status text DEFAULT 'draft' CONSTRAINT ck_value_streams_status CHECK (status IN ('draft','active')), created_by_user_id uuid NOT NULL CONSTRAINT fk_value_streams_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE key_activities (id uuid CONSTRAINT pk_key_activities PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_key_activities_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, value_stream_id uuid NOT NULL CONSTRAINT fk_key_activities_value_stream_id REFERENCES value_streams(id) ON DELETE CASCADE, activity_name text NOT NULL, activity_description text, sequence_order integer, current_state_issue text, future_state_change text, business_impact text, origin text DEFAULT 'architecture' CONSTRAINT ck_key_activities_origin CHECK (origin IN ('architecture','discovery')), status text DEFAULT 'draft' CONSTRAINT ck_key_activities_status CHECK (status IN ('draft','active')), created_by_user_id uuid NOT NULL CONSTRAINT fk_key_activities_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE business_capabilities (id uuid CONSTRAINT pk_business_capabilities PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_business_capabilities_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, business_architecture_id uuid NOT NULL CONSTRAINT fk_business_capabilities_business_architecture_id REFERENCES business_architecture_components(id) ON DELETE CASCADE, capability_name text NOT NULL, capability_description text, current_maturity text, target_maturity text, capability_gap text, owning_department_id uuid CONSTRAINT fk_business_capabilities_owning_department_id REFERENCES departments(id) ON DELETE CASCADE, origin text DEFAULT 'architecture' CONSTRAINT ck_business_capabilities_origin CHECK (origin IN ('architecture','discovery')), status text DEFAULT 'draft' CONSTRAINT ck_business_capabilities_status CHECK (status IN ('draft','active')), created_by_user_id uuid NOT NULL CONSTRAINT fk_business_capabilities_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE value_stream_capabilities (id uuid CONSTRAINT pk_value_stream_capabilities PRIMARY KEY DEFAULT gen_random_uuid(), value_stream_id uuid NOT NULL CONSTRAINT fk_value_stream_capabilities_value_stream_id REFERENCES value_streams(id) ON DELETE CASCADE, capability_id uuid NOT NULL CONSTRAINT fk_value_stream_capabilities_capability_id REFERENCES business_capabilities(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_value_stream_capabilities_value_stream_id UNIQUE (value_stream_id, capability_id));
    """
    )
    op.execute(
        """
    CREATE TABLE key_activity_capabilities (id uuid CONSTRAINT pk_key_activity_capabilities PRIMARY KEY DEFAULT gen_random_uuid(), key_activity_id uuid NOT NULL CONSTRAINT fk_key_activity_capabilities_key_activity_id REFERENCES key_activities(id) ON DELETE CASCADE, capability_id uuid NOT NULL CONSTRAINT fk_key_activity_capabilities_capability_id REFERENCES business_capabilities(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_key_activity_capabilities_key_activity_id UNIQUE (key_activity_id, capability_id));
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_architecture_components_workspace_id ON business_architecture_components (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_architecture_components_created_by_user_id ON business_architecture_components (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_value_streams_workspace_id ON value_streams (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_value_streams_business_architecture_id ON value_streams (business_architecture_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_value_streams_linked_department_id ON value_streams (linked_department_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_value_streams_created_by_user_id ON value_streams (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_key_activities_workspace_id ON key_activities (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_key_activities_value_stream_id ON key_activities (value_stream_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_key_activities_created_by_user_id ON key_activities (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_capabilities_workspace_id ON business_capabilities (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_capabilities_business_architecture_id ON business_capabilities (business_architecture_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_capabilities_owning_department_id ON business_capabilities (owning_department_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_capabilities_created_by_user_id ON business_capabilities (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_value_stream_capabilities_capability_id ON value_stream_capabilities (capability_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_key_activity_capabilities_capability_id ON key_activity_capabilities (capability_id);
    """
    )


def downgrade() -> None:
    op.drop_table("key_activity_capabilities")
    op.drop_table("value_stream_capabilities")
    op.drop_table("business_capabilities")
    op.drop_table("key_activities")
    op.drop_table("value_streams")
    op.drop_table("business_architecture_components")
