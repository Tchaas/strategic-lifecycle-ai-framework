import uuid

from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin


class Department(AuditMixin, Base):
    __tablename__ = "departments"
    __table_args__ = (CheckConstraint("headcount >= 0", name="headcount"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        index=True,
    )
    name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None]
    business_architecture_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_architecture_components.id", ondelete="CASCADE"),
        index=True,
    )
    department_head: Mapped[str | None]
    contact_name: Mapped[str | None]
    contact_email: Mapped[str | None]
    location: Mapped[str | None]
    headcount: Mapped[int | None]
