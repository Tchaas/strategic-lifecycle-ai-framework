from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import TypeVar

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.business_architecture_components import BusinessArchitectureComponent
from app.models.business_capabilities import BusinessCapability
from app.models.business_impacts import BusinessImpact
from app.models.business_processes import BusinessProcess
from app.models.discovery import Discovery
from app.models.discovery_business_processes import DiscoveryBusinessProcess
from app.models.discovery_information_concepts import DiscoveryInformationConcept
from app.models.discovery_stakeholders_personas import DiscoveryStakeholderPersona
from app.models.information_concepts import InformationConcept
from app.models.key_activities import KeyActivity
from app.models.lean_business_cases import LeanBusinessCase
from app.models.stakeholders_personas import StakeholderPersona
from app.models.users import User
from app.models.value_streams import ValueStream
from app.schemas.architecture_core import (
    BusinessArchitectureCreateRequest,
    CapabilityCreateRequest,
    KeyActivityCreateRequest,
    ValueStreamCreateRequest,
)
from app.schemas.architecture_supporting import (
    BusinessImpactCreateRequest,
    BusinessProcessCreateRequest,
    InformationConceptCreateRequest,
    StakeholderPersonaCreateRequest,
)
from app.schemas.discovery import DiscoveryCreateRequest, DiscoveryKeyActivityCreateRequest, DiscoveryUpdateRequest
from app.services.architecture_supporting_service import ArchitectureSupportingService
from app.services.business_architecture_service import BusinessArchitectureService
from app.services.capability_service import CapabilityService
from app.services.key_activity_service import KeyActivityService
from app.services.lifecycle import LINEAR_TRANSITIONS, GateConfig, transition_status
from app.services.value_stream_service import ValueStreamService

DiscoveryLinkT = TypeVar(
    "DiscoveryLinkT",
    DiscoveryStakeholderPersona,
    DiscoveryBusinessProcess,
    DiscoveryInformationConcept,
)
DISCOVERY_GATE = GateConfig((), "Discovery is missing required active fields")


@dataclass(frozen=True)
class DiscoveryDetail:
    discovery: Discovery
    stakeholder_persona_ids: list[uuid.UUID]
    business_process_ids: list[uuid.UUID]
    information_concept_ids: list[uuid.UUID]


