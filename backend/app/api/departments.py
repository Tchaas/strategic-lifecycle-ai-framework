import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.api.deps import get_current_user, get_department_service, get_workspace_member, require_workspace_admin
from app.core.pagination import Page, PaginationParams, paginate_items
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.schemas.departments import DepartmentCreateRequest, DepartmentResponse, DepartmentUpdateRequest
from app.services.department_service import DepartmentService

router = APIRouter(tags=["departments"])

CurrentUserDep = Annotated[User, Depends(get_current_user)]
WorkspaceMemberDep = Annotated[WorkspaceMember, Depends(get_workspace_member)]
WorkspaceAdminDep = Annotated[WorkspaceMember, Depends(require_workspace_admin)]
DepartmentServiceDep = Annotated[DepartmentService, Depends(get_department_service)]
ParentIdQuery = Annotated[uuid.UUID | None, Query(alias="parentId")]


@router.post(
    "/workspaces/{workspace_id}/departments",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_department(
    workspace_id: uuid.UUID,
    payload: DepartmentCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceAdminDep,
    department_service: DepartmentServiceDep,
) -> DepartmentResponse:
    return DepartmentResponse.model_validate(department_service.create_department(workspace_id, current_user, payload))


@router.get("/workspaces/{workspace_id}/departments", response_model=Page[DepartmentResponse])
def list_departments(
    workspace_id: uuid.UUID,
    pagination: Annotated[PaginationParams, Depends()],
    _: WorkspaceMemberDep,
    department_service: DepartmentServiceDep,
    parent_id: ParentIdQuery = None,
) -> Page[DepartmentResponse]:
    return paginate_items(
        department_service.list_departments(workspace_id, parent_id),
        pagination,
        DepartmentResponse.model_validate,
    )


@router.get("/workspaces/{workspace_id}/departments/{department_id}", response_model=DepartmentResponse)
def get_department(
    workspace_id: uuid.UUID,
    department_id: uuid.UUID,
    _: WorkspaceMemberDep,
    department_service: DepartmentServiceDep,
) -> DepartmentResponse:
    return DepartmentResponse.model_validate(department_service.get_department(workspace_id, department_id))


@router.patch("/workspaces/{workspace_id}/departments/{department_id}", response_model=DepartmentResponse)
def update_department(
    workspace_id: uuid.UUID,
    department_id: uuid.UUID,
    payload: DepartmentUpdateRequest,
    _: WorkspaceAdminDep,
    department_service: DepartmentServiceDep,
) -> DepartmentResponse:
    return DepartmentResponse.model_validate(department_service.update_department(workspace_id, department_id, payload))


@router.delete("/workspaces/{workspace_id}/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    workspace_id: uuid.UUID,
    department_id: uuid.UUID,
    response: Response,
    _: WorkspaceAdminDep,
    department_service: DepartmentServiceDep,
) -> Response:
    department_service.delete_department(workspace_id, department_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
