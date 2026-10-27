import uuid
from datetime import datetime

from pydantic import field_validator

from app.schemas.base import ApiModel


def check_email(value: str) -> str:
    if "@" not in value or "\n" in value or "\r" in value:
        raise ValueError("Invalid email address")
    return value.strip()


def check_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters")
    return value


class SignupRequest(ApiModel):
    email: str
    password: str
    full_name: str

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Full name is required")
        return value.strip()

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return check_email(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return check_password(value)


class LoginRequest(ApiModel):
    email: str
    password: str


class PasswordResetRequest(ApiModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return check_email(value)


class PasswordResetConfirm(ApiModel):
    token: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return check_password(value)


class GoogleLoginRequest(ApiModel):
    id_token: str


class RefreshRequest(ApiModel):
    refresh_token: str


class LogoutRequest(ApiModel):
    refresh_token: str


class UserResponse(ApiModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    avatar_url: str | None
    auth_provider: str
    email_verified: bool | None
    last_login_at: datetime | None
    created_at: datetime


class WorkspaceResponse(ApiModel):
    id: uuid.UUID
    name: str
    created_by_user_id: uuid.UUID
    created_at: datetime


class AuthTokens(ApiModel):
    access_token: str
    refresh_token: str
    expires_in: int


class SignupResponse(AuthTokens):
    user: UserResponse


class LoginResponse(AuthTokens):
    user: UserResponse


class GoogleAuthResponse(LoginResponse):
    is_new_user: bool
