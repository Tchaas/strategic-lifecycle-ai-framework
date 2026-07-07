import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.api.deps import get_current_user, get_solution_service, get_workspace_member
from app.core.pagination import Page, PaginationParams, paginate_items
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.schemas.solution import (
    DeliverableCreateRequest,
    DeliverableResponse,
    DeliverableUpdateRequest,
    FeatureCreateRequest,
    FeatureResponse,
    FeatureUpdateRequest,
    RequirementCreateRequest,
    RequirementResponse,
    RequirementUpdateRequest,
)
from app.services.solution_service import SolutionService

router = APIRouter(tags=["solution"])

CurrentUserDep = Annotated[User, Depends(get_current_user)]
WorkspaceMemberDep = Annotated[WorkspaceMember, Depends(get_workspace_member)]
SolutionServiceDep = Annotated[SolutionService, Depends(get_solution_service)]


@router.post(
    "/workspaces/{workspace_id}/lean-business-cases/{case_id}/features",
    response_model=FeatureResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_feature(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    payload: FeatureCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    solution_service: SolutionServiceDep,
) -> FeatureResponse:
    return FeatureResponse.model_validate(solution_service.create_feature(workspace_id, case_id, current_user, payload))


@router.get("/workspaces/{workspace_id}/lean-business-cases/{case_id}/features", response_model=Page[FeatureResponse])
def list_features(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    pagination: Annotated[PaginationParams, Depends()],
    _: WorkspaceMemberDep,
    solution_service: SolutionServiceDep,
) -> Page[FeatureResponse]:
    return paginate_items(
        solution_service.list_features(workspace_id, case_id),
        pagination,
        FeatureResponse.model_validate,
    )


@router.patch("/workspaces/{workspace_id}/features/{feature_id}", response_model=FeatureResponse)
def update_feature(
    workspace_id: uuid.UUID,
    feature_id: uuid.UUID,
    payload: FeatureUpdateRequest,
    _: WorkspaceMemberDep,
    solution_service: SolutionServiceDep,
) -> FeatureResponse:
    return FeatureResponse.model_validate(solution_service.update_feature(workspace_id, feature_id, payload))


@router.delete("/workspaces/{workspace_id}/features/{feature_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_feature(
    workspace_id: uuid.UUID,
    feature_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    solution_service: SolutionServiceDep,
) -> Response:
    solution_service.delete_feature(workspace_id, feature_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/features/{feature_id}/requirements",
    response_model=RequirementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_requirement(
    workspace_id: uuid.UUID,
    feature_id: uuid.UUID,
    payload: RequirementCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    solution_service: SolutionServiceDep,
) -> RequirementResponse:
    return RequirementResponse.model_validate(
        solution_service.create_requirement(workspace_id, feature_id, current_user, payload)
    )


@router.get(
    "/workspaces/{workspace_id}/features/{feature_id}/requirements",
    response_model=Page[RequirementResponse],
)
def list_requirements(
    workspace_id: uuid.UUID,
    feature_id: uuid.UUID,
    pagination: Annotated[PaginationParams, Depends()],
    _: WorkspaceMemberDep,
    solution_service: SolutionServiceDep,
) -> Page[RequirementResponse]:
    return paginate_items(
        solution_service.list_requirements(workspace_id, feature_id),
        pagination,
        RequirementResponse.model_validate,
    )


@router.patch("/workspaces/{workspace_id}/requirements/{requirement_id}", response_model=RequirementResponse)
def update_requirement(
    workspace_id: uuid.UUID,
    requirement_id: uuid.UUID,
    payload: RequirementUpdateRequest,
    _: WorkspaceMemberDep,
    solution_service: SolutionServiceDep,
) -> RequirementResponse:
    return RequirementResponse.model_validate(
        solution_service.update_requirement(workspace_id, requirement_id, payload)
    )


@router.delete("/workspaces/{workspace_id}/requirements/{requirement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_requirement(
    workspace_id: uuid.UUID,
    requirement_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    solution_service: SolutionServiceDep,
) -> Response:
    solution_service.delete_requirement(workspace_id, requirement_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/lean-business-cases/{case_id}/deliverables",
    response_model=DeliverableResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_deliverable(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    payload: DeliverableCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    solution_service: SolutionServiceDep,
) -> DeliverableResponse:
    return DeliverableResponse.model_validate(
        solution_service.create_deliverable(workspace_id, case_id, current_user, payload)
    )


@router.get(
    "/workspaces/{workspace_id}/lean-business-cases/{case_id}/deliverables",
    response_model=Page[DeliverableResponse],
)
def list_deliverables(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    pagination: Annotated[PaginationParams, Depends()],
    _: WorkspaceMemberDep,
    solution_service: SolutionServiceDep,
) -> Page[DeliverableResponse]:
    return paginate_items(
        solution_service.list_deliverables(workspace_id, case_id),
        pagination,
        DeliverableResponse.model_validate,
    )


@router.patch("/workspaces/{workspace_id}/deliverables/{deliverable_id}", response_model=DeliverableResponse)
def update_deliverable(
    workspace_id: uuid.UUID,
    deliverable_id: uuid.UUID,
    payload: DeliverableUpdateRequest,
    _: WorkspaceMemberDep,
    solution_service: SolutionServiceDep,
) -> DeliverableResponse:
    return DeliverableResponse.model_validate(
        solution_service.update_deliverable(workspace_id, deliverable_id, payload)
    )


@router.delete("/workspaces/{workspace_id}/deliverables/{deliverable_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deliverable(
    workspace_id: uuid.UUID,
    deliverable_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    solution_service: SolutionServiceDep,
) -> Response:
    solution_service.delete_deliverable(workspace_id, deliverable_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
