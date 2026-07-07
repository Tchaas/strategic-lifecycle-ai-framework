import uuid
from datetime import datetime
from typing import Literal

from app.schemas.architecture_core import StrictApiModel
from app.schemas.discovery import DiscoveryStatus

FeatureType = Literal["user_facing", "operational", "analytical", "integration", "platform"]
RequirementType = Literal["functional", "non_functional", "data", "integration", "security"]
Priority = Literal["low", "medium", "high"]
DeliverableSource = Literal["suggested", "user_finalized"]
DeliverableType = Literal[
    "conceptual_architecture_document",
    "end_to_end_architecture_diagram",
    "system_context_diagram",
    "capability_to_component_diagram",
    "value_stream_to_feature_map",
    "data_flow_diagram",
    "api_integration_view",
    "governance_oversight_view",
    "prioritized_epic_feature_roadmap",
    "requirement_sets",
    "risk_dependency_register",
    "traceability_matrix",
]


class FeatureCreateRequest(StrictApiModel):
    feature_name: str
    description: str | None = None
    feature_type: FeatureType | None = None
    priority: Priority | None = None
    capability_id: uuid.UUID | None = None


class FeatureUpdateRequest(StrictApiModel):
    feature_name: str | None = None
    description: str | None = None
    feature_type: FeatureType | None = None
    priority: Priority | None = None
    capability_id: uuid.UUID | None = None
    status: DiscoveryStatus | None = None


class FeatureResponse(StrictApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    lean_business_case_id: uuid.UUID
    capability_id: uuid.UUID | None
    feature_name: str
    description: str | None
    feature_type: str | None
    priority: str | None
    status: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class RequirementCreateRequest(StrictApiModel):
    requirement_name: str
    description: str | None = None
    requirement_type: RequirementType | None = None
    acceptance_criteria: str | None = None
    priority: Priority | None = None


class RequirementUpdateRequest(StrictApiModel):
    requirement_name: str | None = None
    description: str | None = None
    requirement_type: RequirementType | None = None
    acceptance_criteria: str | None = None
    priority: Priority | None = None
    status: DiscoveryStatus | None = None


class RequirementResponse(StrictApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    feature_id: uuid.UUID
    requirement_name: str
    description: str | None
    requirement_type: str | None
    acceptance_criteria: str | None
    priority: str | None
    status: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class DeliverableCreateRequest(StrictApiModel):
    deliverable_type: DeliverableType
    title: str
    content: str | None = None
    source: DeliverableSource | None = None


class DeliverableUpdateRequest(StrictApiModel):
    title: str | None = None
    content: str | None = None
    source: DeliverableSource | None = None
    status: DiscoveryStatus | None = None


class DeliverableResponse(StrictApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    lean_business_case_id: uuid.UUID
    deliverable_type: str | None
    title: str
    content: str | None
    source: str | None
    status: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
