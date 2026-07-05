import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import JunctionMixin


class LeanBusinessCaseCapability(JunctionMixin, Base):
    __tablename__ = "lean_business_case_capabilities"
    __table_args__ = (UniqueConstraint("case_id", "capability_id", name="uq_lean_business_case_capabilities_case_id"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lean_business_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    capability_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("business_capabilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
