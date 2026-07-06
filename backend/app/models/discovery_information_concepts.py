import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import JunctionMixin


class DiscoveryInformationConcept(JunctionMixin, Base):
    __tablename__ = "discovery_information_concepts"
    __table_args__ = (
        UniqueConstraint(
            "discovery_id", "information_concept_id", name="uq_discovery_information_concepts_discovery_id"
        ),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    discovery_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("discovery.id", ondelete="CASCADE"), nullable=False, index=True
    )
    information_concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("information_concepts.id", ondelete="CASCADE"), nullable=False, index=True
    )
