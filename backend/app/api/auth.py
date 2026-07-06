from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.api.deps import get_auth_service, get_current_user
from app.models.users import User
from app.schemas.auth import (
    AuthTokens,
    GoogleAuthResponse,
    GoogleLoginRequest,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    RefreshRequest,
    SignupRequest,
    SignupResponse,
    UserResponse,
    WorkspaceResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(tags=["auth"])
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]

# TODO: Add shared rate limiting for auth endpoints in the hardening stage.


@router.post("/auth/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, auth_service: AuthServiceDep) -> SignupResponse:
    result = auth_service.signup(payload)
    return SignupResponse(
        user=UserResponse.model_validate(result.user),
        workspace=WorkspaceResponse.model_validate(result.workspace),
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        expires_in=result.expires_in,
    )


@router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, auth_service: AuthServiceDep) -> LoginResponse:
    result = auth_service.login(payload)
    return LoginResponse(
        user=UserResponse.model_validate(result.user),
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        expires_in=result.expires_in,
    )


@router.post("/auth/google", response_model=GoogleAuthResponse)
def google_login(
    payload: GoogleLoginRequest,
    auth_service: AuthServiceDep,
) -> GoogleAuthResponse:
    result = auth_service.google_login(payload)
    return GoogleAuthResponse(
        user=UserResponse.model_validate(result.user),
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        expires_in=result.expires_in,
        is_new_user=result.is_new_user,
    )


@router.post("/auth/refresh", response_model=AuthTokens)
def refresh(payload: RefreshRequest, auth_service: AuthServiceDep) -> AuthTokens:
    result = auth_service.refresh(payload)
    return AuthTokens(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        expires_in=result.expires_in,
    )


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: LogoutRequest,
    response: Response,
    auth_service: AuthServiceDep,
) -> Response:
    auth_service.logout(payload)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserResponse)
def me(current_user: CurrentUserDep) -> UserResponse:
    return UserResponse.model_validate(current_user)
