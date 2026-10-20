import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import get_current_user, get_invite_service, require_workspace_admin
from app.core.config import settings
from app.core.errors import AppError
from app.core.pagination import Page, PaginationParams, paginate_items
from app.core.rate_limit import RateLimit, rate_limit_dependency
from app.core.security import hash_password
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.schemas.auth import LoginResponse, SignupRequest, UserResponse
from app.schemas.workspaces import (
    InviteCreateRequest,
    InviteCreateResponse,
    InviteListItem,
    WorkspaceMemberResponse,
    WorkspaceProvisionResponse,
    WorkspaceResponse,
)
from app.services.auth_service import AuthService
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
    return paginate_items(
        invite_service.list_invites(workspace_id), pagination,
        lambda invite: InviteListItem.model_validate(invite).model_copy(
            update={"delivery_status": invite_service.delivery_status(invite.id)}
        ),
    )


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
            role=result.member.role,
            is_admin=result.member.is_admin,
            joined_at=result.member.joined_at,
        ),
    )


@router.get(
    "/invites/{token}",
    dependencies=[Depends(rate_limit_dependency(lambda: RateLimit("invite_preview", 20)))],
)
def preview_invite(token: str, invite_service: InviteServiceDep) -> dict[str, str]:
    return invite_service.preview(token)


@router.post(
    "/invites/{token}/register",
    response_model=LoginResponse,
    status_code=201,
    dependencies=[Depends(rate_limit_dependency(lambda: RateLimit("invite_register", 5)))],
)
def register_invited(token: str, payload: SignupRequest, invite_service: InviteServiceDep) -> LoginResponse:
    preview = invite_service.preview(token)
    if preview["email"].casefold() != payload.email.casefold():
        raise AppError("email_mismatch", "Use the email address on your invitation", 403)
    db = invite_service.db
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        auth_provider="password",
        email_verified=False,
    )
    db.add(user)
    try:
        db.flush()
        tokens = AuthService(db)._issue_tokens(user)
        invite_service.accept_invite(token, user)  # Commits account, verification, membership and tokens together.
    except IntegrityError as exc:
        db.rollback()
        raise AppError(
            "email_taken",
            "This email already has an account. Sign in to accept the invitation.",
            409,
        ) from exc
    return LoginResponse(user=UserResponse.model_validate(user), **tokens.__dict__)


@router.post("/workspaces/{workspace_id}/invites/{invite_id}/resend", status_code=202)
def resend_invite(
    workspace_id: uuid.UUID,
    invite_id: uuid.UUID,
    _: WorkspaceAdminDep,
    invite_service: InviteServiceDep,
) -> dict[str, str]:
    invite_service.resend_invite(workspace_id, invite_id)
    return {"status": "queued"}
