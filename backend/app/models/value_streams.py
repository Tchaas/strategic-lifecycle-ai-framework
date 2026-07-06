import uuid

from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin, OriginStatusMixin


class ValueStream(OriginStatusMixin, AuditMixin, Base):
    __tablename__ = "value_streams"
    __origin_status_extra_table_args__ = (
        CheckConstraint(
            "value_stream_type IN ('current_state','future_state','modified_existing')", name="value_stream_type"
        ),
    )

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
    name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None]
    value_stream_type: Mapped[str | None]
    strategic_alignment: Mapped[str | None]
    triggering_stakeholder: Mapped[str | None]
    value_recipient: Mapped[str | None]
    linked_department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), index=True
    )
