import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import JunctionMixin


class LeanBusinessCaseValueStream(JunctionMixin, Base):
    __tablename__ = "lean_business_case_value_streams"
    __table_args__ = (
        UniqueConstraint("case_id", "value_stream_id", name="uq_lean_business_case_value_streams_case_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lean_business_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    value_stream_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("value_streams.id", ondelete="CASCADE"), nullable=False, index=True
    )
