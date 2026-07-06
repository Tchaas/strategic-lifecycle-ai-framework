import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin, OriginStatusMixin


class BusinessArchitectureComponent(OriginStatusMixin, AuditMixin, Base):
    __tablename__ = "business_architecture_components"
    __origin_status_extra_table_args__ = ()

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None]
    current_state_summary: Mapped[str | None]
    future_state_summary: Mapped[str | None]