class DiscoveryService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.architecture_service = BusinessArchitectureService(db)
        self.value_stream_service = ValueStreamService(db)
        self.key_activity_service = KeyActivityService(db)
        self.capability_service = CapabilityService(db)
        self.supporting_service = ArchitectureSupportingService(db)

    def create(
        self,
        workspace_id: uuid.UUID,
        case_id: uuid.UUID,
        user: User,
        payload: DiscoveryCreateRequest,
    ) -> Discovery:
        self._get_case(workspace_id, case_id)
        discovery = Discovery(
            **payload.model_dump(),
            workspace_id=workspace_id,
            lean_business_case_id=case_id,
            status="draft",
            created_by_user_id=user.id,
        )
        self.db.add(discovery)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise AppError("discovery_exists", "Discovery already exists for this business case", 409) from exc
        return discovery

    def get_for_case(self, workspace_id: uuid.UUID, case_id: uuid.UUID) -> DiscoveryDetail:
        self._get_case(workspace_id, case_id)
        discovery = self.db.scalar(
            select(Discovery).where(Discovery.workspace_id == workspace_id, Discovery.lean_business_case_id == case_id)
        )
        if discovery is None:
            raise AppError("not_found", "Resource not found", 404)
        return self._detail(discovery)

    def update(
        self,
        workspace_id: uuid.UUID,
        discovery_id: uuid.UUID,
        payload: DiscoveryUpdateRequest,
    ) -> Discovery:
        discovery = self._get_discovery(workspace_id, discovery_id)
        values = payload.model_dump(exclude_unset=True)
        requested_status = values.pop("status", None)
        for key, value in values.items():
            setattr(discovery, key, value)
        if requested_status is not None and requested_status != discovery.status:
            transition_status(discovery, requested_status, DISCOVERY_GATE, LINEAR_TRANSITIONS)
        self.db.commit()
        return discovery

    def link_stakeholder(
        self,
        workspace_id: uuid.UUID,
        discovery_id: uuid.UUID,
        stakeholder_id: uuid.UUID,
    ) -> DiscoveryStakeholderPersona:
        self._get_discovery(workspace_id, discovery_id)
        self._get_stakeholder(workspace_id, stakeholder_id)
        link = DiscoveryStakeholderPersona(discovery_id=discovery_id, stakeholder_persona_id=stakeholder_id)
        return self._commit_link(link, "Stakeholder/persona is already linked")

    def unlink_stakeholder(self, workspace_id: uuid.UUID, discovery_id: uuid.UUID, stakeholder_id: uuid.UUID) -> None:
        self._get_discovery(workspace_id, discovery_id)
        self._get_stakeholder(workspace_id, stakeholder_id)
        link = self.db.scalar(
            select(DiscoveryStakeholderPersona).where(
                DiscoveryStakeholderPersona.discovery_id == discovery_id,
                DiscoveryStakeholderPersona.stakeholder_persona_id == stakeholder_id,
            )
        )
        self._delete_link(link)

    def link_process(
        self,
        workspace_id: uuid.UUID,
        discovery_id: uuid.UUID,
        process_id: uuid.UUID,
    ) -> DiscoveryBusinessProcess:
        self._get_discovery(workspace_id, discovery_id)
        self._get_process(workspace_id, process_id)
        link = DiscoveryBusinessProcess(discovery_id=discovery_id, business_process_id=process_id)
        return self._commit_link(link, "Business process is already linked")

    def unlink_process(self, workspace_id: uuid.UUID, discovery_id: uuid.UUID, process_id: uuid.UUID) -> None:
        self._get_discovery(workspace_id, discovery_id)
        self._get_process(workspace_id, process_id)
        link = self.db.scalar(
            select(DiscoveryBusinessProcess).where(
                DiscoveryBusinessProcess.discovery_id == discovery_id,
                DiscoveryBusinessProcess.business_process_id == process_id,
            )
        )
        self._delete_link(link)

    def link_information_concept(
        self,
        workspace_id: uuid.UUID,
        discovery_id: uuid.UUID,
        concept_id: uuid.UUID,
    ) -> DiscoveryInformationConcept:
        self._get_discovery(workspace_id, discovery_id)
        self._get_information_concept(workspace_id, concept_id)
        link = DiscoveryInformationConcept(discovery_id=discovery_id, information_concept_id=concept_id)
        return self._commit_link(link, "Information concept is already linked")

    def unlink_information_concept(
        self,
        workspace_id: uuid.UUID,
        discovery_id: uuid.UUID,
        concept_id: uuid.UUID,
    ) -> None:
        self._get_discovery(workspace_id, discovery_id)
        self._get_information_concept(workspace_id, concept_id)
        link = self.db.scalar(
            select(DiscoveryInformationConcept).where(
                DiscoveryInformationConcept.discovery_id == discovery_id,
                DiscoveryInformationConcept.information_concept_id == concept_id,
            )
        )
        self._delete_link(link)

    def create_business_architecture(
        self,
        workspace_id: uuid.UUID,
        discovery_id: uuid.UUID,
        user: User,
        payload: BusinessArchitectureCreateRequest,
    ) -> BusinessArchitectureComponent:
        self._get_discovery(workspace_id, discovery_id)
        return self.architecture_service.create(workspace_id, user, payload, origin="discovery")

    def create_value_stream(
        self,
        workspace_id: uuid.UUID,
        discovery_id: uuid.UUID,
        user: User,
        payload: ValueStreamCreateRequest,
    ) -> ValueStream:
        self._get_discovery(workspace_id, discovery_id)
        architecture = self._get_architecture_required(workspace_id)
        return self.value_stream_service.create(workspace_id, architecture.id, user, payload, origin="discovery")

    def create_key_activity(
        self,
        workspace_id: uuid.UUID,
        discovery_id: uuid.UUID,
        user: User,
        payload: DiscoveryKeyActivityCreateRequest,
    ) -> KeyActivity:
        self._get_discovery(workspace_id, discovery_id)
        self._get_architecture_required(workspace_id)
        self._get_value_stream(workspace_id, payload.value_stream_id)
        key_activity_payload = KeyActivityCreateRequest.model_validate(payload.model_dump(exclude={"value_stream_id"}))
        return self.key_activity_service.create(
            workspace_id,
            payload.value_stream_id,
            user,
            key_activity_payload,
            origin="discovery",
        )

    def create_capability(
        self,
        workspace_id: uuid.UUID,
        discovery_id: uuid.UUID,
        user: User,
        payload: CapabilityCreateRequest,
    ) -> BusinessCapability:
        self._get_discovery(workspace_id, discovery_id)
        architecture = self._get_architecture_required(workspace_id)
        return self.capability_service.create(workspace_id, architecture.id, user, payload, origin="discovery")

    def create_business_impact(
        self,
        workspace_id: uuid.UUID,
        discovery_id: uuid.UUID,
        user: User,
        payload: BusinessImpactCreateRequest,
    ) -> BusinessImpact:
        self._get_discovery(workspace_id, discovery_id)
        architecture = self._get_architecture_required(workspace_id)
        return self.supporting_service.create_business_impact(
            workspace_id,
            architecture.id,
            user,
            payload,
            origin="discovery",
        )

    def create_stakeholder(
        self,
        workspace_id: uuid.UUID,
        discovery_id: uuid.UUID,
        user: User,
        payload: StakeholderPersonaCreateRequest,
    ) -> StakeholderPersona:
        self._get_discovery(workspace_id, discovery_id)
        architecture = self._get_architecture_required(workspace_id)
        stakeholder = self.supporting_service.create_stakeholder(
            workspace_id,
            architecture.id,
            user,
            payload,
            origin="discovery",
            commit=False,
        )
        self.db.add(DiscoveryStakeholderPersona(discovery_id=discovery_id, stakeholder_persona_id=stakeholder.id))
        self.db.commit()
        return stakeholder

    def create_process(
        self,
        workspace_id: uuid.UUID,
        discovery_id: uuid.UUID,
        user: User,
        payload: BusinessProcessCreateRequest,
    ) -> BusinessProcess:
        self._get_discovery(workspace_id, discovery_id)
        architecture = self._get_architecture_required(workspace_id)
        process = self.supporting_service.create_process(
            workspace_id,
            architecture.id,
            user,
            payload,
            origin="discovery",
            commit=False,
        )
        self.db.add(DiscoveryBusinessProcess(discovery_id=discovery_id, business_process_id=process.id))
        self.db.commit()
        return process

    def create_information_concept(
        self,
        workspace_id: uuid.UUID,
        discovery_id: uuid.UUID,
        user: User,
        payload: InformationConceptCreateRequest,
    ) -> InformationConcept:
        self._get_discovery(workspace_id, discovery_id)
        architecture = self._get_architecture_required(workspace_id)
        concept = self.supporting_service.create_information_concept(
            workspace_id,
            architecture.id,
            user,
            payload,
            origin="discovery",
            commit=False,
        )
        self.db.add(DiscoveryInformationConcept(discovery_id=discovery_id, information_concept_id=concept.id))
        self.db.commit()
        return concept

    def _detail(self, discovery: Discovery) -> DiscoveryDetail:
        stakeholder_ids = list(
            self.db.scalars(
                select(DiscoveryStakeholderPersona.stakeholder_persona_id).where(
                    DiscoveryStakeholderPersona.discovery_id == discovery.id
                )
            ).all()
        )
        process_ids = list(
            self.db.scalars(
                select(DiscoveryBusinessProcess.business_process_id).where(
                    DiscoveryBusinessProcess.discovery_id == discovery.id
                )
            ).all()
        )
        concept_ids = list(
            self.db.scalars(
                select(DiscoveryInformationConcept.information_concept_id).where(
                    DiscoveryInformationConcept.discovery_id == discovery.id
                )
            ).all()
        )
        return DiscoveryDetail(discovery, stakeholder_ids, process_ids, concept_ids)

    def _get_case(self, workspace_id: uuid.UUID, case_id: uuid.UUID) -> LeanBusinessCase:
        business_case = self.db.get(LeanBusinessCase, case_id)
        if business_case is None or business_case.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return business_case

    def _get_discovery(self, workspace_id: uuid.UUID, discovery_id: uuid.UUID) -> Discovery:
        discovery = self.db.get(Discovery, discovery_id)
        if discovery is None or discovery.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return discovery

    def _get_architecture_required(self, workspace_id: uuid.UUID) -> BusinessArchitectureComponent:
        architecture = self.db.scalar(
            select(BusinessArchitectureComponent).where(BusinessArchitectureComponent.workspace_id == workspace_id)
        )
        if architecture is None:
            raise AppError("architecture_required", "Business architecture is required", 409)
        return architecture

    def _get_value_stream(self, workspace_id: uuid.UUID, value_stream_id: uuid.UUID) -> ValueStream:
        value_stream = self.db.get(ValueStream, value_stream_id)
        if value_stream is None or value_stream.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return value_stream

    def _get_stakeholder(self, workspace_id: uuid.UUID, stakeholder_id: uuid.UUID) -> StakeholderPersona:
        stakeholder = self.db.get(StakeholderPersona, stakeholder_id)
        if stakeholder is None or stakeholder.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return stakeholder

    def _get_process(self, workspace_id: uuid.UUID, process_id: uuid.UUID) -> BusinessProcess:
        process = self.db.get(BusinessProcess, process_id)
        if process is None or process.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return process

    def _get_information_concept(self, workspace_id: uuid.UUID, concept_id: uuid.UUID) -> InformationConcept:
        concept = self.db.get(InformationConcept, concept_id)
        if concept is None or concept.workspace_id != workspace_id:
            raise AppError("not_found", "Resource not found", 404)
        return concept

    def _commit_link(self, link: DiscoveryLinkT, message: str) -> DiscoveryLinkT:
        self.db.add(link)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise AppError("already_linked", message, 409) from exc
        return link

    def _delete_link(self, link: DiscoveryLinkT | None) -> None:
        if link is None:
            raise AppError("not_found", "Resource not found", 404)
        self.db.delete(link)
        self.db.commit()
