import uuid
from datetime import datetime

from pydantic import ConfigDict, Field, field_validator
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
    department_head: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    location: str | None = None
    headcount: int | None = Field(default=None, ge=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str:
        if value is None or not value.strip():
            raise ValueError("Department name is required")
        return value.strip()

    @field_validator("contact_email")
    @classmethod
    def validate_contact(cls, value: str | None) -> str | None:
        if value and ("@" not in value or "\n" in value or "\r" in value):
            raise ValueError("Invalid contact email")
        return value or None

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
    department_head: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    location: str | None = None
    headcount: int | None = Field(default=None, ge=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str:
        if value is None or not value.strip():
            raise ValueError("Department name is required")
        return value.strip()

    @field_validator("contact_email")
    @classmethod
    def validate_contact(cls, value: str | None) -> str | None:
        if value and ("@" not in value or "\n" in value or "\r" in value):
            raise ValueError("Invalid contact email")
        return value or None

    parent_department_id: uuid.UUID | None = None


class DepartmentResponse(ApiModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    parent_department_id: uuid.UUID | None
    name: str
    description: str | None
    business_architecture_id: uuid.UUID
    department_head: str | None
    contact_name: str | None
    contact_email: str | None
    location: str | None
    headcount: int | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
