from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.business_architecture_components import BusinessArchitectureComponent
from app.models.business_capabilities import BusinessCapability
from app.models.departments import Department
from app.models.key_activities import KeyActivity
from app.models.users import User
from app.models.value_stream_capabilities import ValueStreamCapability
from app.models.value_streams import ValueStream
from app.schemas.architecture_core import ValueStreamCreateRequest, ValueStreamUpdateRequest

VALUE_STREAM_LIMIT = 6


@dataclass(frozen=True)
class ValueStreamDetail:
    value_stream: ValueStream
    key_activities: list[KeyActivity]
    capability_ids: list[uuid.UUID]


class ValueStreamService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        workspace_id: uuid.UUID,
        architecture_id: uuid.UUID,
        user: User,
        payload: ValueStreamCreateRequest,
        origin: str = "architecture",
    ) -> ValueStream:
        self._get_architecture(workspace_id, architecture_id)
        current = self._count_for_architecture(architecture_id)
        if current >= VALUE_STREAM_LIMIT:
            raise AppError(
                "cardinality_limit",
                "Value stream limit reached",
                409,
                {"limit": VALUE_STREAM_LIMIT, "current": current},
            )
        if payload.linked_department_id is not None:
            self._get_department(workspace_id, payload.linked_department_id)
        stream = ValueStream(
            workspace_id=workspace_id,
            business_architecture_id=architecture_id,
            name=payload.name,
            description=payload.description,
            value_stream_type=payload.value_stream_type,
            strategic_alignment=payload.strategic_alignment,
            triggering_stakeholder=payload.triggering_stakeholder,
            value_recipient=payload.value_recipient,
            linked_department_id=payload.linked_department_id,
            origin=origin,
            status="draft",
            created_by_user_id=user.id,
        )
        self.db.add(stream)
        self.db.commit()
        return stream

    def list_for_architecture(self, workspace_id: uuid.UUID, architecture_id: uuid.UUID) -> list[ValueStream]:
        self._get_architecture(workspace_id, architecture_id)
        return list(
            self.db.scalars(
                select(ValueStream)
                .where(
                    ValueStream.workspace_id == workspace_id,
                    ValueStream.business_architecture_id == architecture_id,
                )
                .order_by(ValueStream.created_at, ValueStream.id)
            ).all()
        )

    def get_detail(self, workspace_id: uuid.UUID, stream_id: uuid.UUID) -> ValueStreamDetail:
        stream = self._get_stream(workspace_id, stream_id)
        key_activities = list(
            self.db.scalars(
                select(KeyActivity)
                .where(KeyActivity.value_stream_id == stream.id)
                .order_by(KeyActivity.sequence_order, KeyActivity.id)
            ).all()
        )
        capability_ids = list(
            self.db.scalars(
                select(ValueStreamCapability.capability_id).where(ValueStreamCapability.value_stream_id == stream.id)
            ).all()
        )
        return ValueStreamDetail(value_stream=stream, key_activities=key_activities, capability_ids=capability_ids)

    def update(
        self,
        workspace_id: uuid.UUID,
        stream_id: uuid.UUID,
        payload: ValueStreamUpdateRequest,
    ) -> ValueStream:
        stream = self._get_stream(workspace_id, stream_id)
        values = payload.model_dump(exclude_unset=True)
        if "linked_department_id" in values and values["linked_department_id"] is not None:
            self._get_department(workspace_id, values["linked_department_id"])
        for key, value in values.items():
            setattr(stream, key, value)
        self.db.commit()
        return stream

    def delete(self, workspace_id: uuid.UUID, stream_id: uuid.UUID) -> None:
        stream = self._get_stream(workspace_id, stream_id)
        self.db.delete(stream)
        self.db.commit()

    def link_capability(
        self,
        workspace_id: uuid.UUID,
        stream_id: uuid.UUID,
        capability_id: uuid.UUID,
    ) -> ValueStreamCapability:
        self._get_stream(workspace_id, stream_id)
        self._get_capability(workspace_id, capability_id)
        link = ValueStreamCapability(value_stream_id=stream_id, capability_id=capability_id)
        self.db.add(link)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise AppError("already_linked", "Capability is already linked", 409) from exc
        return link

    def unlink_capability(self, workspace_id: uuid.UUID, stream_id: uuid.UUID, capability_id: uuid.UUID) -> None:
        self._get_stream(workspace_id, stream_id)
        self._get_capability(workspace_id, capability_id)
        link = self.db.scalar(
            select(ValueStreamCapability).where(
                ValueStreamCapability.value_stream_id == stream_id,
                ValueStreamCapability.capability_id == capability_id,
            )
        )
        if link is None:
            raise AppError("not_found", "Resource not found", 404)
        self.db.delete(link)
        self.db.commit()

    def _count_for_architecture(self, architecture_id: uuid.UUID) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(ValueStream)
                .where(ValueStream.business_architecture_id == architecture_id)
            )
            or 0
        )

    def _get_architecture(
        self,
        workspace_id: uuid.UUID,
        architecture_id: uuid.UUID,
    ) -> BusinessArchitectureComponent:
        architecture = self.db.get(BusinessArchitectureComponent, architecture_id)
        if architecture is None or architecture.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return architecture

    def _get_stream(self, workspace_id: uuid.UUID, stream_id: uuid.UUID) -> ValueStream:
        stream = self.db.get(ValueStream, stream_id)
        if stream is None or stream.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return stream

    def _get_capability(self, workspace_id: uuid.UUID, capability_id: uuid.UUID) -> BusinessCapability:
        capability = self.db.get(BusinessCapability, capability_id)
        if capability is None or capability.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return capability

    def _get_department(self, workspace_id: uuid.UUID, department_id: uuid.UUID) -> Department:
        department = self.db.get(Department, department_id)
        if department is None or department.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return department
