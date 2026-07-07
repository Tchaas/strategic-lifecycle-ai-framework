from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.business_capabilities import BusinessCapability
from app.models.conceptual_deliverables import ConceptualDeliverable
from app.models.features import Feature
from app.models.lean_business_cases import LeanBusinessCase
from app.models.requirements import Requirement
from app.models.users import User
from app.schemas.solution import (
    DeliverableCreateRequest,
    DeliverableUpdateRequest,
    FeatureCreateRequest,
    FeatureUpdateRequest,
    RequirementCreateRequest,
    RequirementUpdateRequest,
)
from app.services.lifecycle import LINEAR_TRANSITIONS, GateConfig, transition_status

LINEAR_GATE = GateConfig((), "Resource is missing required active fields")


class SolutionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_feature(
        self,
        workspace_id: uuid.UUID,
        case_id: uuid.UUID,
        user: User,
        payload: FeatureCreateRequest,
    ) -> Feature:
        self._ensure_case_accepts_children(workspace_id, case_id)
        if payload.capability_id is not None:
            self._get_capability(workspace_id, payload.capability_id)
        feature = Feature(
            **payload.model_dump(),
            workspace_id=workspace_id,
            lean_business_case_id=case_id,
            status="draft",
            created_by_user_id=user.id,
        )
        self.db.add(feature)
        self.db.commit()
        return feature

    def list_features(self, workspace_id: uuid.UUID, case_id: uuid.UUID) -> list[Feature]:
        self._get_case(workspace_id, case_id)
        return list(
            self.db.scalars(
                select(Feature)
                .where(Feature.workspace_id == workspace_id, Feature.lean_business_case_id == case_id)
                .order_by(Feature.created_at, Feature.id)
            ).all()
        )

    def update_feature(
        self,
        workspace_id: uuid.UUID,
        feature_id: uuid.UUID,
        payload: FeatureUpdateRequest,
    ) -> Feature:
        feature = self._get_feature(workspace_id, feature_id)
        values = payload.model_dump(exclude_unset=True)
        requested_status = values.pop("status", None)
        if "capability_id" in values and values["capability_id"] is not None:
            self._get_capability(workspace_id, values["capability_id"])
        for key, value in values.items():
            setattr(feature, key, value)
        if requested_status is not None and requested_status != feature.status:
            transition_status(feature, requested_status, LINEAR_GATE, LINEAR_TRANSITIONS)
        self.db.commit()
        return feature

    def delete_feature(self, workspace_id: uuid.UUID, feature_id: uuid.UUID) -> None:
        feature = self._get_feature(workspace_id, feature_id)
        self.db.delete(feature)
        self.db.commit()

    def create_requirement(
        self,
        workspace_id: uuid.UUID,
        feature_id: uuid.UUID,
        user: User,
        payload: RequirementCreateRequest,
    ) -> Requirement:
        self._get_feature(workspace_id, feature_id)
        requirement = Requirement(
            **payload.model_dump(),
            workspace_id=workspace_id,
            feature_id=feature_id,
            status="draft",
            created_by_user_id=user.id,
        )
        self.db.add(requirement)
        self.db.commit()
        return requirement

    def list_requirements(self, workspace_id: uuid.UUID, feature_id: uuid.UUID) -> list[Requirement]:
        self._get_feature(workspace_id, feature_id)
        return list(
            self.db.scalars(
                select(Requirement)
                .where(Requirement.workspace_id == workspace_id, Requirement.feature_id == feature_id)
                .order_by(Requirement.created_at, Requirement.id)
            ).all()
        )

    def update_requirement(
        self,
        workspace_id: uuid.UUID,
        requirement_id: uuid.UUID,
        payload: RequirementUpdateRequest,
    ) -> Requirement:
        requirement = self._get_requirement(workspace_id, requirement_id)
        values = payload.model_dump(exclude_unset=True)
        requested_status = values.pop("status", None)
        for key, value in values.items():
            setattr(requirement, key, value)
        if requested_status is not None and requested_status != requirement.status:
            transition_status(requirement, requested_status, LINEAR_GATE, LINEAR_TRANSITIONS)
        self.db.commit()
        return requirement

    def delete_requirement(self, workspace_id: uuid.UUID, requirement_id: uuid.UUID) -> None:
        requirement = self._get_requirement(workspace_id, requirement_id)
        self.db.delete(requirement)
        self.db.commit()

    def create_deliverable(
        self,
        workspace_id: uuid.UUID,
        case_id: uuid.UUID,
        user: User,
        payload: DeliverableCreateRequest,
    ) -> ConceptualDeliverable:
        self._ensure_case_accepts_children(workspace_id, case_id)
        deliverable = ConceptualDeliverable(
            **payload.model_dump(exclude={"source"}),
            workspace_id=workspace_id,
            lean_business_case_id=case_id,
            source=payload.source or "suggested",
            status="draft",
            created_by_user_id=user.id,
        )
        self.db.add(deliverable)
        self.db.commit()
        return deliverable

    def list_deliverables(self, workspace_id: uuid.UUID, case_id: uuid.UUID) -> list[ConceptualDeliverable]:
        self._get_case(workspace_id, case_id)
        return list(
            self.db.scalars(
                select(ConceptualDeliverable)
                .where(
                    ConceptualDeliverable.workspace_id == workspace_id,
                    ConceptualDeliverable.lean_business_case_id == case_id,
                )
                .order_by(ConceptualDeliverable.created_at, ConceptualDeliverable.id)
            ).all()
        )

    def update_deliverable(
        self,
        workspace_id: uuid.UUID,
        deliverable_id: uuid.UUID,
        payload: DeliverableUpdateRequest,
    ) -> ConceptualDeliverable:
        deliverable = self._get_deliverable(workspace_id, deliverable_id)
        values = payload.model_dump(exclude_unset=True)
        requested_status = values.pop("status", None)
        requested_source = values.pop("source", None)
        for key, value in values.items():
            setattr(deliverable, key, value)
        if requested_source is not None:
            self._apply_deliverable_source(deliverable, requested_source)
        if requested_status is not None and requested_status != deliverable.status:
            transition_status(deliverable, requested_status, LINEAR_GATE, LINEAR_TRANSITIONS)
        self.db.commit()
        return deliverable

    def delete_deliverable(self, workspace_id: uuid.UUID, deliverable_id: uuid.UUID) -> None:
        deliverable = self._get_deliverable(workspace_id, deliverable_id)
        if deliverable.source == "user_finalized":
            raise AppError("already_finalized", "Finalized deliverables cannot be deleted", 409)
        self.db.delete(deliverable)
        self.db.commit()

    def _apply_deliverable_source(self, deliverable: ConceptualDeliverable, requested_source: str) -> None:
        if deliverable.source == "user_finalized" and requested_source != "user_finalized":
            raise AppError("already_finalized", "Finalized deliverables cannot be reverted", 409)
        if deliverable.source == "suggested" and requested_source == "user_finalized":
            deliverable.source = requested_source
        elif deliverable.source != requested_source:
            raise AppError("already_finalized", "Invalid deliverable source transition", 409)

    def _ensure_case_accepts_children(self, workspace_id: uuid.UUID, case_id: uuid.UUID) -> LeanBusinessCase:
        business_case = self._get_case(workspace_id, case_id)
        if business_case.status == "archived":
            raise AppError("case_archived", "Archived cases cannot accept new solution artifacts", 409)
        return business_case

    def _get_case(self, workspace_id: uuid.UUID, case_id: uuid.UUID) -> LeanBusinessCase:
        business_case = self.db.get(LeanBusinessCase, case_id)
        if business_case is None or business_case.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return business_case

    def _get_feature(self, workspace_id: uuid.UUID, feature_id: uuid.UUID) -> Feature:
        feature = self.db.get(Feature, feature_id)
        if feature is None or feature.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return feature

    def _get_requirement(self, workspace_id: uuid.UUID, requirement_id: uuid.UUID) -> Requirement:
        requirement = self.db.get(Requirement, requirement_id)
        if requirement is None or requirement.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return requirement

    def _get_deliverable(self, workspace_id: uuid.UUID, deliverable_id: uuid.UUID) -> ConceptualDeliverable:
        deliverable = self.db.get(ConceptualDeliverable, deliverable_id)
        if deliverable is None or deliverable.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return deliverable

    def _get_capability(self, workspace_id: uuid.UUID, capability_id: uuid.UUID) -> BusinessCapability:
        capability = self.db.get(BusinessCapability, capability_id)
        if capability is None or capability.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return capability
