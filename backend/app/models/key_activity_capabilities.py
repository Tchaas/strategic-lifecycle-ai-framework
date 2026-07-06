import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import JunctionMixin


class KeyActivityCapability(JunctionMixin, Base):
    __tablename__ = "key_activity_capabilities"
    __table_args__ = (
        UniqueConstraint("key_activity_id", "capability_id", name="uq_key_activity_capabilities_key_activity_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    key_activity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("key_activities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    capability_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("business_capabilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
