from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.business_capabilities import BusinessCapability
from app.models.key_activities import KeyActivity
from app.models.key_activity_capabilities import KeyActivityCapability
from app.models.users import User
from app.models.value_streams import ValueStream
from app.schemas.architecture_core import KeyActivityCreateRequest, KeyActivityUpdateRequest

KEY_ACTIVITY_LIMIT = 6


class KeyActivityService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        workspace_id: uuid.UUID,
        stream_id: uuid.UUID,
        user: User,
        payload: KeyActivityCreateRequest,
    ) -> KeyActivity:
        self._get_stream(workspace_id, stream_id)
        current = self._count_for_stream(stream_id)
        if current >= KEY_ACTIVITY_LIMIT:
            raise AppError(
                "cardinality_limit",
                "Key activity limit reached",
                409,
                {"limit": KEY_ACTIVITY_LIMIT, "current": current},
            )
        sequence_order = payload.sequence_order
        if sequence_order is None:
            max_order = self.db.scalar(
                select(func.max(KeyActivity.sequence_order)).where(KeyActivity.value_stream_id == stream_id)
            )
            sequence_order = int(max_order or 0) + 1
        activity = KeyActivity(
            workspace_id=workspace_id,
            value_stream_id=stream_id,
            activity_name=payload.activity_name,
            activity_description=payload.activity_description,
            sequence_order=sequence_order,
            current_state_issue=payload.current_state_issue,
            future_state_change=payload.future_state_change,
            business_impact=payload.business_impact,
            origin="architecture",
            status="draft",
            created_by_user_id=user.id,
        )
        self.db.add(activity)
        self.db.commit()
        return activity

    def list_for_stream(self, workspace_id: uuid.UUID, stream_id: uuid.UUID) -> list[KeyActivity]:
        self._get_stream(workspace_id, stream_id)
        return list(
            self.db.scalars(
                select(KeyActivity)
                .where(KeyActivity.workspace_id == workspace_id, KeyActivity.value_stream_id == stream_id)
                .order_by(KeyActivity.sequence_order, KeyActivity.created_at)
            ).all()
        )

    def update(
        self,
        workspace_id: uuid.UUID,
        activity_id: uuid.UUID,
        payload: KeyActivityUpdateRequest,
    ) -> KeyActivity:
        activity = self._get_activity(workspace_id, activity_id)
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(activity, key, value)
        self.db.commit()
        return activity

    def delete(self, workspace_id: uuid.UUID, activity_id: uuid.UUID) -> None:
        activity = self._get_activity(workspace_id, activity_id)
        self.db.delete(activity)
        self.db.commit()

    def link_capability(
        self,
        workspace_id: uuid.UUID,
        activity_id: uuid.UUID,
        capability_id: uuid.UUID,
    ) -> KeyActivityCapability:
        self._get_activity(workspace_id, activity_id)
        self._get_capability(workspace_id, capability_id)
        link = KeyActivityCapability(key_activity_id=activity_id, capability_id=capability_id)
        self.db.add(link)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise AppError("already_linked", "Capability is already linked", 409) from exc
        return link

    def unlink_capability(self, workspace_id: uuid.UUID, activity_id: uuid.UUID, capability_id: uuid.UUID) -> None:
        self._get_activity(workspace_id, activity_id)
        self._get_capability(workspace_id, capability_id)
        link = self.db.scalar(
            select(KeyActivityCapability).where(
                KeyActivityCapability.key_activity_id == activity_id,
                KeyActivityCapability.capability_id == capability_id,
            )
        )
        if link is None:
            raise AppError("not_found", "Resource not found", 404)
        self.db.delete(link)
        self.db.commit()

    def _count_for_stream(self, stream_id: uuid.UUID) -> int:
        return int(
            self.db.scalar(
                select(func.count()).select_from(KeyActivity).where(KeyActivity.value_stream_id == stream_id)
            )
            or 0
        )

    def _get_stream(self, workspace_id: uuid.UUID, stream_id: uuid.UUID) -> ValueStream:
        stream = self.db.get(ValueStream, stream_id)
        if stream is None or stream.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return stream

    def _get_activity(self, workspace_id: uuid.UUID, activity_id: uuid.UUID) -> KeyActivity:
        activity = self.db.get(KeyActivity, activity_id)
        if activity is None or activity.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return activity

    def _get_capability(self, workspace_id: uuid.UUID, capability_id: uuid.UUID) -> BusinessCapability:
        capability = self.db.get(BusinessCapability, capability_id)
        if capability is None or capability.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return capability
