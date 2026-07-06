import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import JunctionMixin


class ValueStreamCapability(JunctionMixin, Base):
    __tablename__ = "value_stream_capabilities"
    __table_args__ = (
        UniqueConstraint("value_stream_id", "capability_id", name="uq_value_stream_capabilities_value_stream_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    value_stream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("value_streams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    capability_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("business_capabilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
