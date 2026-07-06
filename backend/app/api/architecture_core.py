import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select

from app.api.deps import (
    get_business_architecture_service,
    get_capability_service,
    get_current_user,
    get_key_activity_service,
    get_value_stream_service,
    get_workspace_member,
)
from app.models.key_activities import KeyActivity
from app.models.key_activity_capabilities import KeyActivityCapability
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.schemas.architecture_core import (
    BusinessArchitectureCreateRequest,
    BusinessArchitectureResponse,
    BusinessArchitectureUpdateRequest,
    CapabilityCreateRequest,
    CapabilityLinkResponse,
    CapabilityResponse,
    CapabilityUpdateRequest,
    KeyActivityCreateRequest,
    KeyActivityResponse,
    KeyActivityUpdateRequest,
    ValueStreamCreateRequest,
    ValueStreamResponse,
    ValueStreamUpdateRequest,
)
from app.services.business_architecture_service import BusinessArchitectureService
from app.services.capability_service import CapabilityDetail, CapabilityService
from app.services.key_activity_service import KeyActivityService
from app.services.value_stream_service import ValueStreamDetail, ValueStreamService

router = APIRouter(tags=["architecture-core"])

CurrentUserDep = Annotated[User, Depends(get_current_user)]
WorkspaceMemberDep = Annotated[WorkspaceMember, Depends(get_workspace_member)]
BusinessArchitectureServiceDep = Annotated[BusinessArchitectureService, Depends(get_business_architecture_service)]
ValueStreamServiceDep = Annotated[ValueStreamService, Depends(get_value_stream_service)]
KeyActivityServiceDep = Annotated[KeyActivityService, Depends(get_key_activity_service)]
CapabilityServiceDep = Annotated[CapabilityService, Depends(get_capability_service)]


