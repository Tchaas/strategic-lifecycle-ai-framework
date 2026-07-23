import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.api.dependencies import get_current_user, get_workspace_member, get_workspace_service, require_workspace_admin
from app.core.pagination import Page, PaginationParams, paginate_items
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.schemas.workspaces import (
    WorkspaceCreateRequest,
    WorkspaceListItem,
    WorkspaceMemberResponse,
    WorkspaceMemberUpdateRequest,
    WorkspaceProvisionResponse,
    WorkspaceResponse,
    WorkspaceUpdateRequest,
)
from app.services.workspace_service import MemberDisplay, WorkspaceListResult, WorkspaceService

router = APIRouter(tags=["workspaces"])

CurrentUserDep = Annotated[User, Depends(get_current_user)]
WorkspaceMemberDep = Annotated[WorkspaceMember, Depends(get_workspace_member)]
WorkspaceAdminDep = Annotated[WorkspaceMember, Depends(require_workspace_admin)]
WorkspaceServiceDep = Annotated[WorkspaceService, Depends(get_workspace_service)]


@router.post("/workspaces", response_model=WorkspaceProvisionResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreateRequest,
    current_user: CurrentUserDep,
    workspace_service: WorkspaceServiceDep,
) -> WorkspaceProvisionResponse:
    result = workspace_service.create_workspace(current_user, payload)
    return WorkspaceProvisionResponse(
        workspace=WorkspaceResponse.model_validate(result.workspace),
        member=WorkspaceMemberResponse(
            id=result.member.id,
            user_id=current_user.id,
            full_name=current_user.full_name,
            email=current_user.email,
            avatar_url=current_user.avatar_url,
            is_admin=result.member.is_admin,
            joined_at=result.member.joined_at,
        ),
    )


@router.get("/workspaces", response_model=Page[WorkspaceListItem])
def list_workspaces(
    current_user: CurrentUserDep,
    pagination: Annotated[PaginationParams, Depends()],
    workspace_service: WorkspaceServiceDep,
) -> Page[WorkspaceListItem]:
    def mapper(result: WorkspaceListResult) -> WorkspaceListItem:
        return WorkspaceListItem(
            **WorkspaceResponse.model_validate(result.workspace).model_dump(),
            is_admin=result.member.is_admin,
            joined_at=result.member.joined_at,
        )

    return paginate_items(workspace_service.list_workspaces(current_user), pagination, mapper)


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: uuid.UUID,
    _: WorkspaceMemberDep,
    workspace_service: WorkspaceServiceDep,
) -> WorkspaceResponse:
    return WorkspaceResponse.model_validate(workspace_service.get_workspace(workspace_id))


@router.patch("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(
    workspace_id: uuid.UUID,
    payload: WorkspaceUpdateRequest,
    _: WorkspaceAdminDep,
    workspace_service: WorkspaceServiceDep,
) -> WorkspaceResponse:
    return WorkspaceResponse.model_validate(workspace_service.update_workspace(workspace_id, payload))


@router.delete("/workspaces/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: uuid.UUID,
    response: Response,
    _: WorkspaceAdminDep,
    workspace_service: WorkspaceServiceDep,
) -> Response:
    workspace_service.delete_workspace(workspace_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/workspaces/{workspace_id}/members", response_model=Page[WorkspaceMemberResponse])
def list_members(
    workspace_id: uuid.UUID,
    pagination: Annotated[PaginationParams, Depends()],
    _: WorkspaceMemberDep,
    workspace_service: WorkspaceServiceDep,
) -> Page[WorkspaceMemberResponse]:
    return paginate_items(workspace_service.list_members(workspace_id), pagination, member_display_response)


@router.patch("/workspaces/{workspace_id}/members/{member_id}", response_model=WorkspaceMemberResponse)
def update_member(
    workspace_id: uuid.UUID,
    member_id: uuid.UUID,
    payload: WorkspaceMemberUpdateRequest,
    _: WorkspaceAdminDep,
    workspace_service: WorkspaceServiceDep,
) -> WorkspaceMemberResponse:
    member = workspace_service.update_member_admin(workspace_id, member_id, payload.is_admin)
    user = workspace_service.db.get(User, member.user_id)
    if user is None:
        raise RuntimeError("workspace member user missing")
    return WorkspaceMemberResponse(
        id=member.id,
        user_id=member.user_id,
        full_name=user.full_name,
        email=user.email,
        avatar_url=user.avatar_url,
        is_admin=member.is_admin,
        joined_at=member.joined_at,
    )


@router.delete("/workspaces/{workspace_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(
    workspace_id: uuid.UUID,
    member_id: uuid.UUID,
    response: Response,
    acting_member: WorkspaceMemberDep,
    workspace_service: WorkspaceServiceDep,
) -> Response:
    workspace_service.remove_member(workspace_id, member_id, acting_member)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


def member_display_response(row: MemberDisplay) -> WorkspaceMemberResponse:
    return WorkspaceMemberResponse(
        id=row.member.id,
        user_id=row.user.id,
        full_name=row.user.full_name,
        email=row.user.email,
        avatar_url=row.user.avatar_url,
        is_admin=row.member.is_admin,
        joined_at=row.member.joined_at,
    )
