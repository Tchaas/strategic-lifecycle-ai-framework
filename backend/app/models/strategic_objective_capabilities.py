import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import JunctionMixin


class StrategicObjectiveCapability(JunctionMixin, Base):
    __tablename__ = "strategic_objective_capabilities"
    __table_args__ = (
        UniqueConstraint(
            "strategic_objective_id", "capability_id", name="uq_strategic_objective_capabilities_strategic_objective_id"
        ),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    strategic_objective_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("strategic_objectives.id", ondelete="CASCADE"), nullable=False, index=True
    )
    capability_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("business_capabilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
