import uuid
from datetime import datetime
from typing import Literal

from app.schemas.architecture_core import KeyActivityCreateRequest, StrictApiModel
from app.schemas.base import ApiModel

DiscoveryStatus = Literal["draft", "active", "completed"]


class DiscoveryFindingsBase(StrictApiModel):
    problem_statement: str | None = None
    persona_findings: str | None = None
    journey_map: str | None = None
    current_state_process_map: str | None = None
    bottleneck_analysis: str | None = None
    data_findings: str | None = None
    legacy_constraints: str | None = None
    future_state_needs: str | None = None
    discovery_metrics: str | None = None
    governance_findings: str | None = None


class DiscoveryCreateRequest(DiscoveryFindingsBase):
    pass


class DiscoveryUpdateRequest(DiscoveryFindingsBase):
    status: DiscoveryStatus | None = None


class DiscoveryResponse(ApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    lean_business_case_id: uuid.UUID
    problem_statement: str | None
    persona_findings: str | None
    journey_map: str | None
    current_state_process_map: str | None
    bottleneck_analysis: str | None
    data_findings: str | None
    legacy_constraints: str | None
    future_state_needs: str | None
    discovery_metrics: str | None
    governance_findings: str | None
    status: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    stakeholder_persona_ids: list[uuid.UUID] = []
    business_process_ids: list[uuid.UUID] = []
    information_concept_ids: list[uuid.UUID] = []


class DiscoveryLinkResponse(ApiModel):
    id: uuid.UUID
    discovery_id: uuid.UUID
    stakeholder_persona_id: uuid.UUID | None = None
    business_process_id: uuid.UUID | None = None
    information_concept_id: uuid.UUID | None = None
    created_at: datetime


class DiscoveryKeyActivityCreateRequest(KeyActivityCreateRequest):
    value_stream_id: uuid.UUID
