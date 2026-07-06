import uuid
from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import decode_access_token
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.services.auth_service import AuthService
from app.services.business_architecture_service import BusinessArchitectureService
from app.services.capability_service import CapabilityService
from app.services.department_service import DepartmentService
from app.services.invite_service import InviteService
from app.services.key_activity_service import KeyActivityService
from app.services.value_stream_service import ValueStreamService
from app.services.workspace_service import WorkspaceService

bearer_scheme = HTTPBearer(auto_error=False)
BearerCredentials = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)]
DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    credentials: BearerCredentials,
    db: DbSession,
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError("invalid_token", "Missing bearer token", 401)
    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id)
    if user is None:
        raise AppError("invalid_token", "Invalid token", 401)
    return user


def get_auth_service(db: DbSession) -> Generator[AuthService, None, None]:
    yield AuthService(db)


def get_workspace_service(db: DbSession) -> Generator[WorkspaceService, None, None]:
    yield WorkspaceService(db)


def get_invite_service(db: DbSession) -> Generator[InviteService, None, None]:
    yield InviteService(db)


def get_department_service(db: DbSession) -> Generator[DepartmentService, None, None]:
    yield DepartmentService(db)


def get_business_architecture_service(db: DbSession) -> Generator[BusinessArchitectureService, None, None]:
    yield BusinessArchitectureService(db)


def get_value_stream_service(db: DbSession) -> Generator[ValueStreamService, None, None]:
    yield ValueStreamService(db)


def get_key_activity_service(db: DbSession) -> Generator[KeyActivityService, None, None]:
    yield KeyActivityService(db)


def get_capability_service(db: DbSession) -> Generator[CapabilityService, None, None]:
    yield CapabilityService(db)


def get_workspace_member(
    workspace_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DbSession,
) -> WorkspaceMember:
    member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
    )
    if member is None:
        raise AppError("not_found", "Resource not found", 404)
    return member


def require_workspace_admin(
    member: Annotated[WorkspaceMember, Depends(get_workspace_member)],
) -> WorkspaceMember:
    if not member.is_admin:
        raise AppError("admin_required", "Workspace admin privileges are required", 403)
    return member
