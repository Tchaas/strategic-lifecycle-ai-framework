import uuid
from datetime import date

from sqlalchemy import CheckConstraint, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin


class Implementation(AuditMixin, Base):
    __tablename__ = "implementation"
    __table_args__ = (
        CheckConstraint("value_type IN ('cost_savings','revenue','risk_reduction','efficiency')", name="value_type"),
        CheckConstraint(
            "implementation_status IN ('not_started','in_progress','completed','on_hold')", name="implementation_status"
        ),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lean_business_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lean_business_cases.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    actual_cost: Mapped[float | None]
    actual_value: Mapped[float | None]
    value_type: Mapped[str | None]
    implementation_status: Mapped[str | None] = mapped_column(server_default=text("'not_started'"))
    start_date: Mapped[date | None]
    completion_date: Mapped[date | None]
    outcome_notes: Mapped[str | None]
