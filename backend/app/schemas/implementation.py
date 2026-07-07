import uuid
from datetime import date, datetime
from typing import Literal

from app.schemas.architecture_core import StrictApiModel
from app.schemas.base import ApiModel
from app.schemas.business_cases import CaseValueType

ImplementationStatus = Literal["not_started", "in_progress", "completed", "on_hold"]


class ImplementationCreateRequest(StrictApiModel):
    value_type: CaseValueType | None = None
    implementation_status: ImplementationStatus | None = None
    start_date: date | None = None
    completion_date: date | None = None
    outcome_notes: str | None = None


class ImplementationUpdateRequest(StrictApiModel):
    value_type: CaseValueType | None = None
    implementation_status: ImplementationStatus | None = None
    start_date: date | None = None
    completion_date: date | None = None
    outcome_notes: str | None = None


class ImplementationAllocationRequest(StrictApiModel):
    allocated_cost: float | None = None
    allocated_value: float | None = None


class ImplementationAllocationResponse(ApiModel):
    id: uuid.UUID | None = None
    implementation_id: uuid.UUID | None = None
    value_stream_id: uuid.UUID
    name: str
    allocated_cost: float | None
    allocated_value: float | None
    created_at: datetime | None = None


class ImplementationResponse(ApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    lean_business_case_id: uuid.UUID
    actual_cost: float | None
    actual_value: float | None
    value_type: str | None
    implementation_status: str | None
    start_date: date | None
    completion_date: date | None
    outcome_notes: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    allocations: list[ImplementationAllocationResponse] = []
