import uuid

from sqlalchemy import CheckConstraint, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin


class Discovery(AuditMixin, Base):
    __tablename__ = "discovery"
    __table_args__ = (CheckConstraint("status IN ('draft','active','completed')", name="status"),)

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
    problem_statement: Mapped[str | None]
    persona_findings: Mapped[str | None]
    journey_map: Mapped[str | None]
    current_state_process_map: Mapped[str | None]
    bottleneck_analysis: Mapped[str | None]
    data_findings: Mapped[str | None]
    legacy_constraints: Mapped[str | None]
    future_state_needs: Mapped[str | None]
    discovery_metrics: Mapped[str | None]
    governance_findings: Mapped[str | None]
    status: Mapped[str | None] = mapped_column(server_default=text("'draft'"))
