import uuid

from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin, OriginStatusMixin


class BusinessImpact(OriginStatusMixin, AuditMixin, Base):
    __tablename__ = "business_impacts"
    __origin_status_extra_table_args__ = (
        CheckConstraint("impact_type IN ('process','financial','customer','risk','operational')", name="impact_type"),
        CheckConstraint("severity IN ('low','medium','high')", name="severity"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    business_architecture_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("business_architecture_components.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    impacted_area: Mapped[str] = mapped_column(nullable=False)
    impact_description: Mapped[str | None]
    impact_type: Mapped[str | None]
    severity: Mapped[str | None]
    mitigation_notes: Mapped[str | None]
    expected_value: Mapped[str | None]
    linked_value_stream_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("value_streams.id", ondelete="SET NULL"), index=True
    )
    linked_lean_business_case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lean_business_cases.id", ondelete="SET NULL"), index=True
    )
