import uuid

from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin


class StrategicObjectiveMetric(AuditMixin, Base):
    __tablename__ = "strategic_objective_metrics"
    __table_args__ = (
        CheckConstraint("metric_category IN ('financial','operational','customer','risk')", name="metric_category"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    strategic_objective_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("strategic_objectives.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(nullable=False)
    metric_category: Mapped[str | None]
    baseline_value: Mapped[int | None]
    target_value: Mapped[int | None]
    unit: Mapped[str | None]
    timeframe: Mapped[str | None]
