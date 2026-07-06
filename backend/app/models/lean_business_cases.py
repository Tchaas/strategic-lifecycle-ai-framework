import uuid

from sqlalchemy import CheckConstraint, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin


class LeanBusinessCase(AuditMixin, Base):
    __tablename__ = "lean_business_cases"
    __table_args__ = (
        CheckConstraint("priority IN ('low','medium','high')", name="priority"),
        CheckConstraint("value_type IN ('cost_savings','revenue','risk_reduction','efficiency')", name="value_type"),
        CheckConstraint("status IN ('draft','active','completed','archived')", name="status"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    strategic_objective_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("strategic_objectives.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(nullable=False)
    summary: Mapped[str | None]
    problem_opportunity_statement: Mapped[str | None]
    value_hypothesis: Mapped[str | None]
    priority: Mapped[str | None]
    forecast_cost: Mapped[float | None]
    forecast_value: Mapped[float | None]
    value_type: Mapped[str | None]
    status: Mapped[str | None] = mapped_column(server_default=text("'draft'"))
