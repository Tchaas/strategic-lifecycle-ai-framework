import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.api.dependencies import get_current_user, get_strategy_service, get_workspace_member
from app.core.pagination import Page, PaginationParams, paginate_items
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.schemas.strategy import (
    ObjectiveComponentLinkResponse,
    ObjectiveFinancialsResponse,
    ObjectiveTraceabilityResponse,
    StrategicObjectiveCreateRequest,
    StrategicObjectiveMetricCreateRequest,
    StrategicObjectiveMetricResponse,
    StrategicObjectiveMetricUpdateRequest,
    StrategicObjectiveResponse,
    StrategicObjectiveUpdateRequest,
)
from app.services.strategy_service import ObjectiveDetail, StrategyService

router = APIRouter(tags=["strategy"])

CurrentUserDep = Annotated[User, Depends(get_current_user)]
WorkspaceMemberDep = Annotated[WorkspaceMember, Depends(get_workspace_member)]
StrategyServiceDep = Annotated[StrategyService, Depends(get_strategy_service)]


@router.post(
    "/workspaces/{workspace_id}/strategic-objectives",
    response_model=StrategicObjectiveResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_objective(
    workspace_id: uuid.UUID,
    payload: StrategicObjectiveCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> StrategicObjectiveResponse:
    objective = strategy_service.create_objective(workspace_id, current_user, payload)
    return objective_response(ObjectiveDetail(objective, [], [], []))


@router.get("/workspaces/{workspace_id}/strategic-objectives", response_model=Page[StrategicObjectiveResponse])
def list_objectives(
    workspace_id: uuid.UUID,
    pagination: Annotated[PaginationParams, Depends()],
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> Page[StrategicObjectiveResponse]:
    return paginate_items(
        strategy_service.list_objectives(workspace_id),
        pagination,
        lambda objective: objective_response(ObjectiveDetail(objective, [], [], [])),
    )


@router.get(
    "/workspaces/{workspace_id}/strategic-objectives/{objective_id}",
    response_model=StrategicObjectiveResponse,
)
def get_objective(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> StrategicObjectiveResponse:
    return objective_response(strategy_service.get_objective_detail(workspace_id, objective_id))


@router.patch(
    "/workspaces/{workspace_id}/strategic-objectives/{objective_id}",
    response_model=StrategicObjectiveResponse,
)
def update_objective(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    payload: StrategicObjectiveUpdateRequest,
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> StrategicObjectiveResponse:
    objective = strategy_service.update_objective(workspace_id, objective_id, payload)
    return objective_response(strategy_service.get_objective_detail(workspace_id, objective.id))


@router.post(
    "/workspaces/{workspace_id}/strategic-objectives/{objective_id}/metrics",
    response_model=StrategicObjectiveMetricResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_metric(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    payload: StrategicObjectiveMetricCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> StrategicObjectiveMetricResponse:
    return StrategicObjectiveMetricResponse.model_validate(
        strategy_service.create_metric(workspace_id, objective_id, current_user, payload)
    )


@router.get(
    "/workspaces/{workspace_id}/strategic-objectives/{objective_id}/metrics",
    response_model=Page[StrategicObjectiveMetricResponse],
)
def list_metrics(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    pagination: Annotated[PaginationParams, Depends()],
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> Page[StrategicObjectiveMetricResponse]:
    return paginate_items(
        strategy_service.list_metrics(workspace_id, objective_id),
        pagination,
        StrategicObjectiveMetricResponse.model_validate,
    )


@router.patch("/workspaces/{workspace_id}/metrics/{metric_id}", response_model=StrategicObjectiveMetricResponse)
def update_metric(
    workspace_id: uuid.UUID,
    metric_id: uuid.UUID,
    payload: StrategicObjectiveMetricUpdateRequest,
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> StrategicObjectiveMetricResponse:
    return StrategicObjectiveMetricResponse.model_validate(
        strategy_service.update_metric(workspace_id, metric_id, payload)
    )


@router.delete("/workspaces/{workspace_id}/metrics/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_metric(
    workspace_id: uuid.UUID,
    metric_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> Response:
    strategy_service.delete_metric(workspace_id, metric_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/strategic-objectives/{objective_id}/value-streams/{vs_id}",
    response_model=ObjectiveComponentLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
def link_objective_value_stream(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    vs_id: uuid.UUID,
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> ObjectiveComponentLinkResponse:
    link = strategy_service.link_value_stream(workspace_id, objective_id, vs_id)
    return ObjectiveComponentLinkResponse.model_validate(link)


@router.delete(
    "/workspaces/{workspace_id}/strategic-objectives/{objective_id}/value-streams/{vs_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unlink_objective_value_stream(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    vs_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> Response:
    strategy_service.unlink_value_stream(workspace_id, objective_id, vs_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/strategic-objectives/{objective_id}/capabilities/{cap_id}",
    response_model=ObjectiveComponentLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
def link_objective_capability(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    cap_id: uuid.UUID,
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> ObjectiveComponentLinkResponse:
    link = strategy_service.link_capability(workspace_id, objective_id, cap_id)
    return ObjectiveComponentLinkResponse.model_validate(link)


@router.delete(
    "/workspaces/{workspace_id}/strategic-objectives/{objective_id}/capabilities/{cap_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unlink_objective_capability(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    cap_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> Response:
    strategy_service.unlink_capability(workspace_id, objective_id, cap_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get(
    "/workspaces/{workspace_id}/strategic-objectives/{objective_id}/financials",
    response_model=ObjectiveFinancialsResponse,
)
def get_objective_financials(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> ObjectiveFinancialsResponse:
    return strategy_service.financials(workspace_id, objective_id)


@router.get(
    "/workspaces/{workspace_id}/strategic-objectives/{objective_id}/traceability",
    response_model=ObjectiveTraceabilityResponse,
)
def get_objective_traceability(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    _: WorkspaceMemberDep,
    strategy_service: StrategyServiceDep,
) -> ObjectiveTraceabilityResponse:
    return strategy_service.traceability(workspace_id, objective_id)


def objective_response(detail: ObjectiveDetail) -> StrategicObjectiveResponse:
    return StrategicObjectiveResponse(
        **StrategicObjectiveResponse.model_validate(detail.objective).model_dump(
            exclude={"metrics", "value_stream_ids", "capability_ids"}
        ),
        metrics=[StrategicObjectiveMetricResponse.model_validate(metric) for metric in detail.metrics],
        value_stream_ids=detail.value_stream_ids,
        capability_ids=detail.capability_ids,
    )
