from collections.abc import Sequence

from alembic import op

revision: str = "0004_architecture_supporting"
down_revision: str | Sequence[str] | None = "0003_architecture_core"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
    CREATE TABLE business_processes (id uuid CONSTRAINT pk_business_processes PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_business_processes_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, business_architecture_id uuid NOT NULL CONSTRAINT fk_business_processes_business_architecture_id REFERENCES business_architecture_components(id) ON DELETE CASCADE, process_name text NOT NULL, current_state_process text, future_state_process text, process_gap text, impacted_systems text, linked_value_stream_id uuid CONSTRAINT fk_business_processes_linked_value_stream_id REFERENCES value_streams(id) ON DELETE CASCADE, origin text DEFAULT 'architecture' CONSTRAINT ck_business_processes_origin CHECK (origin IN ('architecture','discovery')), status text DEFAULT 'draft' CONSTRAINT ck_business_processes_status CHECK (status IN ('draft','active')), created_by_user_id uuid NOT NULL CONSTRAINT fk_business_processes_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE stakeholders_personas (id uuid CONSTRAINT pk_stakeholders_personas PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_stakeholders_personas_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, business_architecture_id uuid NOT NULL CONSTRAINT fk_stakeholders_personas_business_architecture_id REFERENCES business_architecture_components(id) ON DELETE CASCADE, name text NOT NULL, role_or_persona text, stakeholder_type text CONSTRAINT ck_stakeholders_personas_stakeholder_type CHECK (stakeholder_type IN ('internal','external','executive','customer')), needs text, pain_points text, value_received text, linked_value_stream_id uuid CONSTRAINT fk_stakeholders_personas_linked_value_stream_id REFERENCES value_streams(id) ON DELETE CASCADE, origin text DEFAULT 'architecture' CONSTRAINT ck_stakeholders_personas_origin CHECK (origin IN ('architecture','discovery')), status text DEFAULT 'draft' CONSTRAINT ck_stakeholders_personas_status CHECK (status IN ('draft','active')), created_by_user_id uuid NOT NULL CONSTRAINT fk_stakeholders_personas_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE information_concepts (id uuid CONSTRAINT pk_information_concepts PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_information_concepts_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, business_architecture_id uuid NOT NULL CONSTRAINT fk_information_concepts_business_architecture_id REFERENCES business_architecture_components(id) ON DELETE CASCADE, concept_name text NOT NULL, description text, data_owner text, source_system text, target_system text, data_quality_issue text, business_usage text, linked_value_stream_id uuid CONSTRAINT fk_information_concepts_linked_value_stream_id REFERENCES value_streams(id) ON DELETE CASCADE, origin text DEFAULT 'architecture' CONSTRAINT ck_information_concepts_origin CHECK (origin IN ('architecture','discovery')), status text DEFAULT 'draft' CONSTRAINT ck_information_concepts_status CHECK (status IN ('draft','active')), created_by_user_id uuid NOT NULL CONSTRAINT fk_information_concepts_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE business_impacts (id uuid CONSTRAINT pk_business_impacts PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_business_impacts_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, business_architecture_id uuid NOT NULL CONSTRAINT fk_business_impacts_business_architecture_id REFERENCES business_architecture_components(id) ON DELETE CASCADE, impacted_area text NOT NULL, impact_description text, impact_type text CONSTRAINT ck_business_impacts_impact_type CHECK (impact_type IN ('process','financial','customer','risk','operational')), severity text CONSTRAINT ck_business_impacts_severity CHECK (severity IN ('low','medium','high')), mitigation_notes text, expected_value text, linked_value_stream_id uuid CONSTRAINT fk_business_impacts_linked_value_stream_id REFERENCES value_streams(id) ON DELETE CASCADE, origin text DEFAULT 'architecture' CONSTRAINT ck_business_impacts_origin CHECK (origin IN ('architecture','discovery')), status text DEFAULT 'draft' CONSTRAINT ck_business_impacts_status CHECK (status IN ('draft','active')), created_by_user_id uuid NOT NULL CONSTRAINT fk_business_impacts_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_processes_workspace_id ON business_processes (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_processes_business_architecture_id ON business_processes (business_architecture_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_processes_linked_value_stream_id ON business_processes (linked_value_stream_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_processes_created_by_user_id ON business_processes (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_stakeholders_personas_workspace_id ON stakeholders_personas (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_stakeholders_personas_business_architecture_id ON stakeholders_personas (business_architecture_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_stakeholders_personas_linked_value_stream_id ON stakeholders_personas (linked_value_stream_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_stakeholders_personas_created_by_user_id ON stakeholders_personas (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_information_concepts_workspace_id ON information_concepts (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_information_concepts_business_architecture_id ON information_concepts (business_architecture_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_information_concepts_linked_value_stream_id ON information_concepts (linked_value_stream_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_information_concepts_created_by_user_id ON information_concepts (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_impacts_workspace_id ON business_impacts (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_impacts_business_architecture_id ON business_impacts (business_architecture_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_impacts_linked_value_stream_id ON business_impacts (linked_value_stream_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_impacts_created_by_user_id ON business_impacts (created_by_user_id);
    """
    )


def downgrade() -> None:
    op.drop_table("business_impacts")
    op.drop_table("information_concepts")
    op.drop_table("stakeholders_personas")
    op.drop_table("business_processes")
