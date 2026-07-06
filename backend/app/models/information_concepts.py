import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin, OriginStatusMixin


class InformationConcept(OriginStatusMixin, AuditMixin, Base):
    __tablename__ = "information_concepts"
    __origin_status_extra_table_args__ = ()

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    business_architecture_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("business_architecture_components.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    concept_name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None]
    data_owner: Mapped[str | None]
    source_system: Mapped[str | None]
    target_system: Mapped[str | None]
    data_quality_issue: Mapped[str | None]
    business_usage: Mapped[str | None]
    linked_value_stream_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("value_streams.id", ondelete="SET NULL"), index=True
    )
