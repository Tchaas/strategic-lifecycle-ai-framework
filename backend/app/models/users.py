import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, text
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models._columns import uuid_pk
from app.models.base import Base

if TYPE_CHECKING:
    from app.models.refresh_tokens import RefreshToken


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("auth_provider IN ('password','google')", name="auth_provider"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    email: Mapped[str] = mapped_column(CITEXT(), nullable=False, unique=True)
    full_name: Mapped[str | None]
    avatar_url: Mapped[str | None]
    auth_provider: Mapped[str] = mapped_column(nullable=False)
    password_hash: Mapped[str | None]
    google_sub: Mapped[str | None]
    email_verified: Mapped[bool | None] = mapped_column(server_default=text("false"))
    last_login_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
