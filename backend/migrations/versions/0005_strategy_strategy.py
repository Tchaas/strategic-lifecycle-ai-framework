from collections.abc import Sequence

from alembic import op

revision: str = "0005_strategy"
down_revision: str | Sequence[str] | None = "0004_architecture_supporting"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
    CREATE TABLE strategic_objectives (id uuid CONSTRAINT pk_strategic_objectives PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_strategic_objectives_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, strategic_initiative_name text NOT NULL, executive_objective text, strategic_value_category text CONSTRAINT ck_strategic_objectives_strategic_value_category CHECK (strategic_value_category IN ('revenue_growth','cost_reduction','operational_efficiency','customer_experience','risk_reduction','scalability','competitive_advantage')), expected_business_outcome text, financial_impact text, urgency_rationale text, target_implementation_year text, target_implementation_start_date date, target_implementation_end_date date, problem_opportunity_statement text, cost_of_inaction text, current_limitation text, impacted_teams text, problem_type text CONSTRAINT ck_strategic_objectives_problem_type CHECK (problem_type IN ('customer','internal','both')), value_hypothesis text, value_measurement_approach text, expected_value_type text CONSTRAINT ck_strategic_objectives_expected_value_type CHECK (expected_value_type IN ('financial','operational','mixed')), value_realization_timeframe text, status text DEFAULT 'draft' CONSTRAINT ck_strategic_objectives_status CHECK (status IN ('draft','active','completed','archived')), created_by_user_id uuid NOT NULL CONSTRAINT fk_strategic_objectives_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE strategic_objective_metrics (id uuid CONSTRAINT pk_strategic_objective_metrics PRIMARY KEY DEFAULT gen_random_uuid(), strategic_objective_id uuid NOT NULL CONSTRAINT fk_strategic_objective_metrics_strategic_objective_id REFERENCES strategic_objectives(id) ON DELETE CASCADE, workspace_id uuid NOT NULL CONSTRAINT fk_strategic_objective_metrics_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, name text NOT NULL, metric_category text CONSTRAINT ck_strategic_objective_metrics_metric_category CHECK (metric_category IN ('financial','operational','customer','risk')), baseline_value integer, target_value integer, unit text, timeframe text, created_by_user_id uuid NOT NULL CONSTRAINT fk_strategic_objective_metrics_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE strategic_objective_value_streams (id uuid CONSTRAINT pk_strategic_objective_value_streams PRIMARY KEY DEFAULT gen_random_uuid(), strategic_objective_id uuid NOT NULL CONSTRAINT fk_strategic_objective_value_streams_strategic_objective_id REFERENCES strategic_objectives(id) ON DELETE CASCADE, value_stream_id uuid NOT NULL CONSTRAINT fk_strategic_objective_value_streams_value_stream_id REFERENCES value_streams(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_strategic_objective_value_streams_strategic_objective_id UNIQUE (strategic_objective_id, value_stream_id));
    """
    )
    op.execute(
        """
    CREATE TABLE strategic_objective_capabilities (id uuid CONSTRAINT pk_strategic_objective_capabilities PRIMARY KEY DEFAULT gen_random_uuid(), strategic_objective_id uuid NOT NULL CONSTRAINT fk_strategic_objective_capabilities_strategic_objective_id REFERENCES strategic_objectives(id) ON DELETE CASCADE, capability_id uuid NOT NULL CONSTRAINT fk_strategic_objective_capabilities_capability_id REFERENCES business_capabilities(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_strategic_objective_capabilities_strategic_objective_id UNIQUE (strategic_objective_id, capability_id));
    """
    )
    op.execute(
        """
    CREATE INDEX ix_strategic_objectives_workspace_id ON strategic_objectives (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_strategic_objectives_created_by_user_id ON strategic_objectives (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_strategic_objective_metrics_strategic_objective_id ON strategic_objective_metrics (strategic_objective_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_strategic_objective_metrics_workspace_id ON strategic_objective_metrics (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_strategic_objective_metrics_created_by_user_id ON strategic_objective_metrics (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_strategic_objective_value_streams_value_stream_id ON strategic_objective_value_streams (value_stream_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_strategic_objective_capabilities_capability_id ON strategic_objective_capabilities (capability_id);
    """
    )


def downgrade() -> None:
    op.drop_table("strategic_objective_capabilities")
    op.drop_table("strategic_objective_value_streams")
    op.drop_table("strategic_objective_metrics")
    op.drop_table("strategic_objectives")
