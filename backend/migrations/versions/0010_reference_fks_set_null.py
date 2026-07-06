from collections.abc import Sequence

from alembic import op

revision: str = "0010_reference_fks_set_null"
down_revision: str | Sequence[str] | None = "0009_implementation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

REFERENCE_FKS = (
    ("departments", "parent_department_id", "departments", "id"),
    ("value_streams", "linked_department_id", "departments", "id"),
    ("business_capabilities", "owning_department_id", "departments", "id"),
    ("business_processes", "linked_value_stream_id", "value_streams", "id"),
    ("stakeholders_personas", "linked_value_stream_id", "value_streams", "id"),
    ("information_concepts", "linked_value_stream_id", "value_streams", "id"),
    ("business_impacts", "linked_value_stream_id", "value_streams", "id"),
    ("business_impacts", "linked_lean_business_case_id", "lean_business_cases", "id"),
    ("features", "capability_id", "business_capabilities", "id"),
)


def upgrade() -> None:
    _replace_foreign_keys(ondelete="SET NULL")


def downgrade() -> None:
    _replace_foreign_keys(ondelete="CASCADE")


def _replace_foreign_keys(*, ondelete: str) -> None:
    for table_name, column_name, referred_table, referred_column in REFERENCE_FKS:
        constraint_name = f"fk_{table_name}_{column_name}"
        op.drop_constraint(constraint_name, table_name, type_="foreignkey")
        op.create_foreign_key(
            constraint_name,
            table_name,
            referred_table,
            [column_name],
            [referred_column],
            ondelete=ondelete,
        )
