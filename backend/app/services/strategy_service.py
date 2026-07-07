from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.business_capabilities import BusinessCapability
from app.models.implementation import Implementation
from app.models.implementation_value_streams import ImplementationValueStream
from app.models.key_activities import KeyActivity
from app.models.lean_business_case_capabilities import LeanBusinessCaseCapability
from app.models.lean_business_case_key_activities import LeanBusinessCaseKeyActivity
from app.models.lean_business_case_value_streams import LeanBusinessCaseValueStream
from app.models.lean_business_cases import LeanBusinessCase
from app.models.strategic_objective_capabilities import StrategicObjectiveCapability
from app.models.strategic_objective_metrics import StrategicObjectiveMetric
from app.models.strategic_objective_value_streams import StrategicObjectiveValueStream
from app.models.strategic_objectives import StrategicObjective
from app.models.users import User
from app.models.value_streams import ValueStream
from app.schemas.strategy import (
    FinancialByValueStream,
    FinancialSummary,
    ObjectiveFinancialsResponse,
    ObjectiveTraceabilityResponse,
    StrategicObjectiveCreateRequest,
    StrategicObjectiveMetricCreateRequest,
    StrategicObjectiveMetricUpdateRequest,
    StrategicObjectiveUpdateRequest,
    TraceabilityItem,
)
from app.services.lifecycle import GateConfig, ensure_active_gate_maintenance, transition_status

OBJECTIVE_LIMIT = 3
GATE_FIELDS = (
    "strategic_initiative_name",
    "executive_objective",
    "strategic_value_category",
    "problem_opportunity_statement",
    "value_hypothesis",
)
OBJECTIVE_GATE = GateConfig(GATE_FIELDS, "Objective is missing required active fields")


@dataclass(frozen=True)
class ObjectiveDetail:
    objective: StrategicObjective
    metrics: list[StrategicObjectiveMetric]
    value_stream_ids: list[uuid.UUID]
    capability_ids: list[uuid.UUID]


@dataclass
class TraceItem:
    id: uuid.UUID
    name: str
    via_objective: bool = False
    via_case_ids: set[uuid.UUID] = field(default_factory=set)


