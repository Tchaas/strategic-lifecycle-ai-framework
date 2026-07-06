from __future__ import annotations

import secrets
import uuid
from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AppError
from app.core.security import utc_now
from app.models.users import User
from app.models.workspace_invites import WorkspaceInvite
from app.models.workspace_members import WorkspaceMember
from app.models.workspaces import Workspace
from app.schemas.workspaces import InviteCreateRequest


@dataclass(frozen=True)
class InviteCreateResult:
    invite: WorkspaceInvite
    invite_url: str


@dataclass(frozen=True)
class InviteAcceptResult:
    workspace: Workspace
    member: WorkspaceMember


class InviteService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_invite(
        self,
        workspace_id: uuid.UUID,
        invited_by: User,
        payload: InviteCreateRequest,
    ) -> InviteCreateResult:
        if self._email_is_member(workspace_id, payload.invited_email):
            raise AppError("already_member", "This user is already a workspace member", 409)
        pending = self.db.scalar(
            select(WorkspaceInvite).where(
                WorkspaceInvite.workspace_id == workspace_id,
                WorkspaceInvite.invited_email == payload.invited_email,
                WorkspaceInvite.status == "pending",
                WorkspaceInvite.expires_at > utc_now(),
            )
        )
        if pending is not None:
            raise AppError("invite_exists", "A pending invite already exists for this email", 409)

        token = secrets.token_urlsafe(32)
        invite = WorkspaceInvite(
            workspace_id=workspace_id,
            invited_email=payload.invited_email,
            invited_by_user_id=invited_by.id,
            invite_token=token,
            status="pending",
            expires_at=utc_now().replace(microsecond=0) + settings_invite_delta(),
            created_by_user_id=invited_by.id,
        )
        self.db.add(invite)
        self.db.commit()
        return InviteCreateResult(invite=invite, invite_url=build_invite_url(token))

    def list_invites(self, workspace_id: uuid.UUID) -> list[WorkspaceInvite]:
        invites = list(
            self.db.scalars(
                select(WorkspaceInvite)
                .where(WorkspaceInvite.workspace_id == workspace_id)
                .order_by(WorkspaceInvite.created_at)
            )
        )
        now = utc_now()
        changed = False
        for invite in invites:
            if invite.status == "pending" and invite.expires_at is not None and invite.expires_at <= now:
                invite.status = "expired"
                changed = True
        if changed:
            self.db.commit()
        return invites

    def accept_invite(self, token: str, user: User) -> InviteAcceptResult:
        invite = self.db.scalar(select(WorkspaceInvite).where(WorkspaceInvite.invite_token == token))
        if invite is None:
            raise AppError("not_found", "Resource not found", 404)
        now = utc_now()
        if invite.status == "accepted":
            raise AppError("invite_consumed", "Invite has already been accepted", 409)
        if invite.status == "expired" or (invite.expires_at is not None and invite.expires_at <= now):
            invite.status = "expired"
            self.db.commit()
            raise AppError("invite_expired", "Invite has expired", 410)
        if invite.invited_email.casefold() != user.email.casefold():
            raise AppError("email_mismatch", "Invite email does not match the authenticated user", 403)
        if self._user_is_member(invite.workspace_id, user.id):
            raise AppError("already_member", "This user is already a workspace member", 409)

        member = WorkspaceMember(
            workspace_id=invite.workspace_id,
            user_id=user.id,
            is_admin=False,
            joined_at=now,
            created_by_user_id=user.id,
        )
        invite.status = "accepted"
        invite.accepted_at = now
        self.db.add(member)
        self.db.flush()
        workspace = self.db.get(Workspace, invite.workspace_id)
        if workspace is None:
            raise AppError("not_found", "Resource not found", 404)
        self.db.commit()
        return InviteAcceptResult(workspace=workspace, member=member)

    def _email_is_member(self, workspace_id: uuid.UUID, email: str) -> bool:
        return (
            self.db.scalar(
                select(WorkspaceMember.id)
                .join(User, User.id == WorkspaceMember.user_id)
                .where(WorkspaceMember.workspace_id == workspace_id, User.email == email)
            )
            is not None
        )

    def _user_is_member(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        return (
            self.db.scalar(
                select(WorkspaceMember.id).where(
                    WorkspaceMember.workspace_id == workspace_id,
                    WorkspaceMember.user_id == user_id,
                )
            )
            is not None
        )


def settings_invite_delta() -> timedelta:
    return timedelta(seconds=settings.invite_ttl)


def build_invite_url(token: str) -> str:
    return f"{settings.frontend_base_url.rstrip('/')}/#/invite/{token}"
