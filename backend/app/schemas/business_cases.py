import uuid
from datetime import datetime
from typing import Literal

from app.schemas.architecture_core import StrictApiModel
from app.schemas.base import ApiModel
from app.schemas.strategy import ObjectiveStatus

CasePriority = Literal["low", "medium", "high"]
CaseValueType = Literal["cost_savings", "revenue", "risk_reduction", "efficiency"]


class LeanBusinessCaseBase(StrictApiModel):
    title: str | None = None
    summary: str | None = None
    problem_opportunity_statement: str | None = None
    value_hypothesis: str | None = None
    priority: CasePriority | None = None
    forecast_cost: float | None = None
    forecast_value: float | None = None
    value_type: CaseValueType | None = None
    owner_user_id: uuid.UUID | None = None


class LeanBusinessCaseCreateRequest(LeanBusinessCaseBase):
    title: str


class LeanBusinessCaseUpdateRequest(LeanBusinessCaseBase):
    status: ObjectiveStatus | None = None


class LeanBusinessCaseStatusRequest(StrictApiModel):
    status: str


class LeanBusinessCaseResponse(ApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    strategic_objective_id: uuid.UUID
    owner_user_id: uuid.UUID
    title: str
    summary: str | None
    problem_opportunity_statement: str | None
    value_hypothesis: str | None
    priority: str | None
    forecast_cost: float | None
    forecast_value: float | None
    value_type: str | None
    status: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    owner_full_name: str | None = None
    owner_email: str | None = None
    value_stream_ids: list[uuid.UUID] = []
    key_activity_ids: list[uuid.UUID] = []
    capability_ids: list[uuid.UUID] = []


class LeanBusinessCaseLinkResponse(ApiModel):
    id: uuid.UUID
    case_id: uuid.UUID
    value_stream_id: uuid.UUID | None = None
    key_activity_id: uuid.UUID | None = None
    capability_id: uuid.UUID | None = None
    created_at: datetime
