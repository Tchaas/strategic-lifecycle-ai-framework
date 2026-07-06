from collections.abc import Sequence

from alembic import op

revision: str = "0009_implementation"
down_revision: str | Sequence[str] | None = "0008_solution"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
    CREATE TABLE implementation (id uuid CONSTRAINT pk_implementation PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_implementation_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, lean_business_case_id uuid NOT NULL CONSTRAINT uq_implementation_lean_business_case_id UNIQUE CONSTRAINT fk_implementation_lean_business_case_id REFERENCES lean_business_cases(id) ON DELETE CASCADE, actual_cost double precision, actual_value double precision, value_type text CONSTRAINT ck_implementation_value_type CHECK (value_type IN ('cost_savings','revenue','risk_reduction','efficiency')), implementation_status text DEFAULT 'not_started' CONSTRAINT ck_implementation_implementation_status CHECK (implementation_status IN ('not_started','in_progress','completed','on_hold')), start_date date, completion_date date, outcome_notes text, created_by_user_id uuid NOT NULL CONSTRAINT fk_implementation_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE implementation_value_streams (id uuid CONSTRAINT pk_implementation_value_streams PRIMARY KEY DEFAULT gen_random_uuid(), implementation_id uuid NOT NULL CONSTRAINT fk_implementation_value_streams_implementation_id REFERENCES implementation(id) ON DELETE CASCADE, value_stream_id uuid NOT NULL CONSTRAINT fk_implementation_value_streams_value_stream_id REFERENCES value_streams(id) ON DELETE CASCADE, allocated_cost double precision, allocated_value double precision, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_implementation_value_streams_implementation_id UNIQUE (implementation_id, value_stream_id));
    """
    )
    op.execute(
        """
    CREATE INDEX ix_implementation_workspace_id ON implementation (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_implementation_lean_business_case_id ON implementation (lean_business_case_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_implementation_created_by_user_id ON implementation (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_implementation_value_streams_value_stream_id ON implementation_value_streams (value_stream_id);
    """
    )


def downgrade() -> None:
    op.drop_table("implementation_value_streams")
    op.drop_table("implementation")
