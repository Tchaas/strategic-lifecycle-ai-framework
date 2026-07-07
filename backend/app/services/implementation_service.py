from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.implementation import Implementation
from app.models.implementation_value_streams import ImplementationValueStream
from app.models.lean_business_cases import LeanBusinessCase
from app.models.users import User
from app.models.value_streams import ValueStream
from app.schemas.implementation import (
    ImplementationAllocationRequest,
    ImplementationCreateRequest,
    ImplementationUpdateRequest,
)


@dataclass(frozen=True)
class AllocationDetail:
    allocation: ImplementationValueStream
    value_stream_name: str


@dataclass(frozen=True)
class ImplementationDetail:
    implementation: Implementation
    allocations: list[AllocationDetail]


class ImplementationService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        workspace_id: uuid.UUID,
        case_id: uuid.UUID,
        user: User,
        payload: ImplementationCreateRequest,
    ) -> ImplementationDetail:
        business_case = self._get_case(workspace_id, case_id)
        if business_case.status == "archived":
            raise AppError("case_archived", "Archived cases cannot accept implementation tracking", 409)
        if self._find_by_case(case_id) is not None:
            raise AppError("implementation_exists", "Implementation already exists for this business case", 409)
        implementation = Implementation(
            **payload.model_dump(exclude={"implementation_status"}),
            workspace_id=workspace_id,
            lean_business_case_id=case_id,
            implementation_status=payload.implementation_status or "not_started",
            actual_cost=None,
            actual_value=None,
            created_by_user_id=user.id,
        )
        self.db.add(implementation)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise AppError(
                "implementation_exists", "Implementation already exists for this business case", 409
            ) from exc
        return self._detail(implementation)

    def get_for_case(self, workspace_id: uuid.UUID, case_id: uuid.UUID) -> ImplementationDetail:
        self._get_case(workspace_id, case_id)
        implementation = self._find_by_case(case_id)
        if implementation is None:
            raise AppError("not_found", "Resource not found", 404)
        return self._detail(implementation)

    def update(
        self,
        workspace_id: uuid.UUID,
        implementation_id: uuid.UUID,
        payload: ImplementationUpdateRequest,
    ) -> ImplementationDetail:
        implementation = self._get_implementation(workspace_id, implementation_id)
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(implementation, key, value)
        self.db.commit()
        return self._detail(implementation)

    def create_allocation(
        self,
        workspace_id: uuid.UUID,
        implementation_id: uuid.UUID,
        value_stream_id: uuid.UUID,
        payload: ImplementationAllocationRequest,
    ) -> AllocationDetail:
        implementation = self._get_implementation(workspace_id, implementation_id)
        value_stream = self._get_value_stream(workspace_id, value_stream_id)
        allocation = ImplementationValueStream(
            implementation_id=implementation.id,
            value_stream_id=value_stream.id,
            **payload.model_dump(),
        )
        self.db.add(allocation)
        try:
            self.db.flush()
        except IntegrityError as exc:
            self.db.rollback()
            raise AppError("already_linked", "Value stream already has an implementation allocation", 409) from exc
        self._recompute_actuals(implementation)
        self.db.commit()
        return AllocationDetail(allocation, value_stream.name)

    def update_allocation(
        self,
        workspace_id: uuid.UUID,
        implementation_id: uuid.UUID,
        value_stream_id: uuid.UUID,
        payload: ImplementationAllocationRequest,
    ) -> AllocationDetail:
        implementation = self._get_implementation(workspace_id, implementation_id)
        value_stream = self._get_value_stream(workspace_id, value_stream_id)
        allocation = self._get_allocation(implementation.id, value_stream.id)
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(allocation, key, value)
        self.db.flush()
        self._recompute_actuals(implementation)
        self.db.commit()
        return AllocationDetail(allocation, value_stream.name)

    def delete_allocation(
        self,
        workspace_id: uuid.UUID,
        implementation_id: uuid.UUID,
        value_stream_id: uuid.UUID,
    ) -> None:
        implementation = self._get_implementation(workspace_id, implementation_id)
        value_stream = self._get_value_stream(workspace_id, value_stream_id)
        allocation = self._get_allocation(implementation.id, value_stream.id)
        self.db.delete(allocation)
        self.db.flush()
        self._recompute_actuals(implementation)
        self.db.commit()

    def _detail(self, implementation: Implementation) -> ImplementationDetail:
        rows = self.db.execute(
            select(ImplementationValueStream, ValueStream.name)
            .join(ValueStream, ValueStream.id == ImplementationValueStream.value_stream_id)
            .where(ImplementationValueStream.implementation_id == implementation.id)
            .order_by(ValueStream.name)
        ).all()
        return ImplementationDetail(
            implementation=implementation,
            allocations=[AllocationDetail(allocation=row[0], value_stream_name=row[1]) for row in rows],
        )

    def _recompute_actuals(self, implementation: Implementation) -> None:
        count, cost, value = self.db.execute(
            select(
                func.count(ImplementationValueStream.id),
                func.coalesce(func.sum(ImplementationValueStream.allocated_cost), 0.0),
                func.coalesce(func.sum(ImplementationValueStream.allocated_value), 0.0),
            ).where(ImplementationValueStream.implementation_id == implementation.id)
        ).one()
        if int(count or 0) == 0:
            implementation.actual_cost = None
            implementation.actual_value = None
            return
        implementation.actual_cost = float(cost or 0)
        implementation.actual_value = float(value or 0)

    def _find_by_case(self, case_id: uuid.UUID) -> Implementation | None:
        return self.db.scalar(select(Implementation).where(Implementation.lean_business_case_id == case_id))

    def _get_case(self, workspace_id: uuid.UUID, case_id: uuid.UUID) -> LeanBusinessCase:
        business_case = self.db.get(LeanBusinessCase, case_id)
        if business_case is None or business_case.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return business_case

    def _get_implementation(self, workspace_id: uuid.UUID, implementation_id: uuid.UUID) -> Implementation:
        implementation = self.db.get(Implementation, implementation_id)
        if implementation is None or implementation.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return implementation

    def _get_value_stream(self, workspace_id: uuid.UUID, value_stream_id: uuid.UUID) -> ValueStream:
        value_stream = self.db.get(ValueStream, value_stream_id)
        if value_stream is None or value_stream.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return value_stream

    def _get_allocation(
        self,
        implementation_id: uuid.UUID,
        value_stream_id: uuid.UUID,
    ) -> ImplementationValueStream:
        allocation = self.db.scalar(
            select(ImplementationValueStream).where(
                ImplementationValueStream.implementation_id == implementation_id,
                ImplementationValueStream.value_stream_id == value_stream_id,
            )
        )
        if allocation is None:
            raise AppError("not_found", "Resource not found", 404)
        return allocation
