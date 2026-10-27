from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.business_architecture_components import BusinessArchitectureComponent
from app.models.departments import Department
from app.models.users import User
from app.models.workspaces import Workspace
from app.schemas.departments import DepartmentCreateRequest, DepartmentUpdateRequest


class DepartmentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_department(
        self,
        workspace_id: uuid.UUID,
        user: User,
        payload: DepartmentCreateRequest,
    ) -> Department:
        self._lock_workspace(workspace_id)
        architecture_id = self.db.scalar(
            select(BusinessArchitectureComponent.id).where(BusinessArchitectureComponent.workspace_id == workspace_id)
        )
        if architecture_id is None:
            raise AppError("architecture_required", "Workspace architecture is missing", 409)
        if payload.parent_department_id is not None:
            self._get_department(workspace_id, payload.parent_department_id)
        department = Department(
            workspace_id=workspace_id,
            business_architecture_id=architecture_id,
            **payload.model_dump(),
            created_by_user_id=user.id,
        )
        self.db.add(department)
        self.db.commit()
        return department

    def list_departments(
        self,
        workspace_id: uuid.UUID,
        parent_id: uuid.UUID | None,
    ) -> list[Department]:
        statement = (
            select(Department)
            .where(Department.workspace_id == workspace_id)
            .order_by(
                Department.created_at,
                Department.id,
            )
        )
        if parent_id is not None:
            self._get_department(workspace_id, parent_id)
            statement = statement.where(Department.parent_department_id == parent_id)
        return list(self.db.scalars(statement).all())

    def get_department(self, workspace_id: uuid.UUID, department_id: uuid.UUID) -> Department:
        return self._get_department(workspace_id, department_id)

    def update_department(
        self,
        workspace_id: uuid.UUID,
        department_id: uuid.UUID,
        payload: DepartmentUpdateRequest,
    ) -> Department:
        self._lock_workspace(workspace_id)
        department = self._get_department(workspace_id, department_id)
        values = payload.model_dump(exclude_unset=True)
        if "name" in values:
            department.name = values["name"]
        if "description" in values:
            department.description = values["description"]
        if "parent_department_id" in values:
            parent_id = values["parent_department_id"]
            self._validate_new_parent(workspace_id, department.id, parent_id)
            department.parent_department_id = parent_id
        for field in (
            "department_head",
            "contact_name",
            "contact_email",
            "location",
            "headcount",
        ):
            if field in values:
                setattr(department, field, values[field])
        self.db.commit()
        return department

    def delete_department(self, workspace_id: uuid.UUID, department_id: uuid.UUID) -> None:
        self._lock_workspace(workspace_id)
        department = self._get_department(workspace_id, department_id)
        count = self.db.scalar(
            select(func.count()).select_from(Department).where(Department.workspace_id == workspace_id)
        )
        if count is None or count <= 1:
            raise AppError(
                "department_required",
                "Keep at least one department in the workspace",
                409,
            )
        self.db.delete(department)
        self.db.commit()

    def _lock_workspace(self, workspace_id: uuid.UUID) -> None:
        self.db.execute(select(Workspace.id).where(Workspace.id == workspace_id).with_for_update())

    def _validate_new_parent(
        self,
        workspace_id: uuid.UUID,
        department_id: uuid.UUID,
        parent_id: uuid.UUID | None,
    ) -> None:
        if parent_id is None:
            return
        if parent_id == department_id:
            raise AppError("department_cycle", "Department cannot be its own parent", 409)
        parent = self._get_department(workspace_id, parent_id)
        while parent.parent_department_id is not None:
            if parent.parent_department_id == department_id:
                raise AppError("department_cycle", "Department parent would create a cycle", 409)
            parent = self._get_department(workspace_id, parent.parent_department_id)

    def _get_department(self, workspace_id: uuid.UUID, department_id: uuid.UUID) -> Department:
        department = self.db.scalar(
            select(Department).where(
                Department.workspace_id == workspace_id,
                Department.id == department_id,
            )
        )
        if department is None:
            raise AppError("not_found", "Resource not found", 404)
        return department
