import uuid
from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AppError
from app.models.ai_suggestions import AiSuggestion
from app.models.ai_usage import AiUsage
from app.models.users import User
from app.schemas.ai import AiGenerateRequest
from app.services import ai_provider, ai_questions
from app.services.ai_context import assemble_context


class AiService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_questions(self, resource_type: str) -> dict[str, Any]:
        if resource_type not in ai_questions.RESOURCE_TYPES:
            raise AppError("invalid_resource_type", "Unknown resource type", 400)
        return ai_questions.question_set(resource_type)

    def generate(
        self,
        workspace_id: uuid.UUID,
        user: User,
        payload: AiGenerateRequest,
    ) -> AiSuggestion:
        resource_type = payload.resource_type
        self._validate_answers(payload.answers)

        context = assemble_context(self.db, workspace_id, resource_type, payload.parent_id)

        try:
            result = ai_provider.generate_fields(resource_type, payload.answers, context)
        except AppError as exc:
            self._record_error_usage(workspace_id, resource_type, user.id, exc.code)
            raise

        suggestion = self._persist(workspace_id, user.id, payload, result)
        return suggestion

    def _validate_answers(self, answers: dict[str, str]) -> None:
        for question_id, answer in answers.items():
            if not isinstance(answer, str):
                raise AppError("invalid_answer", f"Answer for '{question_id}' must be text", 400)
            if len(answer) > ai_questions.MAX_ANSWER_LENGTH:
                raise AppError(
                    "answer_too_long",
                    f"Answer for '{question_id}' exceeds {ai_questions.MAX_ANSWER_LENGTH} characters",
                    400,
                    {"questionId": question_id, "maxLength": ai_questions.MAX_ANSWER_LENGTH},
                )

    def _persist(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        payload: AiGenerateRequest,
        result: ai_provider.GenerationResult,
    ) -> AiSuggestion:
        # Discard any existing pending suggestion for this (workspace, resource_type),
        # then insert the new suggestion + usage — all in one committed transaction.
        self.db.execute(
            delete(AiSuggestion).where(
                AiSuggestion.workspace_id == workspace_id,
                AiSuggestion.resource_type == payload.resource_type,
                AiSuggestion.status == "pending",
            )
        )
        suggestion = AiSuggestion(
            workspace_id=workspace_id,
            resource_type=payload.resource_type,
            question_answers={"version": ai_questions.QUESTION_SET_VERSION, "answers": payload.answers},
            suggested_fields=result.fields,
            status="pending",
            created_by_user_id=user_id,
        )
        self.db.add(suggestion)
        self.db.flush()

        usage = AiUsage(
            workspace_id=workspace_id,
            ai_suggestion_id=suggestion.id,
            resource_type=payload.resource_type,
            model=result.model,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            input_price_per_mtok=result.input_price_per_mtok,
            output_price_per_mtok=result.output_price_per_mtok,
            cost_usd=result.cost_usd,
            status="success",
            created_by_user_id=user_id,
        )
        self.db.add(usage)
        self.db.commit()
        self.db.refresh(suggestion)
        return suggestion

    def _record_error_usage(
        self,
        workspace_id: uuid.UUID,
        resource_type: str,
        user_id: uuid.UUID,
        error_code: str,
    ) -> None:
        usage = AiUsage(
            workspace_id=workspace_id,
            resource_type=resource_type,
            model=settings.ai_model,
            status="error",
            error_code=error_code,
            created_by_user_id=user_id,
        )
        self.db.add(usage)
        self.db.commit()
