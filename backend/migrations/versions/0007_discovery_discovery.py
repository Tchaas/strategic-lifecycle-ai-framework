from collections.abc import Sequence

from alembic import op

revision: str = "0007_discovery"
down_revision: str | Sequence[str] | None = "0006_business_case"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
    CREATE TABLE discovery (id uuid CONSTRAINT pk_discovery PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL CONSTRAINT fk_discovery_workspace_id REFERENCES workspaces(id) ON DELETE CASCADE, lean_business_case_id uuid NOT NULL CONSTRAINT uq_discovery_lean_business_case_id UNIQUE CONSTRAINT fk_discovery_lean_business_case_id REFERENCES lean_business_cases(id) ON DELETE CASCADE, problem_statement text, persona_findings text, journey_map text, current_state_process_map text, bottleneck_analysis text, data_findings text, legacy_constraints text, future_state_needs text, discovery_metrics text, governance_findings text, status text DEFAULT 'draft' CONSTRAINT ck_discovery_status CHECK (status IN ('draft','active','completed')), created_by_user_id uuid NOT NULL CONSTRAINT fk_discovery_created_by_user_id REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    """
    )
    op.execute(
        """
    CREATE TABLE discovery_stakeholders_personas (id uuid CONSTRAINT pk_discovery_stakeholders_personas PRIMARY KEY DEFAULT gen_random_uuid(), discovery_id uuid NOT NULL CONSTRAINT fk_discovery_stakeholders_personas_discovery_id REFERENCES discovery(id) ON DELETE CASCADE, stakeholder_persona_id uuid NOT NULL CONSTRAINT fk_discovery_stakeholders_personas_stakeholder_persona_id REFERENCES stakeholders_personas(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_discovery_stakeholders_personas_discovery_id UNIQUE (discovery_id, stakeholder_persona_id));
    """
    )
    op.execute(
        """
    CREATE TABLE discovery_business_processes (id uuid CONSTRAINT pk_discovery_business_processes PRIMARY KEY DEFAULT gen_random_uuid(), discovery_id uuid NOT NULL CONSTRAINT fk_discovery_business_processes_discovery_id REFERENCES discovery(id) ON DELETE CASCADE, business_process_id uuid NOT NULL CONSTRAINT fk_discovery_business_processes_business_process_id REFERENCES business_processes(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_discovery_business_processes_discovery_id UNIQUE (discovery_id, business_process_id));
    """
    )
    op.execute(
        """
    CREATE TABLE discovery_information_concepts (id uuid CONSTRAINT pk_discovery_information_concepts PRIMARY KEY DEFAULT gen_random_uuid(), discovery_id uuid NOT NULL CONSTRAINT fk_discovery_information_concepts_discovery_id REFERENCES discovery(id) ON DELETE CASCADE, information_concept_id uuid NOT NULL CONSTRAINT fk_discovery_information_concepts_information_concept_id REFERENCES information_concepts(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_discovery_information_concepts_discovery_id UNIQUE (discovery_id, information_concept_id));
    """
    )
    op.execute(
        """
    CREATE INDEX ix_discovery_workspace_id ON discovery (workspace_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_discovery_lean_business_case_id ON discovery (lean_business_case_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_discovery_created_by_user_id ON discovery (created_by_user_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_discovery_stakeholders_personas_stakeholder_persona_id ON discovery_stakeholders_personas (stakeholder_persona_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_discovery_business_processes_business_process_id ON discovery_business_processes (business_process_id);
    """
    )
    op.execute(
        """
    CREATE INDEX ix_discovery_information_concepts_information_concept_id ON discovery_information_concepts (information_concept_id);
    """
    )


def downgrade() -> None:
    op.drop_table("discovery_information_concepts")
    op.drop_table("discovery_business_processes")
    op.drop_table("discovery_stakeholders_personas")
    op.drop_table("discovery")
