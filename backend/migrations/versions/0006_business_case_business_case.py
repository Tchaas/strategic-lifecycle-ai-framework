from collections.abc import Sequence

from alembic import op

revision: str = "0006_business_case"
down_revision: str | Sequence[str] | None = "0005_strategy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
    CREATE TABLE lean_business_cases (id uuid CONSTRAINT pk_lean_business_cases PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_lean_business_cases_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, strategic_objective_id uuid NOT NULL CONSTRAINT fk_lean_business_cases_strategic_objective_id REFERENCES strategic_objectives(id) ON DELETE CASCADE, owner_user_id uuid NOT NULL CONSTRAINT fk_lean_business_cases_owner_user_id REFERENCES users(id) ON DELETE CASCADE, title text NOT NULL, summary text, problem_opportunity_statement text, value_hypothesis text, priority text CONSTRAINT ck_lean_business_cases_priority CHECK (priority IN ('low','medium','high')), forecast_cost double precision, forecast_value double precision, value_type text CONSTRAINT ck_lean_business_cases_value_type CHECK (value_type IN ('cost_savings','revenue','risk_reduction','efficiency')), status text DEFAULT 'draft' CONSTRAINT ck_lean_business_cases_status CHECK (status IN ('draft','active','completed','archived')), created_by_user_id uuid NOT NULL CONSTRAINT fk_lean_business_cases_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE lean_business_case_value_streams (id uuid CONSTRAINT pk_lean_business_case_value_streams PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL CONSTRAINT fk_lean_business_case_value_streams_case_id REFERENCES lean_business_cases(id) ON DELETE CASCADE, value_stream_id uuid NOT NULL CONSTRAINT fk_lean_business_case_value_streams_value_stream_id REFERENCES value_streams(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_lean_business_case_value_streams_case_id UNIQUE (case_id, value_stream_id));
    """
    )
    op.execute(
        """
    CREATE TABLE lean_business_case_key_activities (id uuid CONSTRAINT pk_lean_business_case_key_activities PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL CONSTRAINT fk_lean_business_case_key_activities_case_id REFERENCES lean_business_cases(id) ON DELETE CASCADE, key_activity_id uuid NOT NULL CONSTRAINT fk_lean_business_case_key_activities_key_activity_id REFERENCES key_activities(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_lean_business_case_key_activities_case_id UNIQUE (case_id, key_activity_id));
    """
    )
    op.execute(
        """
    CREATE TABLE lean_business_case_capabilities (id uuid CONSTRAINT pk_lean_business_case_capabilities PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL CONSTRAINT fk_lean_business_case_capabilities_case_id REFERENCES lean_business_cases(id) ON DELETE CASCADE, capability_id uuid NOT NULL CONSTRAINT fk_lean_business_case_capabilities_capability_id REFERENCES business_capabilities(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_lean_business_case_capabilities_case_id UNIQUE (case_id, capability_id));
    """
    )
    op.execute(
        """
    ALTER TABLE business_impacts ADD COLUMN linked_lean_business_case_id uuid CONSTRAINT fk_business_impacts_linked_lean_business_case_id REFERENCES lean_business_cases(id) ON DELETE CASCADE;
    """
    )
    op.execute(
        """
    CREATE INDEX ix_lean_business_cases_workspace_id ON lean_business_cases (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_lean_business_cases_strategic_objective_id ON lean_business_cases (strategic_objective_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_lean_business_cases_owner_user_id ON lean_business_cases (owner_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_lean_business_cases_created_by_user_id ON lean_business_cases (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_lean_business_case_value_streams_value_stream_id ON lean_business_case_value_streams (value_stream_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_lean_business_case_key_activities_key_activity_id ON lean_business_case_key_activities (key_activity_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_lean_business_case_capabilities_capability_id ON lean_business_case_capabilities (capability_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_business_impacts_linked_lean_business_case_id ON business_impacts (linked_lean_business_case_id);
    """
    )


def downgrade() -> None:
    op.drop_index("ix_business_impacts_linked_lean_business_case_id", table_name="business_impacts")
    op.drop_column("business_impacts", "linked_lean_business_case_id")
    op.drop_table("lean_business_case_capabilities")
    op.drop_table("lean_business_case_key_activities")
    op.drop_table("lean_business_case_value_streams")
    op.drop_table("lean_business_cases")