@router.post(
    "/workspaces/{workspace_id}/business-architecture",
    response_model=BusinessArchitectureResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_business_architecture(
    workspace_id: uuid.UUID,
    payload: BusinessArchitectureCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    architecture_service: BusinessArchitectureServiceDep,
) -> BusinessArchitectureResponse:
    return BusinessArchitectureResponse.model_validate(architecture_service.create(workspace_id, current_user, payload))


@router.get("/workspaces/{workspace_id}/business-architecture", response_model=BusinessArchitectureResponse)
def get_business_architecture(
    workspace_id: uuid.UUID,
    _: WorkspaceMemberDep,
    architecture_service: BusinessArchitectureServiceDep,
) -> BusinessArchitectureResponse:
    return BusinessArchitectureResponse.model_validate(architecture_service.get_singleton(workspace_id))


@router.patch(
    "/workspaces/{workspace_id}/business-architecture/{ba_id}",
    response_model=BusinessArchitectureResponse,
)
def update_business_architecture(
    workspace_id: uuid.UUID,
    ba_id: uuid.UUID,
    payload: BusinessArchitectureUpdateRequest,
    _: WorkspaceMemberDep,
    architecture_service: BusinessArchitectureServiceDep,
) -> BusinessArchitectureResponse:
    return BusinessArchitectureResponse.model_validate(architecture_service.update(workspace_id, ba_id, payload))


@router.post(
    "/workspaces/{workspace_id}/business-architecture/{ba_id}/value-streams",
    response_model=ValueStreamResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_value_stream(
    workspace_id: uuid.UUID,
    ba_id: uuid.UUID,
    payload: ValueStreamCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    value_stream_service: ValueStreamServiceDep,
) -> ValueStreamResponse:
    stream = value_stream_service.create(workspace_id, ba_id, current_user, payload)
    return value_stream_response(ValueStreamDetail(stream, [], []), value_stream_service)


@router.get(
    "/workspaces/{workspace_id}/business-architecture/{ba_id}/value-streams",
    response_model=list[ValueStreamResponse],
)
def list_value_streams(
    workspace_id: uuid.UUID,
    ba_id: uuid.UUID,
    _: WorkspaceMemberDep,
    value_stream_service: ValueStreamServiceDep,
) -> list[ValueStreamResponse]:
    return [
        value_stream_response(ValueStreamDetail(stream, [], []), value_stream_service)
        for stream in value_stream_service.list_for_architecture(workspace_id, ba_id)
    ]


@router.get("/workspaces/{workspace_id}/value-streams/{vs_id}", response_model=ValueStreamResponse)
def get_value_stream(
    workspace_id: uuid.UUID,
    vs_id: uuid.UUID,
    _: WorkspaceMemberDep,
    value_stream_service: ValueStreamServiceDep,
) -> ValueStreamResponse:
    return value_stream_response(value_stream_service.get_detail(workspace_id, vs_id), value_stream_service)


@router.patch("/workspaces/{workspace_id}/value-streams/{vs_id}", response_model=ValueStreamResponse)
def update_value_stream(
    workspace_id: uuid.UUID,
    vs_id: uuid.UUID,
    payload: ValueStreamUpdateRequest,
    _: WorkspaceMemberDep,
    value_stream_service: ValueStreamServiceDep,
) -> ValueStreamResponse:
    stream = value_stream_service.update(workspace_id, vs_id, payload)
    return value_stream_response(ValueStreamDetail(stream, [], []), value_stream_service)


@router.delete("/workspaces/{workspace_id}/value-streams/{vs_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_value_stream(
    workspace_id: uuid.UUID,
    vs_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    value_stream_service: ValueStreamServiceDep,
) -> Response:
    value_stream_service.delete(workspace_id, vs_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/value-streams/{vs_id}/key-activities",
    response_model=KeyActivityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_key_activity(
    workspace_id: uuid.UUID,
    vs_id: uuid.UUID,
    payload: KeyActivityCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    key_activity_service: KeyActivityServiceDep,
) -> KeyActivityResponse:
    activity = key_activity_service.create(workspace_id, vs_id, current_user, payload)
    return key_activity_response(activity, key_activity_service)


@router.get(
    "/workspaces/{workspace_id}/value-streams/{vs_id}/key-activities",
    response_model=list[KeyActivityResponse],
)
def list_key_activities(
    workspace_id: uuid.UUID,
    vs_id: uuid.UUID,
    _: WorkspaceMemberDep,
    key_activity_service: KeyActivityServiceDep,
) -> list[KeyActivityResponse]:
    return [
        key_activity_response(activity, key_activity_service)
        for activity in key_activity_service.list_for_stream(workspace_id, vs_id)
    ]


@router.patch("/workspaces/{workspace_id}/key-activities/{ka_id}", response_model=KeyActivityResponse)
def update_key_activity(
    workspace_id: uuid.UUID,
    ka_id: uuid.UUID,
    payload: KeyActivityUpdateRequest,
    _: WorkspaceMemberDep,
    key_activity_service: KeyActivityServiceDep,
) -> KeyActivityResponse:
    return key_activity_response(key_activity_service.update(workspace_id, ka_id, payload), key_activity_service)


@router.delete("/workspaces/{workspace_id}/key-activities/{ka_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_key_activity(
    workspace_id: uuid.UUID,
    ka_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    key_activity_service: KeyActivityServiceDep,
) -> Response:
    key_activity_service.delete(workspace_id, ka_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/business-architecture/{ba_id}/capabilities",
    response_model=CapabilityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_capability(
    workspace_id: uuid.UUID,
    ba_id: uuid.UUID,
    payload: CapabilityCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    capability_service: CapabilityServiceDep,
) -> CapabilityResponse:
    capability = capability_service.create(workspace_id, ba_id, current_user, payload)
    return CapabilityResponse.model_validate(capability)


@router.get(
    "/workspaces/{workspace_id}/business-architecture/{ba_id}/capabilities",
    response_model=list[CapabilityResponse],
)
def list_capabilities(
    workspace_id: uuid.UUID,
    ba_id: uuid.UUID,
    _: WorkspaceMemberDep,
    capability_service: CapabilityServiceDep,
) -> list[CapabilityResponse]:
    return [capability_response(detail) for detail in capability_service.list_for_architecture(workspace_id, ba_id)]


@router.patch("/workspaces/{workspace_id}/capabilities/{cap_id}", response_model=CapabilityResponse)
def update_capability(
    workspace_id: uuid.UUID,
    cap_id: uuid.UUID,
    payload: CapabilityUpdateRequest,
    _: WorkspaceMemberDep,
    capability_service: CapabilityServiceDep,
) -> CapabilityResponse:
    return CapabilityResponse.model_validate(capability_service.update(workspace_id, cap_id, payload))


@router.delete("/workspaces/{workspace_id}/capabilities/{cap_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_capability(
    workspace_id: uuid.UUID,
    cap_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    capability_service: CapabilityServiceDep,
) -> Response:
    capability_service.delete(workspace_id, cap_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/value-streams/{vs_id}/capabilities/{cap_id}",
    response_model=CapabilityLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
def link_value_stream_capability(
    workspace_id: uuid.UUID,
    vs_id: uuid.UUID,
    cap_id: uuid.UUID,
    _: WorkspaceMemberDep,
    value_stream_service: ValueStreamServiceDep,
) -> CapabilityLinkResponse:
    link = value_stream_service.link_capability(workspace_id, vs_id, cap_id)
    return CapabilityLinkResponse(
        id=link.id,
        value_stream_id=link.value_stream_id,
        capability_id=link.capability_id,
        created_at=link.created_at,
    )


@router.delete(
    "/workspaces/{workspace_id}/value-streams/{vs_id}/capabilities/{cap_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unlink_value_stream_capability(
    workspace_id: uuid.UUID,
    vs_id: uuid.UUID,
    cap_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    value_stream_service: ValueStreamServiceDep,
) -> Response:
    value_stream_service.unlink_capability(workspace_id, vs_id, cap_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/key-activities/{ka_id}/capabilities/{cap_id}",
    response_model=CapabilityLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
def link_key_activity_capability(
    workspace_id: uuid.UUID,
    ka_id: uuid.UUID,
    cap_id: uuid.UUID,
    _: WorkspaceMemberDep,
    key_activity_service: KeyActivityServiceDep,
) -> CapabilityLinkResponse:
    link = key_activity_service.link_capability(workspace_id, ka_id, cap_id)
    return CapabilityLinkResponse(
        id=link.id,
        key_activity_id=link.key_activity_id,
        capability_id=link.capability_id,
        created_at=link.created_at,
    )


@router.delete(
    "/workspaces/{workspace_id}/key-activities/{ka_id}/capabilities/{cap_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unlink_key_activity_capability(
    workspace_id: uuid.UUID,
    ka_id: uuid.UUID,
    cap_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    key_activity_service: KeyActivityServiceDep,
) -> Response:
    key_activity_service.unlink_capability(workspace_id, ka_id, cap_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


def value_stream_response(detail: ValueStreamDetail, service: ValueStreamService) -> ValueStreamResponse:
    return ValueStreamResponse(
        **ValueStreamResponse.model_validate(detail.value_stream).model_dump(
            exclude={"key_activities", "capability_ids"}
        ),
        key_activities=[key_activity_response(activity, service) for activity in detail.key_activities],
        capability_ids=detail.capability_ids,
    )


def key_activity_response(
    activity: KeyActivity, service: ValueStreamService | KeyActivityService
) -> KeyActivityResponse:
    capability_ids = list(
        service.db.scalars(
            select(KeyActivityCapability.capability_id).where(KeyActivityCapability.key_activity_id == activity.id)
        ).all()
    )
    return KeyActivityResponse(
        **KeyActivityResponse.model_validate(activity).model_dump(exclude={"capability_ids"}),
        capability_ids=capability_ids,
    )


def capability_response(detail: CapabilityDetail) -> CapabilityResponse:
    return CapabilityResponse(
        **CapabilityResponse.model_validate(detail.capability).model_dump(
            exclude={"value_stream_ids", "key_activity_ids"}
        ),
        value_stream_ids=detail.value_stream_ids,
        key_activity_ids=detail.key_activity_ids,
    )
