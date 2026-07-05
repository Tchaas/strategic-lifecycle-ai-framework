import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import CITEXT, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin


class WorkspaceInvite(AuditMixin, Base):
    __tablename__ = "workspace_invites"
    __table_args__ = (CheckConstraint("status IN ('pending','accepted','expired')", name="status"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    invited_email: Mapped[str] = mapped_column(CITEXT(), nullable=False)
    invited_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    invite_token: Mapped[str | None] = mapped_column(unique=True)
    status: Mapped[str | None]
    expires_at: Mapped[datetime | None]
    accepted_at: Mapped[datetime | None]
