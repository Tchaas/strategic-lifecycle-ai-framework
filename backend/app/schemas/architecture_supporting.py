import uuid
from datetime import datetime
from typing import Literal

from app.schemas.architecture_core import ArchitectureStatus, StrictApiModel
from app.schemas.base import ApiModel

StakeholderType = Literal["internal", "external", "executive", "customer"]
ImpactType = Literal["process", "financial", "customer", "risk", "operational"]
ImpactSeverity = Literal["low", "medium", "high"]


class SupportingArchitectureResponseBase(ApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    business_architecture_id: uuid.UUID
    linked_value_stream_id: uuid.UUID | None
    origin: str | None
    status: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class BusinessProcessCreateRequest(StrictApiModel):
    process_name: str
    current_state_process: str | None = None
    future_state_process: str | None = None
    process_gap: str | None = None
    impacted_systems: str | None = None
    linked_value_stream_id: uuid.UUID | None = None


class BusinessProcessUpdateRequest(StrictApiModel):
    process_name: str | None = None
    current_state_process: str | None = None
    future_state_process: str | None = None
    process_gap: str | None = None
    impacted_systems: str | None = None
    linked_value_stream_id: uuid.UUID | None = None
    status: ArchitectureStatus | None = None


class BusinessProcessResponse(SupportingArchitectureResponseBase):
    process_name: str
    current_state_process: str | None
    future_state_process: str | None
    process_gap: str | None
    impacted_systems: str | None


class StakeholderPersonaCreateRequest(StrictApiModel):
    name: str
    role_or_persona: str | None = None
    stakeholder_type: StakeholderType | None = None
    needs: str | None = None
    pain_points: str | None = None
    value_received: str | None = None
    linked_value_stream_id: uuid.UUID | None = None


class StakeholderPersonaUpdateRequest(StrictApiModel):
    name: str | None = None
    role_or_persona: str | None = None
    stakeholder_type: StakeholderType | None = None
    needs: str | None = None
    pain_points: str | None = None
    value_received: str | None = None
    linked_value_stream_id: uuid.UUID | None = None
    status: ArchitectureStatus | None = None


class StakeholderPersonaResponse(SupportingArchitectureResponseBase):
    name: str
    role_or_persona: str | None
    stakeholder_type: str | None
    needs: str | None
    pain_points: str | None
    value_received: str | None


class InformationConceptCreateRequest(StrictApiModel):
    concept_name: str
    description: str | None = None
    data_owner: str | None = None
    source_system: str | None = None
    target_system: str | None = None
    data_quality_issue: str | None = None
    business_usage: str | None = None
    linked_value_stream_id: uuid.UUID | None = None


class InformationConceptUpdateRequest(StrictApiModel):
    concept_name: str | None = None
    description: str | None = None
    data_owner: str | None = None
    source_system: str | None = None
    target_system: str | None = None
    data_quality_issue: str | None = None
    business_usage: str | None = None
    linked_value_stream_id: uuid.UUID | None = None
    status: ArchitectureStatus | None = None


class InformationConceptResponse(SupportingArchitectureResponseBase):
    concept_name: str
    description: str | None
    data_owner: str | None
    source_system: str | None
    target_system: str | None
    data_quality_issue: str | None
    business_usage: str | None


class BusinessImpactCreateRequest(StrictApiModel):
    impacted_area: str
    impact_description: str | None = None
    impact_type: ImpactType | None = None
    severity: ImpactSeverity | None = None
    mitigation_notes: str | None = None
    expected_value: str | None = None
    linked_value_stream_id: uuid.UUID | None = None
    linked_lean_business_case_id: uuid.UUID | None = None


class BusinessImpactUpdateRequest(StrictApiModel):
    impacted_area: str | None = None
    impact_description: str | None = None
    impact_type: ImpactType | None = None
    severity: ImpactSeverity | None = None
    mitigation_notes: str | None = None
    expected_value: str | None = None
    linked_value_stream_id: uuid.UUID | None = None
    linked_lean_business_case_id: uuid.UUID | None = None
    status: ArchitectureStatus | None = None


class BusinessImpactResponse(SupportingArchitectureResponseBase):
    impacted_area: str
    impact_description: str | None
    impact_type: str | None
    severity: str | None
    mitigation_notes: str | None
    expected_value: str | None
    linked_lean_business_case_id: uuid.UUID | None
