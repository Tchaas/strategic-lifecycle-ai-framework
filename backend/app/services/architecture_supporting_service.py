from __future__ import annotations

import uuid
from typing import Any, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.business_architecture_components import BusinessArchitectureComponent
from app.models.business_impacts import BusinessImpact
from app.models.business_processes import BusinessProcess
from app.models.information_concepts import InformationConcept
from app.models.lean_business_cases import LeanBusinessCase
from app.models.stakeholders_personas import StakeholderPersona
from app.models.users import User
from app.models.value_streams import ValueStream
from app.schemas.architecture_supporting import (
    BusinessImpactCreateRequest,
    BusinessImpactUpdateRequest,
    BusinessProcessCreateRequest,
    BusinessProcessUpdateRequest,
    InformationConceptCreateRequest,
    InformationConceptUpdateRequest,
    StakeholderPersonaCreateRequest,
    StakeholderPersonaUpdateRequest,
)

SupportingModel = TypeVar("SupportingModel", BusinessProcess, StakeholderPersona, InformationConcept, BusinessImpact)


class ArchitectureSupportingService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_process(
        self,
        workspace_id: uuid.UUID,
        architecture_id: uuid.UUID,
        user: User,
        payload: BusinessProcessCreateRequest,
        origin: str = "architecture",
        commit: bool = True,
    ) -> BusinessProcess:
        values = self._create_values(workspace_id, architecture_id, user, payload.model_dump(), origin)
        process = BusinessProcess(**values)
        self.db.add(process)
        if commit:
            self.db.commit()
        else:
            self.db.flush()
        return process

    def list_processes(self, workspace_id: uuid.UUID, architecture_id: uuid.UUID) -> list[BusinessProcess]:
        return self._list(BusinessProcess, workspace_id, architecture_id, BusinessProcess.process_name)

    def update_process(
        self,
        workspace_id: uuid.UUID,
        process_id: uuid.UUID,
        payload: BusinessProcessUpdateRequest,
    ) -> BusinessProcess:
        return self._update(BusinessProcess, workspace_id, process_id, payload.model_dump(exclude_unset=True))

    def delete_process(self, workspace_id: uuid.UUID, process_id: uuid.UUID) -> None:
        self._delete(BusinessProcess, workspace_id, process_id)

    def create_stakeholder(
        self,
        workspace_id: uuid.UUID,
        architecture_id: uuid.UUID,
        user: User,
        payload: StakeholderPersonaCreateRequest,
        origin: str = "architecture",
        commit: bool = True,
    ) -> StakeholderPersona:
        values = self._create_values(workspace_id, architecture_id, user, payload.model_dump(), origin)
        stakeholder = StakeholderPersona(**values)
        self.db.add(stakeholder)
        if commit:
            self.db.commit()
        else:
            self.db.flush()
        return stakeholder

    def list_stakeholders(self, workspace_id: uuid.UUID, architecture_id: uuid.UUID) -> list[StakeholderPersona]:
        return self._list(StakeholderPersona, workspace_id, architecture_id, StakeholderPersona.name)

    def update_stakeholder(
        self,
        workspace_id: uuid.UUID,
        stakeholder_id: uuid.UUID,
        payload: StakeholderPersonaUpdateRequest,
    ) -> StakeholderPersona:
        return self._update(StakeholderPersona, workspace_id, stakeholder_id, payload.model_dump(exclude_unset=True))

    def delete_stakeholder(self, workspace_id: uuid.UUID, stakeholder_id: uuid.UUID) -> None:
        self._delete(StakeholderPersona, workspace_id, stakeholder_id)

    def create_information_concept(
        self,
        workspace_id: uuid.UUID,
        architecture_id: uuid.UUID,
        user: User,
        payload: InformationConceptCreateRequest,
        origin: str = "architecture",
        commit: bool = True,
    ) -> InformationConcept:
        values = self._create_values(workspace_id, architecture_id, user, payload.model_dump(), origin)
        concept = InformationConcept(**values)
        self.db.add(concept)
        if commit:
            self.db.commit()
        else:
            self.db.flush()
        return concept

    def list_information_concepts(
        self,
        workspace_id: uuid.UUID,
        architecture_id: uuid.UUID,
    ) -> list[InformationConcept]:
        return self._list(InformationConcept, workspace_id, architecture_id, InformationConcept.concept_name)

    def update_information_concept(
        self,
        workspace_id: uuid.UUID,
        concept_id: uuid.UUID,
        payload: InformationConceptUpdateRequest,
    ) -> InformationConcept:
        return self._update(InformationConcept, workspace_id, concept_id, payload.model_dump(exclude_unset=True))

    def delete_information_concept(self, workspace_id: uuid.UUID, concept_id: uuid.UUID) -> None:
        self._delete(InformationConcept, workspace_id, concept_id)

    def create_business_impact(
        self,
        workspace_id: uuid.UUID,
        architecture_id: uuid.UUID,
        user: User,
        payload: BusinessImpactCreateRequest,
        origin: str = "architecture",
    ) -> BusinessImpact:
        values = self._create_values(workspace_id, architecture_id, user, payload.model_dump(), origin)
        impact = BusinessImpact(**values)
        self.db.add(impact)
        self.db.commit()
        return impact

    def list_business_impacts(self, workspace_id: uuid.UUID, architecture_id: uuid.UUID) -> list[BusinessImpact]:
        return self._list(BusinessImpact, workspace_id, architecture_id, BusinessImpact.impacted_area)

    def update_business_impact(
        self,
        workspace_id: uuid.UUID,
        impact_id: uuid.UUID,
        payload: BusinessImpactUpdateRequest,
    ) -> BusinessImpact:
        return self._update(BusinessImpact, workspace_id, impact_id, payload.model_dump(exclude_unset=True))

    def delete_business_impact(self, workspace_id: uuid.UUID, impact_id: uuid.UUID) -> None:
        self._delete(BusinessImpact, workspace_id, impact_id)

    def _create_values(
        self,
        workspace_id: uuid.UUID,
        architecture_id: uuid.UUID,
        user: User,
        values: dict[str, Any],
        origin: str,
    ) -> dict[str, Any]:
        self._get_architecture(workspace_id, architecture_id)
        self._validate_references(workspace_id, values)
        values["workspace_id"] = workspace_id
        values["business_architecture_id"] = architecture_id
        values["origin"] = origin
        values["status"] = "draft"
        values["created_by_user_id"] = user.id
        return values

    def _list(
        self,
        model: type[SupportingModel],
        workspace_id: uuid.UUID,
        architecture_id: uuid.UUID,
        order_column: object,
    ) -> list[SupportingModel]:
        self._get_architecture(workspace_id, architecture_id)
        return list(
            self.db.scalars(
                select(model)
                .where(
                    model.workspace_id == workspace_id,
                    model.business_architecture_id == architecture_id,
                )
                .order_by(model.created_at, model.id)
            ).all()
        )

    def _update(
        self,
        model: type[SupportingModel],
        workspace_id: uuid.UUID,
        item_id: uuid.UUID,
        values: dict[str, Any],
    ) -> SupportingModel:
        item = self._get_item(model, workspace_id, item_id)
        self._validate_references(workspace_id, values)
        for key, value in values.items():
            setattr(item, key, value)
        self.db.commit()
        return item

    def _delete(self, model: type[SupportingModel], workspace_id: uuid.UUID, item_id: uuid.UUID) -> None:
        item = self._get_item(model, workspace_id, item_id)
        self.db.delete(item)
        self.db.commit()

    def _validate_references(self, workspace_id: uuid.UUID, values: dict[str, Any]) -> None:
        if values.get("linked_value_stream_id") is not None:
            self._get_value_stream(workspace_id, values["linked_value_stream_id"])
        if values.get("linked_lean_business_case_id") is not None:
            self._get_lean_business_case(workspace_id, values["linked_lean_business_case_id"])

    def _get_architecture(
        self,
        workspace_id: uuid.UUID,
        architecture_id: uuid.UUID,
    ) -> BusinessArchitectureComponent:
        architecture = self.db.get(BusinessArchitectureComponent, architecture_id)
        if architecture is None or architecture.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return architecture

    def _get_value_stream(self, workspace_id: uuid.UUID, value_stream_id: uuid.UUID) -> ValueStream:
        value_stream = self.db.get(ValueStream, value_stream_id)
        if value_stream is None or value_stream.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return value_stream

    def _get_lean_business_case(self, workspace_id: uuid.UUID, case_id: uuid.UUID) -> LeanBusinessCase:
        business_case = self.db.get(LeanBusinessCase, case_id)
        if business_case is None or business_case.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return business_case

    def _get_item(
        self,
        model: type[SupportingModel],
        workspace_id: uuid.UUID,
        item_id: uuid.UUID,
    ) -> SupportingModel:
        item = self.db.get(model, item_id)
        if item is None or item.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return item
