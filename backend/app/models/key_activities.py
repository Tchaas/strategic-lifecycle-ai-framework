import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin, OriginStatusMixin


class KeyActivity(OriginStatusMixin, AuditMixin, Base):
    __tablename__ = "key_activities"
    __origin_status_extra_table_args__ = ()

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    value_stream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("value_streams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    activity_name: Mapped[str] = mapped_column(nullable=False)
    activity_description: Mapped[str | None]
    sequence_order: Mapped[int | None]
    current_state_issue: Mapped[str | None]
    future_state_change: Mapped[str | None]
    business_impact: Mapped[str | None]
