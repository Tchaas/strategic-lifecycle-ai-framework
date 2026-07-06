from __future__ import annotations

import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.business_architecture_components import BusinessArchitectureComponent
from app.models.users import User
from app.schemas.architecture_core import BusinessArchitectureCreateRequest, BusinessArchitectureUpdateRequest


class BusinessArchitectureService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        workspace_id: uuid.UUID,
        user: User,
        payload: BusinessArchitectureCreateRequest,
    ) -> BusinessArchitectureComponent:
        architecture = BusinessArchitectureComponent(
            workspace_id=workspace_id,
            name=payload.name,
            description=payload.description,
            current_state_summary=payload.current_state_summary,
            future_state_summary=payload.future_state_summary,
            origin="architecture",
            status="draft",
            created_by_user_id=user.id,
        )
        self.db.add(architecture)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise AppError("architecture_exists", "Business architecture already exists", 409) from exc
        return architecture

    def get_singleton(self, workspace_id: uuid.UUID) -> BusinessArchitectureComponent:
        architecture = self.db.query(BusinessArchitectureComponent).filter_by(workspace_id=workspace_id).one_or_none()
        if architecture is None:
            raise AppError("not_found", "Resource not found", 404)
        return architecture

    def get(self, workspace_id: uuid.UUID, architecture_id: uuid.UUID) -> BusinessArchitectureComponent:
        architecture = self.db.get(BusinessArchitectureComponent, architecture_id)
        if architecture is None or architecture.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return architecture

    def update(
        self,
        workspace_id: uuid.UUID,
        architecture_id: uuid.UUID,
        payload: BusinessArchitectureUpdateRequest,
    ) -> BusinessArchitectureComponent:
        architecture = self.get(workspace_id, architecture_id)
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(architecture, key, value)
        self.db.commit()
        return architecture
