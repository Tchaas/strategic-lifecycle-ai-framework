from collections.abc import Sequence

from alembic import op

revision: str = "0011_ai_layer"
down_revision: str | Sequence[str] | None = "0010_reference_fks_set_null"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
    CREATE TABLE ai_suggestions (id uuid CONSTRAINT pk_ai_suggestions PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_ai_suggestions_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, resource_type text NOT NULL CONSTRAINT ck_ai_suggestions_resource_type CHECK (resource_type IN ('strategic_objective','lean_business_case','discovery')), question_answers jsonb NOT NULL, suggested_fields jsonb NOT NULL, status text NOT NULL DEFAULT 'pending', created_by_user_id uuid CONSTRAINT fk_ai_suggestions_created_by_user_id REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE ai_usage (id uuid CONSTRAINT pk_ai_usage PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_ai_usage_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, ai_suggestion_id uuid CONSTRAINT fk_ai_usage_ai_suggestion_id REFERENCES ai_suggestions(id) ON DELETE SET NULL, resource_type text NOT NULL, model text NOT NULL, input_tokens integer, output_tokens integer, input_price_per_mtok numeric(10,6), output_price_per_mtok numeric(10,6), cost_usd numeric(12,6), status text NOT NULL CONSTRAINT ck_ai_usage_status CHECK (status IN ('success','error')), error_code text, created_by_user_id uuid CONSTRAINT fk_ai_usage_created_by_user_id REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE INDEX ix_ai_suggestions_workspace_id ON ai_suggestions (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_ai_suggestions_created_by_user_id ON ai_suggestions (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE UNIQUE INDEX uq_ai_suggestions_workspace_id_resource_type_pending ON ai_suggestions (workspace_id, resource_type) WHERE status = 'pending';
    """
    )
    op.execute(
        """
    CREATE INDEX ix_ai_usage_workspace_id ON ai_usage (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_ai_usage_ai_suggestion_id ON ai_usage (ai_suggestion_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_ai_usage_created_by_user_id ON ai_usage (created_by_user_id);
    """
    )


def downgrade() -> None:
    op.drop_table("ai_usage")
    op.drop_table("ai_suggestions")
