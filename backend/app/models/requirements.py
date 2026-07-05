import uuid

from sqlalchemy import CheckConstraint, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin


class Requirement(AuditMixin, Base):
    __tablename__ = "requirements"
    __table_args__ = (
        CheckConstraint(
            "requirement_type IN ('functional','non_functional','data','integration','security')",
            name="requirement_type",
        ),
        CheckConstraint("priority IN ('low','medium','high')", name="priority"),
        CheckConstraint("status IN ('draft','active','completed')", name="status"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    feature_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("features.id", ondelete="CASCADE"), nullable=False, index=True
    )
    requirement_name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None]
    requirement_type: Mapped[str | None]
    acceptance_criteria: Mapped[str | None]
    priority: Mapped[str | None]
    status: Mapped[str | None] = mapped_column(server_default=text("'draft'"))
