import uuid
from datetime import datetime

from app.schemas.base import ApiModel


class WorkspaceBase(ApiModel):
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
    id: uuid.UUID
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class WorkspaceListItem(WorkspaceResponse):
    is_admin: bool | None
    joined_at: datetime | None


class WorkspaceMemberResponse(ApiModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str | None
    email: str
    avatar_url: str | None
    is_admin: bool | None
    joined_at: datetime | None


class WorkspaceMemberUpdateRequest(ApiModel):
    is_admin: bool


class WorkspaceProvisionResponse(ApiModel):
    workspace: WorkspaceResponse
    member: WorkspaceMemberResponse


class InviteCreateRequest(ApiModel):
    invited_email: str


class InviteCreateResponse(ApiModel):
    id: uuid.UUID
    invited_email: str
    status: str | None
    expires_at: datetime | None
    created_at: datetime
    invite_token: str
    invite_url: str


class InviteListItem(ApiModel):
    id: uuid.UUID
    invited_email: str
    invited_by_user_id: uuid.UUID
    status: str | None
    expires_at: datetime | None
    accepted_at: datetime | None
    created_at: datetime
