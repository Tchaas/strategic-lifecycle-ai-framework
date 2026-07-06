import uuid
from datetime import datetime
from typing import Literal

from pydantic import ConfigDict
from pydantic.alias_generators import to_camel

from app.schemas.base import ApiModel

ArchitectureStatus = Literal["draft", "active"]
ValueStreamType = Literal["current_state", "future_state", "modified_existing"]


class StrictApiModel(ApiModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )


class BusinessArchitectureCreateRequest(StrictApiModel):
    name: str
    description: str | None = None
    current_state_summary: str | None = None
    future_state_summary: str | None = None


class BusinessArchitectureUpdateRequest(StrictApiModel):
    name: str | None = None
    description: str | None = None
    current_state_summary: str | None = None
    future_state_summary: str | None = None
    status: ArchitectureStatus | None = None


class BusinessArchitectureResponse(ApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: str | None
    current_state_summary: str | None
    future_state_summary: str | None
    origin: str | None
    status: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ValueStreamCreateRequest(StrictApiModel):
    name: str
    description: str | None = None
    value_stream_type: ValueStreamType | None = None
    strategic_alignment: str | None = None
    triggering_stakeholder: str | None = None
    value_recipient: str | None = None
    linked_department_id: uuid.UUID | None = None


class ValueStreamUpdateRequest(StrictApiModel):
    name: str | None = None
    description: str | None = None
    value_stream_type: ValueStreamType | None = None
    strategic_alignment: str | None = None
    triggering_stakeholder: str | None = None
    value_recipient: str | None = None
    linked_department_id: uuid.UUID | None = None
    status: ArchitectureStatus | None = None


class KeyActivityCreateRequest(StrictApiModel):
    activity_name: str
    activity_description: str | None = None
    sequence_order: int | None = None
    current_state_issue: str | None = None
    future_state_change: str | None = None
    business_impact: str | None = None


class KeyActivityUpdateRequest(StrictApiModel):
    activity_name: str | None = None
    activity_description: str | None = None
    sequence_order: int | None = None
    current_state_issue: str | None = None
    future_state_change: str | None = None
    business_impact: str | None = None
    status: ArchitectureStatus | None = None


class KeyActivityResponse(ApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    value_stream_id: uuid.UUID
    activity_name: str
    activity_description: str | None
    sequence_order: int | None
    current_state_issue: str | None
    future_state_change: str | None
    business_impact: str | None
    origin: str | None
    status: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    capability_ids: list[uuid.UUID] = []


class ValueStreamResponse(ApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    business_architecture_id: uuid.UUID
    name: str
    description: str | None
    value_stream_type: str | None
    strategic_alignment: str | None
    triggering_stakeholder: str | None
    value_recipient: str | None
    linked_department_id: uuid.UUID | None
    origin: str | None
    status: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    key_activities: list[KeyActivityResponse] = []
    capability_ids: list[uuid.UUID] = []


class CapabilityCreateRequest(StrictApiModel):
    capability_name: str
    capability_description: str | None = None
    current_maturity: str | None = None
    target_maturity: str | None = None
    capability_gap: str | None = None
    owning_department_id: uuid.UUID | None = None


class CapabilityUpdateRequest(StrictApiModel):
    capability_name: str | None = None
    capability_description: str | None = None
    current_maturity: str | None = None
    target_maturity: str | None = None
    capability_gap: str | None = None
    owning_department_id: uuid.UUID | None = None
    status: ArchitectureStatus | None = None


class CapabilityResponse(ApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    business_architecture_id: uuid.UUID
    capability_name: str
    capability_description: str | None
    current_maturity: str | None
    target_maturity: str | None
    capability_gap: str | None
    owning_department_id: uuid.UUID | None
    origin: str | None
    status: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    value_stream_ids: list[uuid.UUID] = []
    key_activity_ids: list[uuid.UUID] = []


class CapabilityLinkResponse(ApiModel):
    id: uuid.UUID
    capability_id: uuid.UUID
    value_stream_id: uuid.UUID | None = None
    key_activity_id: uuid.UUID | None = None
    created_at: datetime
