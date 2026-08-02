import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import get_ai_service, get_current_user, get_workspace_member
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.schemas.ai import AiGenerateRequest, AiGenerateResponse, AiQuestionSetResponse
from app.services.ai_service import AiService

router = APIRouter(tags=["ai"])

CurrentUserDep = Annotated[User, Depends(get_current_user)]
WorkspaceMemberDep = Annotated[WorkspaceMember, Depends(get_workspace_member)]
AiServiceDep = Annotated[AiService, Depends(get_ai_service)]


@router.get(
    "/workspaces/{workspace_id}/ai/questions/{resource_type}",
    response_model=AiQuestionSetResponse,
)
def get_ai_questions(
    workspace_id: uuid.UUID,
    resource_type: str,
    _: WorkspaceMemberDep,
    ai_service: AiServiceDep,
) -> AiQuestionSetResponse:
    return AiQuestionSetResponse.model_validate(ai_service.get_questions(resource_type))


@router.post(
    "/workspaces/{workspace_id}/ai/generate",
    response_model=AiGenerateResponse,
)
def generate_ai_suggestion(
    workspace_id: uuid.UUID,
    payload: AiGenerateRequest,
    current_user: CurrentUserDep,
    _: WorkspaceMemberDep,
    ai_service: AiServiceDep,
) -> AiGenerateResponse:
    suggestion = ai_service.generate(workspace_id, current_user, payload)
    return AiGenerateResponse(
        suggestion_id=suggestion.id,
        resource_type=suggestion.resource_type,
        fields=suggestion.suggested_fields,
        generated_at=suggestion.created_at,
    )
