import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.api.deps import get_current_user, get_implementation_service, get_workspace_member
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.schemas.implementation import (
    ImplementationAllocationRequest,
    ImplementationAllocationResponse,
    ImplementationCreateRequest,
    ImplementationResponse,
    ImplementationUpdateRequest,
)
from app.services.implementation_service import AllocationDetail, ImplementationDetail, ImplementationService

router = APIRouter(tags=["implementation"])

CurrentUserDep = Annotated[User, Depends(get_current_user)]
WorkspaceMemberDep = Annotated[WorkspaceMember, Depends(get_workspace_member)]
ImplementationServiceDep = Annotated[ImplementationService, Depends(get_implementation_service)]


def _allocation_response(detail: AllocationDetail) -> ImplementationAllocationResponse:
    return ImplementationAllocationResponse(
        id=detail.allocation.id,
        implementation_id=detail.allocation.implementation_id,
        value_stream_id=detail.allocation.value_stream_id,
        name=detail.value_stream_name,
        allocated_cost=detail.allocation.allocated_cost,
        allocated_value=detail.allocation.allocated_value,
        created_at=detail.allocation.created_at,
    )


def _implementation_response(detail: ImplementationDetail) -> ImplementationResponse:
    response = ImplementationResponse.model_validate(detail.implementation)
    response.allocations = [_allocation_response(allocation) for allocation in detail.allocations]
    return response


@router.post(
    "/workspaces/{workspace_id}/lean-business-cases/{case_id}/implementation",
    response_model=ImplementationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_implementation(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    payload: ImplementationCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    implementation_service: ImplementationServiceDep,
) -> ImplementationResponse:
    return _implementation_response(implementation_service.create(workspace_id, case_id, current_user, payload))


@router.get(
    "/workspaces/{workspace_id}/lean-business-cases/{case_id}/implementation",
    response_model=ImplementationResponse,
)
def get_implementation(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    _: WorkspaceMemberDep,
    implementation_service: ImplementationServiceDep,
) -> ImplementationResponse:
    return _implementation_response(implementation_service.get_for_case(workspace_id, case_id))


@router.patch("/workspaces/{workspace_id}/implementation/{impl_id}", response_model=ImplementationResponse)
def update_implementation(
    workspace_id: uuid.UUID,
    impl_id: uuid.UUID,
    payload: ImplementationUpdateRequest,
    _: WorkspaceMemberDep,
    implementation_service: ImplementationServiceDep,
) -> ImplementationResponse:
    return _implementation_response(implementation_service.update(workspace_id, impl_id, payload))


@router.post(
    "/workspaces/{workspace_id}/implementation/{impl_id}/value-streams/{vs_id}",
    response_model=ImplementationAllocationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_allocation(
    workspace_id: uuid.UUID,
    impl_id: uuid.UUID,
    vs_id: uuid.UUID,
    payload: ImplementationAllocationRequest,
    _: WorkspaceMemberDep,
    implementation_service: ImplementationServiceDep,
) -> ImplementationAllocationResponse:
    return _allocation_response(implementation_service.create_allocation(workspace_id, impl_id, vs_id, payload))


@router.patch(
    "/workspaces/{workspace_id}/implementation/{impl_id}/value-streams/{vs_id}",
    response_model=ImplementationAllocationResponse,
)
def update_allocation(
    workspace_id: uuid.UUID,
    impl_id: uuid.UUID,
    vs_id: uuid.UUID,
    payload: ImplementationAllocationRequest,
    _: WorkspaceMemberDep,
    implementation_service: ImplementationServiceDep,
) -> ImplementationAllocationResponse:
    return _allocation_response(implementation_service.update_allocation(workspace_id, impl_id, vs_id, payload))


@router.delete(
    "/workspaces/{workspace_id}/implementation/{impl_id}/value-streams/{vs_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_allocation(
    workspace_id: uuid.UUID,
    impl_id: uuid.UUID,
    vs_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    implementation_service: ImplementationServiceDep,
) -> Response:
    implementation_service.delete_allocation(workspace_id, impl_id, vs_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
