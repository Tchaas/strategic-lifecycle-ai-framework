import uuid

from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin, OriginStatusMixin


class StakeholderPersona(OriginStatusMixin, AuditMixin, Base):
    __tablename__ = "stakeholders_personas"
    __origin_status_extra_table_args__ = (
        CheckConstraint("stakeholder_type IN ('internal','external','executive','customer')", name="stakeholder_type"),
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
    name: Mapped[str] = mapped_column(nullable=False)
    role_or_persona: Mapped[str | None]
    stakeholder_type: Mapped[str | None]
    needs: Mapped[str | None]
    pain_points: Mapped[str | None]
    value_received: Mapped[str | None]
    linked_value_stream_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("value_streams.id", ondelete="SET NULL"), index=True
    )
