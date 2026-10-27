import uuid
from datetime import datetime

from pydantic import field_validator

from app.schemas.base import ApiModel


class WorkspaceBase(ApiModel):
    @field_validator("name", check_fields=False)
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Workspace name is required")
        return value.strip()

    name: str
    legal_name: str | None = None
    business_unit: str | None = None
    description: str | None = None
    industry: str | None = None
    operating_model: str | None = None
    business_model: str | None = None
    primary_customers: str | None = None
    primary_products: str | None = None
    strategic_context: str | None = None
    company_size: str | None = None
    headquarters_region: str | None = None
    website: str | None = None
    logo_url: str | None = None
    annual_revenue: float | None = None


class WorkspaceCreateRequest(WorkspaceBase):
    pass


class WorkspaceUpdateRequest(ApiModel):
    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str:
        if value is None or not value.strip():
            raise ValueError("Workspace name is required")
        return value.strip()

    name: str | None = None
    legal_name: str | None = None
    business_unit: str | None = None
    description: str | None = None
    industry: str | None = None
    operating_model: str | None = None
    business_model: str | None = None
    primary_customers: str | None = None
    primary_products: str | None = None
    strategic_context: str | None = None
    company_size: str | None = None
    headquarters_region: str | None = None
    website: str | None = None
    logo_url: str | None = None
    annual_revenue: float | None = None


class WorkspaceResponse(WorkspaceBase):
    setup_completed_at: datetime | None
    owner_user_id: uuid.UUID | None
    id: uuid.UUID
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class WorkspaceListItem(WorkspaceResponse):
    role: str
    is_admin: bool | None
    joined_at: datetime | None


class WorkspaceMemberResponse(ApiModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str | None
    email: str
    avatar_url: str | None
    role: str
    is_admin: bool | None
    joined_at: datetime | None


class WorkspaceMemberUpdateRequest(ApiModel):
    is_admin: bool


class WorkspaceProvisionResponse(ApiModel):
    workspace: WorkspaceResponse
    member: WorkspaceMemberResponse


class InviteCreateRequest(ApiModel):
    invited_email: str

    @field_validator("invited_email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if "@" not in value or "\n" in value or "\r" in value:
            raise ValueError("Invalid email address")
        return value.strip()


class InviteCreateResponse(ApiModel):
    id: uuid.UUID
    invited_email: str
    status: str | None
    expires_at: datetime | None
    created_at: datetime
    invite_token: str
    invite_url: str


class InviteListItem(ApiModel):
    delivery_status: str = "missing"
    id: uuid.UUID
    invited_email: str
    invited_by_user_id: uuid.UUID
    status: str | None
    expires_at: datetime | None
    accepted_at: datetime | None
    created_at: datetime
