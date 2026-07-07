from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import TypeVar

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.business_capabilities import BusinessCapability
from app.models.key_activities import KeyActivity
from app.models.lean_business_case_capabilities import LeanBusinessCaseCapability
from app.models.lean_business_case_key_activities import LeanBusinessCaseKeyActivity
from app.models.lean_business_case_value_streams import LeanBusinessCaseValueStream
from app.models.lean_business_cases import LeanBusinessCase
from app.models.strategic_objectives import StrategicObjective
from app.models.users import User
from app.models.value_streams import ValueStream
from app.models.workspace_members import WorkspaceMember
from app.schemas.business_cases import LeanBusinessCaseCreateRequest, LeanBusinessCaseUpdateRequest
from app.services.lifecycle import (
    ARCHIVE_TRANSITIONS,
    FORWARD_TRANSITIONS,
    REACTIVATE_TRANSITIONS,
    GateConfig,
    ensure_active_gate_maintenance,
    transition_status,
)

LinkT = TypeVar("LinkT", LeanBusinessCaseValueStream, LeanBusinessCaseKeyActivity, LeanBusinessCaseCapability)

CASE_LIMIT = 10
CASE_GATE_FIELDS = (
    "title",
    "summary",
    "problem_opportunity_statement",
    "value_hypothesis",
    "priority",
)
CASE_GATE = GateConfig(CASE_GATE_FIELDS, "Business case is missing required active fields")
FIELD_PATCH_TRANSITIONS = FORWARD_TRANSITIONS
STATUS_PATCH_TRANSITIONS = ARCHIVE_TRANSITIONS | REACTIVATE_TRANSITIONS


@dataclass(frozen=True)
class LeanBusinessCaseDetail:
    case: LeanBusinessCase
    owner: User
    value_stream_ids: list[uuid.UUID]
    key_activity_ids: list[uuid.UUID]
    capability_ids: list[uuid.UUID]


