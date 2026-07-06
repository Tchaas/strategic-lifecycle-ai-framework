import uuid
from datetime import date

from sqlalchemy import CheckConstraint, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin


class StrategicObjective(AuditMixin, Base):
    __tablename__ = "strategic_objectives"
    __table_args__ = (
        CheckConstraint(
            "strategic_value_category IN ("
            "'revenue_growth','cost_reduction','operational_efficiency','customer_experience',"
            "'risk_reduction','scalability','competitive_advantage'"
            ")",
            name="strategic_value_category",
        ),
        CheckConstraint("problem_type IN ('customer','internal','both')", name="problem_type"),
        CheckConstraint("expected_value_type IN ('financial','operational','mixed')", name="expected_value_type"),
        CheckConstraint("status IN ('draft','active','completed','archived')", name="status"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    strategic_initiative_name: Mapped[str] = mapped_column(nullable=False)
    executive_objective: Mapped[str | None]
    strategic_value_category: Mapped[str | None]
    expected_business_outcome: Mapped[str | None]
    financial_impact: Mapped[str | None]
    urgency_rationale: Mapped[str | None]
    target_implementation_year: Mapped[str | None]
    target_implementation_start_date: Mapped[date | None]
    target_implementation_end_date: Mapped[date | None]
    problem_opportunity_statement: Mapped[str | None]
    cost_of_inaction: Mapped[str | None]
    current_limitation: Mapped[str | None]
    impacted_teams: Mapped[str | None]
    problem_type: Mapped[str | None]
    value_hypothesis: Mapped[str | None]
    value_measurement_approach: Mapped[str | None]
    expected_value_type: Mapped[str | None]
    value_realization_timeframe: Mapped[str | None]
    status: Mapped[str | None] = mapped_column(server_default=text("'draft'"))
