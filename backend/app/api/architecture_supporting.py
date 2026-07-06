import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.api.deps import get_architecture_supporting_service, get_current_user, get_workspace_member
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.schemas.architecture_supporting import (
    BusinessImpactCreateRequest,
    BusinessImpactResponse,
    BusinessImpactUpdateRequest,
    BusinessProcessCreateRequest,
    BusinessProcessResponse,
    BusinessProcessUpdateRequest,
    InformationConceptCreateRequest,
    InformationConceptResponse,
    InformationConceptUpdateRequest,
    StakeholderPersonaCreateRequest,
    StakeholderPersonaResponse,
    StakeholderPersonaUpdateRequest,
)
from app.services.architecture_supporting_service import ArchitectureSupportingService

router = APIRouter(tags=["architecture-supporting"])

CurrentUserDep = Annotated[User, Depends(get_current_user)]
WorkspaceMemberDep = Annotated[WorkspaceMember, Depends(get_workspace_member)]
ArchitectureSupportingServiceDep = Annotated[
    ArchitectureSupportingService,
    Depends(get_architecture_supporting_service),
]


@router.post(
    "/workspaces/{workspace_id}/business-architecture/{ba_id}/processes",
    response_model=BusinessProcessResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_process(
    workspace_id: uuid.UUID,
    ba_id: uuid.UUID,
    payload: BusinessProcessCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> BusinessProcessResponse:
    return BusinessProcessResponse.model_validate(
        supporting_service.create_process(workspace_id, ba_id, current_user, payload)
    )


@router.get(
    "/workspaces/{workspace_id}/business-architecture/{ba_id}/processes",
    response_model=list[BusinessProcessResponse],
)
def list_processes(
    workspace_id: uuid.UUID,
    ba_id: uuid.UUID,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> list[BusinessProcessResponse]:
    return [
        BusinessProcessResponse.model_validate(process)
        for process in supporting_service.list_processes(workspace_id, ba_id)
    ]


@router.patch("/workspaces/{workspace_id}/processes/{process_id}", response_model=BusinessProcessResponse)
def update_process(
    workspace_id: uuid.UUID,
    process_id: uuid.UUID,
    payload: BusinessProcessUpdateRequest,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> BusinessProcessResponse:
    return BusinessProcessResponse.model_validate(supporting_service.update_process(workspace_id, process_id, payload))


@router.delete("/workspaces/{workspace_id}/processes/{process_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_process(
    workspace_id: uuid.UUID,
    process_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> Response:
    supporting_service.delete_process(workspace_id, process_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/business-architecture/{ba_id}/stakeholders",
    response_model=StakeholderPersonaResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_stakeholder(
    workspace_id: uuid.UUID,
    ba_id: uuid.UUID,
    payload: StakeholderPersonaCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> StakeholderPersonaResponse:
    return StakeholderPersonaResponse.model_validate(
        supporting_service.create_stakeholder(workspace_id, ba_id, current_user, payload)
    )


@router.get(
    "/workspaces/{workspace_id}/business-architecture/{ba_id}/stakeholders",
    response_model=list[StakeholderPersonaResponse],
)
def list_stakeholders(
    workspace_id: uuid.UUID,
    ba_id: uuid.UUID,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> list[StakeholderPersonaResponse]:
    return [
        StakeholderPersonaResponse.model_validate(stakeholder)
        for stakeholder in supporting_service.list_stakeholders(workspace_id, ba_id)
    ]


@router.patch("/workspaces/{workspace_id}/stakeholders/{stakeholder_id}", response_model=StakeholderPersonaResponse)
def update_stakeholder(
    workspace_id: uuid.UUID,
    stakeholder_id: uuid.UUID,
    payload: StakeholderPersonaUpdateRequest,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> StakeholderPersonaResponse:
    return StakeholderPersonaResponse.model_validate(
        supporting_service.update_stakeholder(workspace_id, stakeholder_id, payload)
    )


@router.delete("/workspaces/{workspace_id}/stakeholders/{stakeholder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stakeholder(
    workspace_id: uuid.UUID,
    stakeholder_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> Response:
    supporting_service.delete_stakeholder(workspace_id, stakeholder_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/business-architecture/{ba_id}/information-concepts",
    response_model=InformationConceptResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_information_concept(
    workspace_id: uuid.UUID,
    ba_id: uuid.UUID,
    payload: InformationConceptCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> InformationConceptResponse:
    return InformationConceptResponse.model_validate(
        supporting_service.create_information_concept(workspace_id, ba_id, current_user, payload)
    )


@router.get(
    "/workspaces/{workspace_id}/business-architecture/{ba_id}/information-concepts",
    response_model=list[InformationConceptResponse],
)
def list_information_concepts(
    workspace_id: uuid.UUID,
    ba_id: uuid.UUID,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> list[InformationConceptResponse]:
    return [
        InformationConceptResponse.model_validate(concept)
        for concept in supporting_service.list_information_concepts(workspace_id, ba_id)
    ]


@router.patch(
    "/workspaces/{workspace_id}/information-concepts/{concept_id}",
    response_model=InformationConceptResponse,
)
def update_information_concept(
    workspace_id: uuid.UUID,
    concept_id: uuid.UUID,
    payload: InformationConceptUpdateRequest,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> InformationConceptResponse:
    return InformationConceptResponse.model_validate(
        supporting_service.update_information_concept(workspace_id, concept_id, payload)
    )


@router.delete("/workspaces/{workspace_id}/information-concepts/{concept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_information_concept(
    workspace_id: uuid.UUID,
    concept_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> Response:
    supporting_service.delete_information_concept(workspace_id, concept_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/business-architecture/{ba_id}/business-impacts",
    response_model=BusinessImpactResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_business_impact(
    workspace_id: uuid.UUID,
    ba_id: uuid.UUID,
    payload: BusinessImpactCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> BusinessImpactResponse:
    return BusinessImpactResponse.model_validate(
        supporting_service.create_business_impact(workspace_id, ba_id, current_user, payload)
    )


@router.get(
    "/workspaces/{workspace_id}/business-architecture/{ba_id}/business-impacts",
    response_model=list[BusinessImpactResponse],
)
def list_business_impacts(
    workspace_id: uuid.UUID,
    ba_id: uuid.UUID,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> list[BusinessImpactResponse]:
    return [
        BusinessImpactResponse.model_validate(impact)
        for impact in supporting_service.list_business_impacts(workspace_id, ba_id)
    ]


@router.patch("/workspaces/{workspace_id}/business-impacts/{impact_id}", response_model=BusinessImpactResponse)
def update_business_impact(
    workspace_id: uuid.UUID,
    impact_id: uuid.UUID,
    payload: BusinessImpactUpdateRequest,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> BusinessImpactResponse:
    return BusinessImpactResponse.model_validate(
        supporting_service.update_business_impact(workspace_id, impact_id, payload)
    )


@router.delete("/workspaces/{workspace_id}/business-impacts/{impact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_business_impact(
    workspace_id: uuid.UUID,
    impact_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    supporting_service: ArchitectureSupportingServiceDep,
) -> Response:
    supporting_service.delete_business_impact(workspace_id, impact_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
