from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import utc_now
from app.models.lean_business_cases import LeanBusinessCase
from app.models.strategic_objectives import StrategicObjective
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.models.workspaces import Workspace
from app.schemas.workspaces import WorkspaceCreateRequest, WorkspaceUpdateRequest

WORKSPACE_PROFILE_FIELDS = (
    "name",
    "legal_name",
    "business_unit",
    "description",
    "industry",
    "operating_model",
    "business_model",
    "primary_customers",
    "primary_products",
    "strategic_context",
    "company_size",
    "headquarters_region",
    "website",
    "logo_url",
    "annual_revenue",
)


@dataclass(frozen=True)
class WorkspaceProvisionResult:
    workspace: Workspace
    member: WorkspaceMember


@dataclass(frozen=True)
class MemberDisplay:
    member: WorkspaceMember
    user: User


@dataclass(frozen=True)
class WorkspaceListResult:
    workspace: Workspace
    member: WorkspaceMember


def provision_workspace_for_user(
    db: Session,
    user: User,
    payload: WorkspaceCreateRequest,
    *,
    commit: bool = True,
) -> WorkspaceProvisionResult:
    values = payload.model_dump()
    workspace = Workspace(**values, created_by_user_id=user.id)
    db.add(workspace)
    db.flush()
    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        is_admin=True,
        joined_at=utc_now(),
        created_by_user_id=user.id,
    )
    db.add(member)
    db.flush()
    if commit:
        db.commit()
    return WorkspaceProvisionResult(workspace=workspace, member=member)


class WorkspaceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_workspace(self, user: User, payload: WorkspaceCreateRequest) -> WorkspaceProvisionResult:
        return provision_workspace_for_user(self.db, user, payload)

    def list_workspaces(self, user: User) -> list[WorkspaceListResult]:
        rows = self.db.execute(
            select(Workspace, WorkspaceMember)
            .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
            .where(WorkspaceMember.user_id == user.id)
            .order_by(Workspace.created_at)
        ).all()
        return [WorkspaceListResult(workspace=workspace, member=member) for workspace, member in rows]

    def get_workspace(self, workspace_id: uuid.UUID) -> Workspace:
        workspace = self.db.get(Workspace, workspace_id)
        if workspace is None:
            raise AppError("not_found", "Resource not found", 404)
        return workspace

    def update_workspace(self, workspace_id: uuid.UUID, payload: WorkspaceUpdateRequest) -> Workspace:
        workspace = self.get_workspace(workspace_id)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            if key in WORKSPACE_PROFILE_FIELDS:
                setattr(workspace, key, value)
        self.db.commit()
        return workspace

    def delete_workspace(self, workspace_id: uuid.UUID) -> None:
        workspace = self.get_workspace(workspace_id)
        self.db.delete(workspace)
        self.db.commit()

    def list_members(self, workspace_id: uuid.UUID) -> list[MemberDisplay]:
        rows = self.db.execute(
            select(WorkspaceMember, User)
            .join(User, User.id == WorkspaceMember.user_id)
            .where(WorkspaceMember.workspace_id == workspace_id)
            .order_by(WorkspaceMember.joined_at, User.email)
        ).all()
        return [MemberDisplay(member=member, user=user) for member, user in rows]

    def update_member_admin(
        self,
        workspace_id: uuid.UUID,
        member_id: uuid.UUID,
        is_admin: bool,
    ) -> WorkspaceMember:
        member = self._get_member(workspace_id, member_id)
        if member.is_admin and not is_admin:
            self._ensure_not_last_admin(workspace_id, member.id)
        member.is_admin = is_admin
        self.db.commit()
        return member

    def remove_member(
        self,
        workspace_id: uuid.UUID,
        member_id: uuid.UUID,
        acting_member: WorkspaceMember,
    ) -> None:
        target = self._get_member(workspace_id, member_id)
        if not acting_member.is_admin and target.user_id != acting_member.user_id:
            raise AppError("admin_required", "Workspace admin privileges are required", 403)
        if target.is_admin:
            self._ensure_not_last_admin(workspace_id, target.id)
        self.db.delete(target)
        self.db.commit()

    def _get_member(self, workspace_id: uuid.UUID, member_id: uuid.UUID) -> WorkspaceMember:
        member = self.db.scalar(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.id == member_id,
            )
        )
        if member is None:
            raise AppError("not_found", "Resource not found", 404)
        return member

    def _ensure_not_last_admin(self, workspace_id: uuid.UUID, excluding_member_id: uuid.UUID) -> None:
        remaining_admins = self.db.scalar(
            select(func.count())
            .select_from(WorkspaceMember)
            .where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.is_admin.is_(True),
                WorkspaceMember.id != excluding_member_id,
            )
        )
        if remaining_admins == 0:
            raise AppError("last_admin", "At least one workspace admin is required", 409)


def seed_objective_and_case(db: Session, workspace_id: uuid.UUID, user_id: uuid.UUID) -> dict[str, Any]:
    objective = StrategicObjective(
        workspace_id=workspace_id,
        strategic_initiative_name="Cascade objective",
        created_by_user_id=user_id,
    )
    db.add(objective)
    db.flush()
    case = LeanBusinessCase(
        workspace_id=workspace_id,
        strategic_objective_id=objective.id,
        owner_user_id=user_id,
        title="Cascade case",
        created_by_user_id=user_id,
    )
    db.add(case)
    db.commit()
    return {"objective_id": objective.id, "case_id": case.id}