class BusinessCaseService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        workspace_id: uuid.UUID,
        objective_id: uuid.UUID,
        user: User,
        payload: LeanBusinessCaseCreateRequest,
    ) -> LeanBusinessCase:
        objective = self._get_objective(workspace_id, objective_id)
        if objective.status == "archived":
            raise AppError("objective_archived", "Archived objectives cannot accept new business cases", 409)
        current = self._count_non_archived_cases(objective_id)
        if current >= CASE_LIMIT:
            raise AppError(
                "cardinality_limit",
                "Lean business case limit reached",
                409,
                {"limit": CASE_LIMIT, "current": current},
            )
        owner_user_id = payload.owner_user_id or user.id
        self._get_workspace_member(workspace_id, owner_user_id)
        case = LeanBusinessCase(
            **payload.model_dump(exclude={"owner_user_id"}),
            workspace_id=workspace_id,
            strategic_objective_id=objective_id,
            owner_user_id=owner_user_id,
            status="draft",
            created_by_user_id=user.id,
        )
        self.db.add(case)
        self.db.commit()
        return case

    def list_for_objective(
        self,
        workspace_id: uuid.UUID,
        objective_id: uuid.UUID,
        status_filter: str | None = None,
    ) -> list[LeanBusinessCase]:
        self._get_objective(workspace_id, objective_id)
        query = select(LeanBusinessCase).where(
            LeanBusinessCase.workspace_id == workspace_id,
            LeanBusinessCase.strategic_objective_id == objective_id,
        )
        if status_filter is not None:
            query = query.where(LeanBusinessCase.status == status_filter)
        return list(self.db.scalars(query.order_by(LeanBusinessCase.created_at, LeanBusinessCase.id)).all())

    def get_detail(self, workspace_id: uuid.UUID, case_id: uuid.UUID) -> LeanBusinessCaseDetail:
        case = self._get_case(workspace_id, case_id)
        return self._detail(case)

    def update_fields(
        self,
        workspace_id: uuid.UUID,
        case_id: uuid.UUID,
        payload: LeanBusinessCaseUpdateRequest,
    ) -> LeanBusinessCase:
        case = self._get_case(workspace_id, case_id)
        values = payload.model_dump(exclude_unset=True)
        requested_status = values.pop("status", None)
        if "owner_user_id" in values and values["owner_user_id"] is not None:
            self._get_workspace_member(workspace_id, values["owner_user_id"])
        for key, value in values.items():
            setattr(case, key, value)
        ensure_active_gate_maintenance(case, CASE_GATE)
        if requested_status is not None and requested_status != case.status:
            transition_status(case, requested_status, CASE_GATE, FIELD_PATCH_TRANSITIONS)
        self.db.commit()
        return case

    def update_status(self, workspace_id: uuid.UUID, case_id: uuid.UUID, status: str) -> LeanBusinessCase:
        case = self._get_case(workspace_id, case_id)
        if status != case.status:
            transition_status(case, status, CASE_GATE, STATUS_PATCH_TRANSITIONS)
        else:
            raise AppError(
                "invalid_transition",
                "Invalid status transition",
                409,
                {"from": case.status or "draft", "to": status},
            )
        self.db.commit()
        return case

    def link_value_stream(
        self,
        workspace_id: uuid.UUID,
        case_id: uuid.UUID,
        value_stream_id: uuid.UUID,
    ) -> LeanBusinessCaseValueStream:
        self._get_case(workspace_id, case_id)
        self._get_value_stream(workspace_id, value_stream_id)
        link = LeanBusinessCaseValueStream(case_id=case_id, value_stream_id=value_stream_id)
        return self._commit_link(link, "Value stream is already linked")

    def unlink_value_stream(self, workspace_id: uuid.UUID, case_id: uuid.UUID, value_stream_id: uuid.UUID) -> None:
        self._get_case(workspace_id, case_id)
        self._get_value_stream(workspace_id, value_stream_id)
        link = self.db.scalar(
            select(LeanBusinessCaseValueStream).where(
                LeanBusinessCaseValueStream.case_id == case_id,
                LeanBusinessCaseValueStream.value_stream_id == value_stream_id,
            )
        )
        self._delete_link(link)

    def link_key_activity(
        self,
        workspace_id: uuid.UUID,
        case_id: uuid.UUID,
        key_activity_id: uuid.UUID,
    ) -> LeanBusinessCaseKeyActivity:
        self._get_case(workspace_id, case_id)
        self._get_key_activity(workspace_id, key_activity_id)
        link = LeanBusinessCaseKeyActivity(case_id=case_id, key_activity_id=key_activity_id)
        return self._commit_link(link, "Key activity is already linked")

    def unlink_key_activity(self, workspace_id: uuid.UUID, case_id: uuid.UUID, key_activity_id: uuid.UUID) -> None:
        self._get_case(workspace_id, case_id)
        self._get_key_activity(workspace_id, key_activity_id)
        link = self.db.scalar(
            select(LeanBusinessCaseKeyActivity).where(
                LeanBusinessCaseKeyActivity.case_id == case_id,
                LeanBusinessCaseKeyActivity.key_activity_id == key_activity_id,
            )
        )
        self._delete_link(link)

    def link_capability(
        self,
        workspace_id: uuid.UUID,
        case_id: uuid.UUID,
        capability_id: uuid.UUID,
    ) -> LeanBusinessCaseCapability:
        self._get_case(workspace_id, case_id)
        self._get_capability(workspace_id, capability_id)
        link = LeanBusinessCaseCapability(case_id=case_id, capability_id=capability_id)
        return self._commit_link(link, "Capability is already linked")

    def unlink_capability(self, workspace_id: uuid.UUID, case_id: uuid.UUID, capability_id: uuid.UUID) -> None:
        self._get_case(workspace_id, case_id)
        self._get_capability(workspace_id, capability_id)
        link = self.db.scalar(
            select(LeanBusinessCaseCapability).where(
                LeanBusinessCaseCapability.case_id == case_id,
                LeanBusinessCaseCapability.capability_id == capability_id,
            )
        )
        self._delete_link(link)

    def _detail(self, case: LeanBusinessCase) -> LeanBusinessCaseDetail:
        owner = self.db.get(User, case.owner_user_id)
        if owner is None:
            raise AppError("not_found", "Resource not found", 404)
        value_stream_ids = list(
            self.db.scalars(
                select(LeanBusinessCaseValueStream.value_stream_id).where(
                    LeanBusinessCaseValueStream.case_id == case.id
                )
            ).all()
        )
        key_activity_ids = list(
            self.db.scalars(
                select(LeanBusinessCaseKeyActivity.key_activity_id).where(
                    LeanBusinessCaseKeyActivity.case_id == case.id
                )
            ).all()
        )
        capability_ids = list(
            self.db.scalars(
                select(LeanBusinessCaseCapability.capability_id).where(LeanBusinessCaseCapability.case_id == case.id)
            ).all()
        )
        return LeanBusinessCaseDetail(case, owner, value_stream_ids, key_activity_ids, capability_ids)

    def _count_non_archived_cases(self, objective_id: uuid.UUID) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(LeanBusinessCase)
                .where(
                    LeanBusinessCase.strategic_objective_id == objective_id,
                    LeanBusinessCase.status != "archived",
                )
            )
            or 0
        )

    def _get_objective(self, workspace_id: uuid.UUID, objective_id: uuid.UUID) -> StrategicObjective:
        objective = self.db.get(StrategicObjective, objective_id)
        if objective is None or objective.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return objective

    def _get_case(self, workspace_id: uuid.UUID, case_id: uuid.UUID) -> LeanBusinessCase:
        case = self.db.get(LeanBusinessCase, case_id)
        if case is None or case.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return case

    def _get_workspace_member(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> WorkspaceMember:
        member = self.db.scalar(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        )
        if member is None:
            raise AppError("not_found", "Resource not found", 404)
        return member

    def _get_value_stream(self, workspace_id: uuid.UUID, value_stream_id: uuid.UUID) -> ValueStream:
        stream = self.db.get(ValueStream, value_stream_id)
        if stream is None or stream.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return stream

    def _get_key_activity(self, workspace_id: uuid.UUID, key_activity_id: uuid.UUID) -> KeyActivity:
        activity = self.db.get(KeyActivity, key_activity_id)
        if activity is None or activity.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return activity

    def _get_capability(self, workspace_id: uuid.UUID, capability_id: uuid.UUID) -> BusinessCapability:
        capability = self.db.get(BusinessCapability, capability_id)
        if capability is None or capability.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return capability

    def _commit_link(self, link: LinkT, message: str) -> LinkT:
        self.db.add(link)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise AppError("already_linked", message, 409) from exc
        return link

    def _delete_link(
        self,
        link: LeanBusinessCaseValueStream | LeanBusinessCaseKeyActivity | LeanBusinessCaseCapability | None,
    ) -> None:
        if link is None:
            raise AppError("not_found", "Resource not found", 404)
        self.db.delete(link)
        self.db.commit()
