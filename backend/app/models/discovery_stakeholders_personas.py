import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import JunctionMixin


class DiscoveryStakeholderPersona(JunctionMixin, Base):
    __tablename__ = "discovery_stakeholders_personas"
    __table_args__ = (
        UniqueConstraint(
            "discovery_id", "stakeholder_persona_id", name="uq_discovery_stakeholders_personas_discovery_id"
        ),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    discovery_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("discovery.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stakeholder_persona_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stakeholders_personas.id", ondelete="CASCADE"), nullable=False, index=True
    )
