import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin, OriginStatusMixin


class BusinessCapability(OriginStatusMixin, AuditMixin, Base):
    __tablename__ = "business_capabilities"
    __origin_status_extra_table_args__ = ()

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
    capability_name: Mapped[str] = mapped_column(nullable=False)
    capability_description: Mapped[str | None]
    current_maturity: Mapped[str | None]
    target_maturity: Mapped[str | None]
    capability_gap: Mapped[str | None]
    owning_department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), index=True
    )
