"""Assemble the lean, linked-record context passed to the AI provider.

Kept deliberately separate from the provider call. Only the directly linked parent
record is loaded — never a whole-workspace dump:

- strategic_objective : no parent, empty context
- lean_business_case  : the parent strategic objective's content fields
- discovery           : the parent lean business case's content fields

Parent lookups are scoped to the workspace, so a missing or cross-workspace parent
returns 404 (not 403), consistent with the rest of the API.
"""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.lean_business_cases import LeanBusinessCase
from app.models.strategic_objectives import StrategicObjective
from app.schemas.business_cases import LeanBusinessCaseBase
from app.schemas.strategy import StrategicObjectiveBase


def assemble_context(
    db: Session,
    workspace_id: uuid.UUID,
    resource_type: str,
    parent_id: uuid.UUID | None,
) -> dict[str, Any]:
    if resource_type == "strategic_objective":
        return {}

    if resource_type == "lean_business_case":
        if parent_id is None:
            raise AppError("parent_required", "parentId (the strategic objective) is required", 400)
        objective = db.scalar(
            select(StrategicObjective).where(
                StrategicObjective.id == parent_id,
                StrategicObjective.workspace_id == workspace_id,
            )
        )
        if objective is None:
            raise AppError("not_found", "Resource not found", 404)
        return {
            "parentStrategicObjective": StrategicObjectiveBase.model_validate(objective).model_dump(
                mode="json", by_alias=True, exclude_none=True
            )
        }

    if resource_type == "discovery":
        if parent_id is None:
            raise AppError("parent_required", "parentId (the lean business case) is required", 400)
        case = db.scalar(
            select(LeanBusinessCase).where(
                LeanBusinessCase.id == parent_id,
                LeanBusinessCase.workspace_id == workspace_id,
            )
        )
        if case is None:
            raise AppError("not_found", "Resource not found", 404)
        return {
            "parentLeanBusinessCase": LeanBusinessCaseBase.model_validate(case).model_dump(
                mode="json", by_alias=True, exclude_none=True
            )
        }

    raise AppError("invalid_resource_type", "Unknown resource type", 400)
