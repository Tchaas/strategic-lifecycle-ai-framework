import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import JunctionMixin


class LeanBusinessCaseKeyActivity(JunctionMixin, Base):
    __tablename__ = "lean_business_case_key_activities"
    __table_args__ = (
        UniqueConstraint("case_id", "key_activity_id", name="uq_lean_business_case_key_activities_case_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lean_business_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    key_activity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("key_activities.id", ondelete="CASCADE"), nullable=False, index=True
    )
