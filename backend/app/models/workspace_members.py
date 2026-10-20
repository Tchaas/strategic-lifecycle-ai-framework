import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin


class WorkspaceMember(AuditMixin, Base):
    __tablename__ = "workspace_members"
    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_members_workspace_id"),
        UniqueConstraint("user_id", name="uq_workspace_members_user_id"),
        CheckConstraint("role IN ('admin','member')", name="role"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(server_default="member")
    joined_at: Mapped[datetime | None]

    @hybrid_property
    def is_admin(self) -> bool:
        """Keep the existing API boolean derived from the single stored role."""
        return self.role == "admin"

    @is_admin.inplace.setter
    def _set_admin(self, value: bool) -> None:
        self.role = "admin" if value else "member"
