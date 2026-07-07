import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response, status

from app.api.deps import get_business_case_service, get_current_user, get_workspace_member
from app.core.pagination import Page, PaginationParams, paginate_items
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.schemas.business_cases import (
    LeanBusinessCaseCreateRequest,
    LeanBusinessCaseLinkResponse,
    LeanBusinessCaseResponse,
    LeanBusinessCaseStatusRequest,
    LeanBusinessCaseUpdateRequest,
)
from app.services.business_case_service import BusinessCaseService, LeanBusinessCaseDetail

router = APIRouter(tags=["business-cases"])

CurrentUserDep = Annotated[User, Depends(get_current_user)]
WorkspaceMemberDep = Annotated[WorkspaceMember, Depends(get_workspace_member)]
BusinessCaseServiceDep = Annotated[BusinessCaseService, Depends(get_business_case_service)]
StatusFilter = Annotated[Literal["draft", "active", "completed", "archived"] | None, Query()]


@router.post(
    "/workspaces/{workspace_id}/strategic-objectives/{objective_id}/lean-business-cases",
    response_model=LeanBusinessCaseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_case(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    payload: LeanBusinessCaseCreateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    business_case_service: BusinessCaseServiceDep,
) -> LeanBusinessCaseResponse:
    case = business_case_service.create(workspace_id, objective_id, current_user, payload)
    return case_response(business_case_service.get_detail(workspace_id, case.id))


@router.get(
    "/workspaces/{workspace_id}/strategic-objectives/{objective_id}/lean-business-cases",
    response_model=Page[LeanBusinessCaseResponse],
)
def list_cases(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    pagination: Annotated[PaginationParams, Depends()],
    _: WorkspaceMemberDep,
    business_case_service: BusinessCaseServiceDep,
    status: StatusFilter = None,
) -> Page[LeanBusinessCaseResponse]:
    return paginate_items(
        business_case_service.list_for_objective(workspace_id, objective_id, status),
        pagination,
        lambda case: case_response(business_case_service.get_detail(workspace_id, case.id)),
    )


@router.get("/workspaces/{workspace_id}/lean-business-cases/{case_id}", response_model=LeanBusinessCaseResponse)
def get_case(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    _: WorkspaceMemberDep,
    business_case_service: BusinessCaseServiceDep,
) -> LeanBusinessCaseResponse:
    return case_response(business_case_service.get_detail(workspace_id, case_id))


@router.patch("/workspaces/{workspace_id}/lean-business-cases/{case_id}", response_model=LeanBusinessCaseResponse)
def update_case(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    payload: LeanBusinessCaseUpdateRequest,
    _: WorkspaceMemberDep,
    business_case_service: BusinessCaseServiceDep,
) -> LeanBusinessCaseResponse:
    case = business_case_service.update_fields(workspace_id, case_id, payload)
    return case_response(business_case_service.get_detail(workspace_id, case.id))


@router.patch(
    "/workspaces/{workspace_id}/lean-business-cases/{case_id}/status",
    response_model=LeanBusinessCaseResponse,
)
def update_case_status(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    payload: LeanBusinessCaseStatusRequest,
    _: WorkspaceMemberDep,
    business_case_service: BusinessCaseServiceDep,
) -> LeanBusinessCaseResponse:
    case = business_case_service.update_status(workspace_id, case_id, payload.status)
    return case_response(business_case_service.get_detail(workspace_id, case.id))


@router.post(
    "/workspaces/{workspace_id}/lean-business-cases/{case_id}/value-streams/{vs_id}",
    response_model=LeanBusinessCaseLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
def link_case_value_stream(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    vs_id: uuid.UUID,
    _: WorkspaceMemberDep,
    business_case_service: BusinessCaseServiceDep,
) -> LeanBusinessCaseLinkResponse:
    return LeanBusinessCaseLinkResponse.model_validate(
        business_case_service.link_value_stream(workspace_id, case_id, vs_id)
    )


@router.delete(
    "/workspaces/{workspace_id}/lean-business-cases/{case_id}/value-streams/{vs_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unlink_case_value_stream(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    vs_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    business_case_service: BusinessCaseServiceDep,
) -> Response:
    business_case_service.unlink_value_stream(workspace_id, case_id, vs_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/lean-business-cases/{case_id}/key-activities/{ka_id}",
    response_model=LeanBusinessCaseLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
def link_case_key_activity(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    ka_id: uuid.UUID,
    _: WorkspaceMemberDep,
    business_case_service: BusinessCaseServiceDep,
) -> LeanBusinessCaseLinkResponse:
    return LeanBusinessCaseLinkResponse.model_validate(
        business_case_service.link_key_activity(workspace_id, case_id, ka_id)
    )


@router.delete(
    "/workspaces/{workspace_id}/lean-business-cases/{case_id}/key-activities/{ka_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unlink_case_key_activity(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    ka_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    business_case_service: BusinessCaseServiceDep,
) -> Response:
    business_case_service.unlink_key_activity(workspace_id, case_id, ka_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/workspaces/{workspace_id}/lean-business-cases/{case_id}/capabilities/{cap_id}",
    response_model=LeanBusinessCaseLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
def link_case_capability(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    cap_id: uuid.UUID,
    _: WorkspaceMemberDep,
    business_case_service: BusinessCaseServiceDep,
) -> LeanBusinessCaseLinkResponse:
    return LeanBusinessCaseLinkResponse.model_validate(
        business_case_service.link_capability(workspace_id, case_id, cap_id)
    )


@router.delete(
    "/workspaces/{workspace_id}/lean-business-cases/{case_id}/capabilities/{cap_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unlink_case_capability(
    workspace_id: uuid.UUID,
    case_id: uuid.UUID,
    cap_id: uuid.UUID,
    response: Response,
    _: WorkspaceMemberDep,
    business_case_service: BusinessCaseServiceDep,
) -> Response:
    business_case_service.unlink_capability(workspace_id, case_id, cap_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


def case_response(detail: LeanBusinessCaseDetail) -> LeanBusinessCaseResponse:
    return LeanBusinessCaseResponse(
        **LeanBusinessCaseResponse.model_validate(detail.case).model_dump(
            exclude={"owner_full_name", "owner_email", "value_stream_ids", "key_activity_ids", "capability_ids"}
        ),
        owner_full_name=detail.owner.full_name,
        owner_email=detail.owner.email,
        value_stream_ids=detail.value_stream_ids,
        key_activity_ids=detail.key_activity_ids,
        capability_ids=detail.capability_ids,
    )
