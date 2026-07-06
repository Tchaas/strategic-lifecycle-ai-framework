import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import StrictInt

from app.schemas.architecture_core import StrictApiModel
from app.schemas.base import ApiModel

ObjectiveStatus = Literal["draft", "active", "completed", "archived"]
StrategicValueCategory = Literal[
    "revenue_growth",
    "cost_reduction",
    "operational_efficiency",
    "customer_experience",
    "risk_reduction",
    "scalability",
    "competitive_advantage",
]
ProblemType = Literal["customer", "internal", "both"]
ExpectedValueType = Literal["financial", "operational", "mixed"]
MetricCategory = Literal["financial", "operational", "customer", "risk"]


class StrategicObjectiveBase(StrictApiModel):
    strategic_initiative_name: str | None = None
    executive_objective: str | None = None
    strategic_value_category: StrategicValueCategory | None = None
    expected_business_outcome: str | None = None
    financial_impact: str | None = None
    urgency_rationale: str | None = None
    target_implementation_year: str | None = None
    target_implementation_start_date: date | None = None
    target_implementation_end_date: date | None = None
    problem_opportunity_statement: str | None = None
    cost_of_inaction: str | None = None
    current_limitation: str | None = None
    impacted_teams: str | None = None
    problem_type: ProblemType | None = None
    value_hypothesis: str | None = None
    value_measurement_approach: str | None = None
    expected_value_type: ExpectedValueType | None = None
    value_realization_timeframe: str | None = None


class StrategicObjectiveCreateRequest(StrategicObjectiveBase):
    strategic_initiative_name: str


class StrategicObjectiveUpdateRequest(StrategicObjectiveBase):
    status: ObjectiveStatus | None = None


class StrategicObjectiveMetricCreateRequest(StrictApiModel):
    name: str
    metric_category: MetricCategory | None = None
    baseline_value: StrictInt | None = None
    target_value: StrictInt | None = None
    unit: str | None = None
    timeframe: str | None = None


class StrategicObjectiveMetricUpdateRequest(StrictApiModel):
    name: str | None = None
    metric_category: MetricCategory | None = None
    baseline_value: StrictInt | None = None
    target_value: StrictInt | None = None
    unit: str | None = None
    timeframe: str | None = None


class StrategicObjectiveMetricResponse(ApiModel):
    id: uuid.UUID
    strategic_objective_id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    metric_category: str | None
    baseline_value: int | None
    target_value: int | None
    unit: str | None
    timeframe: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class StrategicObjectiveResponse(ApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    strategic_initiative_name: str
    executive_objective: str | None
    strategic_value_category: str | None
    expected_business_outcome: str | None
    financial_impact: str | None
    urgency_rationale: str | None
    target_implementation_year: str | None
    target_implementation_start_date: date | None
    target_implementation_end_date: date | None
    problem_opportunity_statement: str | None
    cost_of_inaction: str | None
    current_limitation: str | None
    impacted_teams: str | None
    problem_type: str | None
    value_hypothesis: str | None
    value_measurement_approach: str | None
    expected_value_type: str | None
    value_realization_timeframe: str | None
    status: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    metrics: list[StrategicObjectiveMetricResponse] = []
    value_stream_ids: list[uuid.UUID] = []
    capability_ids: list[uuid.UUID] = []


class ObjectiveComponentLinkResponse(ApiModel):
    id: uuid.UUID
    strategic_objective_id: uuid.UUID
    value_stream_id: uuid.UUID | None = None
    capability_id: uuid.UUID | None = None
    created_at: datetime


class FinancialSummary(ApiModel):
    cost: float
    value: float


class FinancialByValueStream(ApiModel):
    value_stream_id: uuid.UUID
    name: str
    allocated_cost: float
    allocated_value: float


class ObjectiveFinancialsResponse(ApiModel):
    forecast: FinancialSummary
    actuals: FinancialSummary
    variance: FinancialSummary
    by_value_stream: list[FinancialByValueStream]


class TraceabilityItem(ApiModel):
    id: uuid.UUID
    name: str
    via_objective: bool
    via_case_ids: list[uuid.UUID]


class ObjectiveTraceabilityResponse(ApiModel):
    value_streams: list[TraceabilityItem]
    key_activities: list[TraceabilityItem]
    capabilities: list[TraceabilityItem]
