import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.api.deps import get_current_user, get_discovery_service, get_workspace_member
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.schemas.architecture_core import (
    BusinessArchitectureCreateRequest,
    BusinessArchitectureResponse,
    CapabilityCreateRequest,
    CapabilityResponse,
    KeyActivityResponse,
    ValueStreamCreateRequest,
    ValueStreamResponse,
)
from app.schemas.architecture_supporting import (
    BusinessImpactCreateRequest,
    BusinessImpactResponse,
    BusinessProcessCreateRequest,
    BusinessProcessResponse,
    InformationConceptCreateRequest,
    InformationConceptResponse,
    StakeholderPersonaCreateRequest,
    StakeholderPersonaResponse,
)
from app.schemas.discovery import (
    DiscoveryCreateRequest,
    DiscoveryKeyActivityCreateRequest,
    DiscoveryLinkResponse,
    DiscoveryResponse,
    DiscoveryUpdateRequest,
)
from app.services.discovery_service import DiscoveryDetail, DiscoveryService

router = APIRouter(tags=["discovery"])

CurrentUserDep = Annotated[User, Depends(get_current_user)]
WorkspaceMemberDep = Annotated[WorkspaceMember, Depends(get_workspace_member)]
DiscoveryServiceDep = Annotated[DiscoveryService, Depends(get_discovery_service)]


@router.post(
    "/workspaces/{workspace_id}/lean-business-cases/{case_id}/discovery",
    response_model=DiscoveryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_discovery(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    payload: DiscoveryCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> DiscoveryResponse:
    discovery = discovery_service.create(workspace_id, case_id, current_user, payload)
    return discovery_response(discovery_service.get_for_case(workspace_id, discovery.lean_business_case_id))


@router.get("/workspaces/{workspace_id}/lean-business-cases/{case_id}/discovery", response_model=DiscoveryResponse)
def get_discovery(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> DiscoveryResponse:
    return discovery_response(discovery_service.get_for_case(workspace_id, case_id))


@router.patch("/workspaces/{workspace_id}/discovery/{discovery_id}", response_model=DiscoveryResponse)
def update_discovery(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    payload: DiscoveryUpdateRequest,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> DiscoveryResponse:
    discovery = discovery_service.update(workspace_id, discovery_id, payload)
    return discovery_response(discovery_service.get_for_case(workspace_id, discovery.lean_business_case_id))


@router.post(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/personas/{persona_id}",
    response_model=DiscoveryLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
def link_discovery_stakeholder(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    persona_id: uuid.UUID,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> DiscoveryLinkResponse:
    return DiscoveryLinkResponse.model_validate(
        discovery_service.link_stakeholder(workspace_id, discovery_id, persona_id)
    )


@router.delete(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/personas/{persona_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unlink_discovery_stakeholder(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    persona_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> Response:
    discovery_service.unlink_stakeholder(workspace_id, discovery_id, persona_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/processes/{process_id}",
    response_model=DiscoveryLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
def link_discovery_process(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    process_id: uuid.UUID,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> DiscoveryLinkResponse:
    return DiscoveryLinkResponse.model_validate(discovery_service.link_process(workspace_id, discovery_id, process_id))


@router.delete(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/processes/{process_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unlink_discovery_process(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    process_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> Response:
    discovery_service.unlink_process(workspace_id, discovery_id, process_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/information-concepts/{concept_id}",
    response_model=DiscoveryLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
def link_discovery_information_concept(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    concept_id: uuid.UUID,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> DiscoveryLinkResponse:
    return DiscoveryLinkResponse.model_validate(
        discovery_service.link_information_concept(workspace_id, discovery_id, concept_id)
    )


@router.delete(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/information-concepts/{concept_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unlink_discovery_information_concept(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    concept_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> Response:
    discovery_service.unlink_information_concept(workspace_id, discovery_id, concept_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/business-architecture",
    response_model=BusinessArchitectureResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_discovery_business_architecture(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    payload: BusinessArchitectureCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> BusinessArchitectureResponse:
    return BusinessArchitectureResponse.model_validate(
        discovery_service.create_business_architecture(workspace_id, discovery_id, current_user, payload)
    )


@router.post(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/value-streams",
    response_model=ValueStreamResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_discovery_value_stream(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    payload: ValueStreamCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> ValueStreamResponse:
    return ValueStreamResponse.model_validate(
        discovery_service.create_value_stream(workspace_id, discovery_id, current_user, payload)
    )


@router.post(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/key-activities",
    response_model=KeyActivityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_discovery_key_activity(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    payload: DiscoveryKeyActivityCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> KeyActivityResponse:
    return KeyActivityResponse.model_validate(
        discovery_service.create_key_activity(workspace_id, discovery_id, current_user, payload)
    )


@router.post(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/capabilities",
    response_model=CapabilityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_discovery_capability(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    payload: CapabilityCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> CapabilityResponse:
    return CapabilityResponse.model_validate(
        discovery_service.create_capability(workspace_id, discovery_id, current_user, payload)
    )


@router.post(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/business-impacts",
    response_model=BusinessImpactResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_discovery_business_impact(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    payload: BusinessImpactCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> BusinessImpactResponse:
    return BusinessImpactResponse.model_validate(
        discovery_service.create_business_impact(workspace_id, discovery_id, current_user, payload)
    )


@router.post(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/personas",
    response_model=StakeholderPersonaResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_discovery_stakeholder(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    payload: StakeholderPersonaCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> StakeholderPersonaResponse:
    return StakeholderPersonaResponse.model_validate(
        discovery_service.create_stakeholder(workspace_id, discovery_id, current_user, payload)
    )


@router.post(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/processes",
    response_model=BusinessProcessResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_discovery_process(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    payload: BusinessProcessCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> BusinessProcessResponse:
    return BusinessProcessResponse.model_validate(
        discovery_service.create_process(workspace_id, discovery_id, current_user, payload)
    )


@router.post(
    "/workspaces/{workspace_id}/discovery/{discovery_id}/information-concepts",
    response_model=InformationConceptResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_discovery_information_concept(
    workspace_id: uuid.UUID,
    discovery_id: uuid.UUID,
    payload: InformationConceptCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    discovery_service: DiscoveryServiceDep,
) -> InformationConceptResponse:
    return InformationConceptResponse.model_validate(
        discovery_service.create_information_concept(workspace_id, discovery_id, current_user, payload)
    )


def discovery_response(detail: DiscoveryDetail) -> DiscoveryResponse:
    return DiscoveryResponse(
        **DiscoveryResponse.model_validate(detail.discovery).model_dump(
            exclude={"stakeholder_persona_ids", "business_process_ids", "information_concept_ids"}
        ),
        stakeholder_persona_ids=detail.stakeholder_persona_ids,
        business_process_ids=detail.business_process_ids,
        information_concept_ids=detail.information_concept_ids,
    )
