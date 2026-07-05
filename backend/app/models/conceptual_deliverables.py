import uuid

from sqlalchemy import CheckConstraint, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models._columns import uuid_pk
from app.models.base import Base
from app.models.mixins import AuditMixin


class ConceptualDeliverable(AuditMixin, Base):
    __tablename__ = "conceptual_deliverables"
    __table_args__ = (
        CheckConstraint(
            "deliverable_type IN ("
            "'conceptual_architecture_document','end_to_end_architecture_diagram','system_context_diagram',"
            "'capability_to_component_diagram','value_stream_to_feature_map','data_flow_diagram',"
            "'api_integration_view','governance_oversight_view','prioritized_epic_feature_roadmap',"
            "'requirement_sets','risk_dependency_register','traceability_matrix'"
            ")",
            name="deliverable_type",
        ),
        CheckConstraint("source IN ('suggested','user_finalized')", name="source"),
        CheckConstraint("status IN ('draft','active','completed')", name="status"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lean_business_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lean_business_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    deliverable_type: Mapped[str | None]
    title: Mapped[str] = mapped_column(nullable=False)
    content: Mapped[str | None]
    source: Mapped[str | None] = mapped_column(server_default=text("'suggested'"))
    status: Mapped[str | None] = mapped_column(server_default=text("'draft'"))
