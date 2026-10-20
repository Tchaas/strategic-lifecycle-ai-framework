import uuid
from datetime import datetime

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin


class Workspace(AuditMixin, Base):
    __tablename__ = "workspaces"
    __table_args__ = ()

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(nullable=False)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    setup_completed_at: Mapped[datetime | None]
    legal_name: Mapped[str | None]
    business_unit: Mapped[str | None]
    description: Mapped[str | None]
    industry: Mapped[str | None]
    operating_model: Mapped[str | None]
    business_model: Mapped[str | None]
    primary_customers: Mapped[str | None]
    primary_products: Mapped[str | None]
    strategic_context: Mapped[str | None]
    company_size: Mapped[str | None]
    headquarters_region: Mapped[str | None]
    website: Mapped[str | None]
    logo_url: Mapped[str | None]
    annual_revenue: Mapped[float | None]
