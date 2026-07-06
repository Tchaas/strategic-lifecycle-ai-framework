from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.business_architecture_components import BusinessArchitectureComponent
from app.models.business_capabilities import BusinessCapability
from app.models.departments import Department
from app.models.key_activity_capabilities import KeyActivityCapability
from app.models.users import User
from app.models.value_stream_capabilities import ValueStreamCapability
from app.schemas.architecture_core import CapabilityCreateRequest, CapabilityUpdateRequest


@dataclass(frozen=True)
class CapabilityDetail:
    capability: BusinessCapability
    value_stream_ids: list[uuid.UUID]
    key_activity_ids: list[uuid.UUID]


class CapabilityService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        workspace_id: uuid.UUID,
        architecture_id: uuid.UUID,
        user: User,
        payload: CapabilityCreateRequest,
    ) -> BusinessCapability:
        self._get_architecture(workspace_id, architecture_id)
        if payload.owning_department_id is not None:
            self._get_department(workspace_id, payload.owning_department_id)
        capability = BusinessCapability(
            workspace_id=workspace_id,
            business_architecture_id=architecture_id,
            capability_name=payload.capability_name,
            capability_description=payload.capability_description,
            current_maturity=payload.current_maturity,
            target_maturity=payload.target_maturity,
            capability_gap=payload.capability_gap,
            owning_department_id=payload.owning_department_id,
            origin="architecture",
            status="draft",
            created_by_user_id=user.id,
        )
        self.db.add(capability)
        self.db.commit()
        return capability

    def list_for_architecture(self, workspace_id: uuid.UUID, architecture_id: uuid.UUID) -> list[CapabilityDetail]:
        self._get_architecture(workspace_id, architecture_id)
        capabilities = list(
            self.db.scalars(
                select(BusinessCapability)
                .where(
                    BusinessCapability.workspace_id == workspace_id,
                    BusinessCapability.business_architecture_id == architecture_id,
                )
                .order_by(BusinessCapability.capability_name)
            ).all()
        )
        return [self._detail(capability) for capability in capabilities]

    def update(
        self,
        workspace_id: uuid.UUID,
        capability_id: uuid.UUID,
        payload: CapabilityUpdateRequest,
    ) -> BusinessCapability:
        capability = self._get_capability(workspace_id, capability_id)
        values = payload.model_dump(exclude_unset=True)
        if "owning_department_id" in values and values["owning_department_id"] is not None:
            self._get_department(workspace_id, values["owning_department_id"])
        for key, value in values.items():
            setattr(capability, key, value)
        self.db.commit()
        return capability

    def delete(self, workspace_id: uuid.UUID, capability_id: uuid.UUID) -> None:
        capability = self._get_capability(workspace_id, capability_id)
        self.db.delete(capability)
        self.db.commit()

    def _detail(self, capability: BusinessCapability) -> CapabilityDetail:
        value_stream_ids = list(
            self.db.scalars(
                select(ValueStreamCapability.value_stream_id).where(
                    ValueStreamCapability.capability_id == capability.id
                )
            ).all()
        )
        key_activity_ids = list(
            self.db.scalars(
                select(KeyActivityCapability.key_activity_id).where(
                    KeyActivityCapability.capability_id == capability.id
                )
            ).all()
        )
        return CapabilityDetail(
            capability=capability,
            value_stream_ids=value_stream_ids,
            key_activity_ids=key_activity_ids,
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
