import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user, get_invite_service, require_workspace_admin
from app.core.config import settings
from app.core.pagination import Page, PaginationParams, paginate_items
from app.core.rate_limit import RateLimit, rate_limit_dependency
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.schemas.workspaces import (
    InviteCreateRequest,
    InviteCreateResponse,
    InviteListItem,
    WorkspaceMemberResponse,
    WorkspaceProvisionResponse,
    WorkspaceResponse,
)
from app.services.invite_service import InviteService

router = APIRouter(tags=["invites"])

CurrentUserDep = Annotated[User, Depends(get_current_user)]
WorkspaceAdminDep = Annotated[WorkspaceMember, Depends(require_workspace_admin)]
InviteServiceDep = Annotated[InviteService, Depends(get_invite_service)]


@router.post(
    "/workspaces/{workspace_id}/invites",
    response_model=InviteCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_invite(
    workspace_id: uuid.UUID,
    payload: InviteCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceAdminDep,
    invite_service: InviteServiceDep,
) -> InviteCreateResponse:
    result = invite_service.create_invite(workspace_id, current_user, payload)
    return InviteCreateResponse(
        id=result.invite.id,
        invited_email=result.invite.invited_email,
        status=result.invite.status,
        expires_at=result.invite.expires_at,
        created_at=result.invite.created_at,
        invite_token=result.invite.invite_token or "",
        invite_url=result.invite_url,
    )


@router.get("/workspaces/{workspace_id}/invites", response_model=Page[InviteListItem])
def list_invites(
    workspace_id: uuid.UUID,
    pagination: Annotated[PaginationParams, Depends()],
    _: WorkspaceAdminDep,
    invite_service: InviteServiceDep,
) -> Page[InviteListItem]:
    return paginate_items(invite_service.list_invites(workspace_id), pagination, InviteListItem.model_validate)


@router.post(
    "/invites/{token}/accept",
    response_model=WorkspaceProvisionResponse,
    dependencies=[
        Depends(rate_limit_dependency(lambda: RateLimit("invite_accept", settings.rate_limit_invite_accept_per_minute)))
    ],
)
def accept_invite(
    token: str,
    current_user: CurrentUserDep,
    invite_service: InviteServiceDep,
) -> WorkspaceProvisionResponse:
    result = invite_service.accept_invite(token, current_user)
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
