import uuid
from datetime import datetime
from typing import Any, ClassVar

from sqlalchemy import CheckConstraint, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, declared_attr, mapped_column


class AuditMixin:
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class JunctionMixin:
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class OriginStatusMixin:
    origin: Mapped[str | None] = mapped_column(server_default=text("'architecture'"))
    status: Mapped[str | None] = mapped_column(server_default=text("'draft'"))

    __origin_status_extra_table_args__: ClassVar[tuple[Any, ...]] = ()

    @declared_attr.directive
    def __table_args__(cls) -> tuple[Any, ...]:
        return (
            CheckConstraint("origin IN ('architecture','discovery')", name="origin"),
            CheckConstraint("status IN ('draft','active')", name="status"),
            *cls.__origin_status_extra_table_args__,
        )
