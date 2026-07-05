import uuid

from sqlalchemy import CheckConstraint, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin


class Feature(AuditMixin, Base):
    __tablename__ = "features"
    __table_args__ = (
        CheckConstraint(
            "feature_type IN ('user_facing','operational','analytical','integration','platform')", name="feature_type"
        ),
        CheckConstraint("priority IN ('low','medium','high')", name="priority"),
        CheckConstraint("status IN ('draft','active','completed')", name="status"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lean_business_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lean_business_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    capability_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("business_capabilities.id", ondelete="CASCADE"), index=True
    )
    feature_name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None]
    feature_type: Mapped[str | None]
    priority: Mapped[str | None]
    status: Mapped[str | None] = mapped_column(server_default=text("'draft'"))
