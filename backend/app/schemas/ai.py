import uuid
from datetime import datetime
from typing import Any, Literal

from app.schemas.architecture_core import StrictApiModel
from app.schemas.base import ApiModel

AiResourceType = Literal["strategic_objective", "lean_business_case", "discovery"]


class AiQuestion(ApiModel):
    id: str
    prompt: str
    helper: str
    input_type: str
    required: bool
    max_length: int
    fields: list[str]


class AiQuestionSetResponse(ApiModel):
    resource_type: str
    version: int
    questions: list[AiQuestion]


class AiGenerateRequest(StrictApiModel):
    resource_type: AiResourceType
    answers: dict[str, str]
    parent_id: uuid.UUID | None = None


class AiGenerateResponse(ApiModel):
    suggestion_id: uuid.UUID
    resource_type: str
    fields: dict[str, Any]
    generated_at: datetime
