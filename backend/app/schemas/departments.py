import uuid
from datetime import datetime

from pydantic import ConfigDict
from pydantic.alias_generators import to_camel

from app.schemas.base import ApiModel


class DepartmentCreateRequest(ApiModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    name: str
    description: str | None = None
    parent_department_id: uuid.UUID | None = None


class DepartmentUpdateRequest(ApiModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )

    name: str | None = None
    description: str | None = None
    parent_department_id: uuid.UUID | None = None


class DepartmentResponse(ApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    parent_department_id: uuid.UUID | None
    name: str
    description: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
