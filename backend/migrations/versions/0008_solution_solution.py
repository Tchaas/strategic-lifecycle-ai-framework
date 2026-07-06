from collections.abc import Sequence

from alembic import op

revision: str = "0008_solution"
down_revision: str | Sequence[str] | None = "0007_discovery"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
    CREATE TABLE features (id uuid CONSTRAINT pk_features PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_features_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, lean_business_case_id uuid NOT NULL CONSTRAINT fk_features_lean_business_case_id REFERENCES lean_business_cases(id) ON DELETE CASCADE, capability_id uuid CONSTRAINT fk_features_capability_id REFERENCES business_capabilities(id) ON DELETE CASCADE, feature_name text NOT NULL, description text, feature_type text CONSTRAINT ck_features_feature_type CHECK (feature_type IN ('user_facing','operational','analytical','integration','platform')), priority text CONSTRAINT ck_features_priority CHECK (priority IN ('low','medium','high')), status text DEFAULT 'draft' CONSTRAINT ck_features_status CHECK (status IN ('draft','active','completed')), created_by_user_id uuid NOT NULL CONSTRAINT fk_features_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE requirements (id uuid CONSTRAINT pk_requirements PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_requirements_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, feature_id uuid NOT NULL CONSTRAINT fk_requirements_feature_id REFERENCES features(id) ON DELETE CASCADE, requirement_name text NOT NULL, description text, requirement_type text CONSTRAINT ck_requirements_requirement_type CHECK (requirement_type IN ('functional','non_functional','data','integration','security')), acceptance_criteria text, priority text CONSTRAINT ck_requirements_priority CHECK (priority IN ('low','medium','high')), status text DEFAULT 'draft' CONSTRAINT ck_requirements_status CHECK (status IN ('draft','active','completed')), created_by_user_id uuid NOT NULL CONSTRAINT fk_requirements_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE conceptual_deliverables (id uuid CONSTRAINT pk_conceptual_deliverables PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_conceptual_deliverables_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, lean_business_case_id uuid NOT NULL CONSTRAINT fk_conceptual_deliverables_lean_business_case_id REFERENCES lean_business_cases(id) ON DELETE CASCADE, deliverable_type text CONSTRAINT ck_conceptual_deliverables_deliverable_type CHECK (deliverable_type IN ('conceptual_architecture_document','end_to_end_architecture_diagram','system_context_diagram','capability_to_component_diagram','value_stream_to_feature_map','data_flow_diagram','api_integration_view','governance_oversight_view','prioritized_epic_feature_roadmap','requirement_sets','risk_dependency_register','traceability_matrix')), title text NOT NULL, content text, source text DEFAULT 'suggested' CONSTRAINT ck_conceptual_deliverables_source CHECK (source IN ('suggested','user_finalized')), status text DEFAULT 'draft' CONSTRAINT ck_conceptual_deliverables_status CHECK (status IN ('draft','active','completed')), created_by_user_id uuid NOT NULL CONSTRAINT fk_conceptual_deliverables_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE INDEX ix_features_workspace_id ON features (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_features_lean_business_case_id ON features (lean_business_case_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_features_capability_id ON features (capability_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_features_created_by_user_id ON features (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_requirements_workspace_id ON requirements (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_requirements_feature_id ON requirements (feature_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_requirements_created_by_user_id ON requirements (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_conceptual_deliverables_workspace_id ON conceptual_deliverables (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_conceptual_deliverables_lean_business_case_id ON conceptual_deliverables (lean_business_case_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_conceptual_deliverables_created_by_user_id ON conceptual_deliverables (created_by_user_id);
    """
    )


def downgrade() -> None:
    op.drop_table("conceptual_deliverables")
    op.drop_table("requirements")
    op.drop_table("features")
