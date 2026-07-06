import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import JunctionMixin


class ImplementationValueStream(JunctionMixin, Base):
    __tablename__ = "implementation_value_streams"
    __table_args__ = (
        UniqueConstraint(
            "implementation_id", "value_stream_id", name="uq_implementation_value_streams_implementation_id"
        ),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    implementation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("implementation.id", ondelete="CASCADE"), nullable=False, index=True
    )
    value_stream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("value_streams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    allocated_cost: Mapped[float | None]
    allocated_value: Mapped[float | None]
