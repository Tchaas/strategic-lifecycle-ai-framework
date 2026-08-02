import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base


class AiUsage(Base):
    __tablename__ = "ai_usage"
    __table_args__ = (CheckConstraint("status IN ('success','error')", name="status"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ai_suggestion_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_suggestions.id", ondelete="SET NULL"), index=True
    )
    resource_type: Mapped[str] = mapped_column(nullable=False)
    model: Mapped[str] = mapped_column(nullable=False)
    input_tokens: Mapped[int | None]
    output_tokens: Mapped[int | None]
    input_price_per_mtok: Mapped[Decimal | None] = mapped_column(Numeric(10, 6))
    output_price_per_mtok: Mapped[Decimal | None] = mapped_column(Numeric(10, 6))
    cost_usd: Mapped[Decimal | None] = mapped_column(Numeric(12, 6))
    status: Mapped[str] = mapped_column(nullable=False)
    error_code: Mapped[str | None]
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))