class StrategyService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_objective(
        self,
        workspace_id: uuid.UUID,
        user: User,
        payload: StrategicObjectiveCreateRequest,
    ) -> StrategicObjective:
        current = int(
            self.db.scalar(
                select(func.count())
                .select_from(StrategicObjective)
                .where(StrategicObjective.workspace_id == workspace_id, StrategicObjective.status != "archived")
            )
            or 0
        )
        if current >= OBJECTIVE_LIMIT:
            raise AppError(
                "cardinality_limit",
                "Strategic objective limit reached",
                409,
                {"limit": OBJECTIVE_LIMIT, "current": current},
            )
        objective = StrategicObjective(
            **payload.model_dump(),
            workspace_id=workspace_id,
            status="draft",
            created_by_user_id=user.id,
        )
        self.db.add(objective)
        self.db.commit()
        return objective

    def list_objectives(self, workspace_id: uuid.UUID) -> list[StrategicObjective]:
        return list(
            self.db.scalars(
                select(StrategicObjective)
                .where(StrategicObjective.workspace_id == workspace_id)
                .order_by(StrategicObjective.created_at, StrategicObjective.id)
            ).all()
        )

    def get_objective_detail(self, workspace_id: uuid.UUID, objective_id: uuid.UUID) -> ObjectiveDetail:
        objective = self._get_objective(workspace_id, objective_id)
        metrics = self.list_metrics(workspace_id, objective_id)
        value_stream_ids = list(
            self.db.scalars(
                select(StrategicObjectiveValueStream.value_stream_id).where(
                    StrategicObjectiveValueStream.strategic_objective_id == objective_id
                )
            ).all()
        )
        capability_ids = list(
            self.db.scalars(
                select(StrategicObjectiveCapability.capability_id).where(
                    StrategicObjectiveCapability.strategic_objective_id == objective_id
                )
            ).all()
        )
        return ObjectiveDetail(objective, metrics, value_stream_ids, capability_ids)

    def update_objective(
        self,
        workspace_id: uuid.UUID,
        objective_id: uuid.UUID,
        payload: StrategicObjectiveUpdateRequest,
    ) -> StrategicObjective:
        objective = self._get_objective(workspace_id, objective_id)
        values = payload.model_dump(exclude_unset=True)
        requested_status = values.pop("status", None)
        for key, value in values.items():
            setattr(objective, key, value)
        ensure_active_gate_maintenance(objective, OBJECTIVE_GATE)
        if requested_status is not None and requested_status != objective.status:
            transition_status(objective, requested_status, OBJECTIVE_GATE)
        self.db.commit()
        return objective

    def create_metric(
        self,
        workspace_id: uuid.UUID,
        objective_id: uuid.UUID,
        user: User,
        payload: StrategicObjectiveMetricCreateRequest,
    ) -> StrategicObjectiveMetric:
        self._get_objective(workspace_id, objective_id)
        metric = StrategicObjectiveMetric(
            **payload.model_dump(),
            strategic_objective_id=objective_id,
            workspace_id=workspace_id,
            created_by_user_id=user.id,
        )
        self.db.add(metric)
        self.db.commit()
        return metric

    def list_metrics(self, workspace_id: uuid.UUID, objective_id: uuid.UUID) -> list[StrategicObjectiveMetric]:
        self._get_objective(workspace_id, objective_id)
        return list(
            self.db.scalars(
                select(StrategicObjectiveMetric)
                .where(
                    StrategicObjectiveMetric.workspace_id == workspace_id,
                    StrategicObjectiveMetric.strategic_objective_id == objective_id,
                )
                .order_by(StrategicObjectiveMetric.created_at, StrategicObjectiveMetric.id)
            ).all()
        )

    def update_metric(
        self,
        workspace_id: uuid.UUID,
        metric_id: uuid.UUID,
        payload: StrategicObjectiveMetricUpdateRequest,
    ) -> StrategicObjectiveMetric:
        metric = self._get_metric(workspace_id, metric_id)
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(metric, key, value)
        self.db.commit()
        return metric

    def delete_metric(self, workspace_id: uuid.UUID, metric_id: uuid.UUID) -> None:
        metric = self._get_metric(workspace_id, metric_id)
        self.db.delete(metric)
        self.db.commit()

    def link_value_stream(
        self,
        workspace_id: uuid.UUID,
        objective_id: uuid.UUID,
        value_stream_id: uuid.UUID,
    ) -> StrategicObjectiveValueStream:
        self._get_objective(workspace_id, objective_id)
        self._get_value_stream(workspace_id, value_stream_id)
        link = StrategicObjectiveValueStream(strategic_objective_id=objective_id, value_stream_id=value_stream_id)
        self.db.add(link)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise AppError("already_linked", "Value stream is already linked", 409) from exc
        return link

    def unlink_value_stream(self, workspace_id: uuid.UUID, objective_id: uuid.UUID, value_stream_id: uuid.UUID) -> None:
        self._get_objective(workspace_id, objective_id)
        self._get_value_stream(workspace_id, value_stream_id)
        link = self.db.scalar(
            select(StrategicObjectiveValueStream).where(
                StrategicObjectiveValueStream.strategic_objective_id == objective_id,
                StrategicObjectiveValueStream.value_stream_id == value_stream_id,
            )
        )
        if link is None:
            raise AppError("not_found", "Resource not found", 404)
        self.db.delete(link)
        self.db.commit()

    def link_capability(
        self,
        workspace_id: uuid.UUID,
        objective_id: uuid.UUID,
        capability_id: uuid.UUID,
    ) -> StrategicObjectiveCapability:
        self._get_objective(workspace_id, objective_id)
        self._get_capability(workspace_id, capability_id)
        link = StrategicObjectiveCapability(strategic_objective_id=objective_id, capability_id=capability_id)
        self.db.add(link)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise AppError("already_linked", "Capability is already linked", 409) from exc
        return link

    def unlink_capability(self, workspace_id: uuid.UUID, objective_id: uuid.UUID, capability_id: uuid.UUID) -> None:
        self._get_objective(workspace_id, objective_id)
        self._get_capability(workspace_id, capability_id)
        link = self.db.scalar(
            select(StrategicObjectiveCapability).where(
                StrategicObjectiveCapability.strategic_objective_id == objective_id,
                StrategicObjectiveCapability.capability_id == capability_id,
            )
        )
        if link is None:
            raise AppError("not_found", "Resource not found", 404)
        self.db.delete(link)
        self.db.commit()

    def financials(self, workspace_id: uuid.UUID, objective_id: uuid.UUID) -> ObjectiveFinancialsResponse:
        self._get_objective(workspace_id, objective_id)
        case_ids_subquery = (
            select(LeanBusinessCase.id)
            .where(
                LeanBusinessCase.workspace_id == workspace_id,
                LeanBusinessCase.strategic_objective_id == objective_id,
                LeanBusinessCase.status != "archived",
            )
            .subquery()
        )
        forecast = self.db.execute(
            select(
                func.coalesce(func.sum(LeanBusinessCase.forecast_cost), 0.0),
                func.coalesce(func.sum(LeanBusinessCase.forecast_value), 0.0),
            ).where(LeanBusinessCase.id.in_(select(case_ids_subquery.c.id)))
        ).one()
        actuals = self.db.execute(
            select(
                func.coalesce(func.sum(Implementation.actual_cost), 0.0),
                func.coalesce(func.sum(Implementation.actual_value), 0.0),
            ).where(Implementation.lean_business_case_id.in_(select(case_ids_subquery.c.id)))
        ).one()
        by_stream_rows = self.db.execute(
            select(
                ValueStream.id,
                ValueStream.name,
                func.coalesce(func.sum(ImplementationValueStream.allocated_cost), 0.0),
                func.coalesce(func.sum(ImplementationValueStream.allocated_value), 0.0),
            )
            .join(ImplementationValueStream, ImplementationValueStream.value_stream_id == ValueStream.id)
            .join(Implementation, Implementation.id == ImplementationValueStream.implementation_id)
            .where(Implementation.lean_business_case_id.in_(select(case_ids_subquery.c.id)))
            .group_by(ValueStream.id, ValueStream.name)
            .order_by(ValueStream.name)
        ).all()
        forecast_cost, forecast_value = float(forecast[0] or 0), float(forecast[1] or 0)
        actual_cost, actual_value = float(actuals[0] or 0), float(actuals[1] or 0)
        return ObjectiveFinancialsResponse(
            forecast=FinancialSummary(cost=forecast_cost, value=forecast_value),
            actuals=FinancialSummary(cost=actual_cost, value=actual_value),
            variance=FinancialSummary(cost=actual_cost - forecast_cost, value=actual_value - forecast_value),
            by_value_stream=[
                FinancialByValueStream(
                    value_stream_id=row[0],
                    name=row[1],
                    allocated_cost=float(row[2] or 0),
                    allocated_value=float(row[3] or 0),
                )
                for row in by_stream_rows
            ],
        )

    def traceability(self, workspace_id: uuid.UUID, objective_id: uuid.UUID) -> ObjectiveTraceabilityResponse:
        self._get_objective(workspace_id, objective_id)
        streams: dict[uuid.UUID, TraceItem] = {}
        activities: dict[uuid.UUID, TraceItem] = {}
        capabilities: dict[uuid.UUID, TraceItem] = {}

        for stream_id, name in self.db.execute(
            select(ValueStream.id, ValueStream.name)
            .join(StrategicObjectiveValueStream, StrategicObjectiveValueStream.value_stream_id == ValueStream.id)
            .where(StrategicObjectiveValueStream.strategic_objective_id == objective_id)
        ):
            streams.setdefault(stream_id, TraceItem(stream_id, name)).via_objective = True
        for capability_id, name in self.db.execute(
            select(BusinessCapability.id, BusinessCapability.capability_name)
            .join(StrategicObjectiveCapability, StrategicObjectiveCapability.capability_id == BusinessCapability.id)
            .where(StrategicObjectiveCapability.strategic_objective_id == objective_id)
        ):
            capabilities.setdefault(capability_id, TraceItem(capability_id, name)).via_objective = True

        case_ids = list(
            self.db.scalars(
                select(LeanBusinessCase.id).where(
                    LeanBusinessCase.workspace_id == workspace_id,
                    LeanBusinessCase.strategic_objective_id == objective_id,
                )
            )
        )
        for case_id, stream_id, name in self.db.execute(
            select(LeanBusinessCaseValueStream.case_id, ValueStream.id, ValueStream.name)
            .join(ValueStream, ValueStream.id == LeanBusinessCaseValueStream.value_stream_id)
            .where(LeanBusinessCaseValueStream.case_id.in_(case_ids))
        ):
            streams.setdefault(stream_id, TraceItem(stream_id, name)).via_case_ids.add(case_id)
        for case_id, activity_id, name in self.db.execute(
            select(LeanBusinessCaseKeyActivity.case_id, KeyActivity.id, KeyActivity.activity_name)
            .join(KeyActivity, KeyActivity.id == LeanBusinessCaseKeyActivity.key_activity_id)
            .where(LeanBusinessCaseKeyActivity.case_id.in_(case_ids))
        ):
            activities.setdefault(activity_id, TraceItem(activity_id, name)).via_case_ids.add(case_id)
        for case_id, capability_id, name in self.db.execute(
            select(LeanBusinessCaseCapability.case_id, BusinessCapability.id, BusinessCapability.capability_name)
            .join(BusinessCapability, BusinessCapability.id == LeanBusinessCaseCapability.capability_id)
            .where(LeanBusinessCaseCapability.case_id.in_(case_ids))
        ):
            capabilities.setdefault(capability_id, TraceItem(capability_id, name)).via_case_ids.add(case_id)

        return ObjectiveTraceabilityResponse(
            value_streams=[self._trace_item_response(item) for item in streams.values()],
            key_activities=[self._trace_item_response(item) for item in activities.values()],
            capabilities=[self._trace_item_response(item) for item in capabilities.values()],
        )

    def _get_objective(self, workspace_id: uuid.UUID, objective_id: uuid.UUID) -> StrategicObjective:
        objective = self.db.get(StrategicObjective, objective_id)
        if objective is None or objective.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return objective

    def _get_metric(self, workspace_id: uuid.UUID, metric_id: uuid.UUID) -> StrategicObjectiveMetric:
        metric = self.db.get(StrategicObjectiveMetric, metric_id)
        if metric is None or metric.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return metric

    def _get_value_stream(self, workspace_id: uuid.UUID, value_stream_id: uuid.UUID) -> ValueStream:
        stream = self.db.get(ValueStream, value_stream_id)
        if stream is None or stream.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return stream

    def _get_capability(self, workspace_id: uuid.UUID, capability_id: uuid.UUID) -> BusinessCapability:
        capability = self.db.get(BusinessCapability, capability_id)
        if capability is None or capability.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return capability

    def _trace_item_response(self, item: TraceItem) -> TraceabilityItem:
        return TraceabilityItem(
            id=item.id,
            name=item.name,
            via_objective=item.via_objective,
            via_case_ids=sorted(item.via_case_ids),
        )
