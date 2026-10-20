from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select

from app.api.dependencies import DbSession, get_auth_service, get_current_user
from app.core.config import settings
from app.core.rate_limit import RateLimit, rate_limit_dependency
from app.models.email import EmailOutbox
from app.models.users import User
from app.schemas.auth import (
    AuthTokens,
    GoogleAuthResponse,
    GoogleLoginRequest,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    SignupRequest,
    SignupResponse,
    UserResponse,
)
from app.services.auth_service import AuthService
from app.services.email_service import queue_verification, verify_email

router = APIRouter(tags=["auth"])
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


@router.post(
    "/auth/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(rate_limit_dependency(lambda: RateLimit("auth_signup", settings.rate_limit_signup_per_minute))),
    ],
)
def signup(payload: SignupRequest, auth_service: AuthServiceDep) -> SignupResponse:
    result = auth_service.signup(payload)
    return SignupResponse(
        user=UserResponse.model_validate(result.user),
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        expires_in=result.expires_in,
    )


@router.post(
    "/auth/login",
    response_model=LoginResponse,
    dependencies=[
        Depends(rate_limit_dependency(lambda: RateLimit("auth_login", settings.rate_limit_login_per_minute))),
    ],
)
def login(payload: LoginRequest, auth_service: AuthServiceDep) -> LoginResponse:
    result = auth_service.login(payload)
    return LoginResponse(
        user=UserResponse.model_validate(result.user),
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        expires_in=result.expires_in,
    )


@router.post(
    "/auth/google",
    response_model=GoogleAuthResponse,
    dependencies=[
        Depends(rate_limit_dependency(lambda: RateLimit("auth_google", settings.rate_limit_google_per_minute))),
    ],
)
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


@router.post(
    "/auth/refresh",
    response_model=AuthTokens,
    dependencies=[
        Depends(rate_limit_dependency(lambda: RateLimit("auth_refresh", settings.rate_limit_refresh_per_minute))),
    ],
)
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


@router.post(
    "/auth/password-reset/request",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit_dependency(lambda: RateLimit("password_reset_request", 5)))],
)
def request_password_reset(payload: PasswordResetRequest, auth_service: AuthServiceDep) -> dict[str, str]:
    auth_service.request_password_reset(payload)
    return {"status": "accepted"}


@router.post(
    "/auth/password-reset/confirm",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_dependency(lambda: RateLimit("password_reset_confirm", 10)))],
)
def confirm_password_reset(payload: PasswordResetConfirm, auth_service: AuthServiceDep) -> Response:
    auth_service.reset_password(payload)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserResponse)
def me(current_user: CurrentUserDep) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post(
    "/auth/verify-email/{token}",
    response_model=UserResponse,
    dependencies=[Depends(rate_limit_dependency(lambda: RateLimit("email_verify", 10)))],
)
def confirm_email(token: str, db: DbSession) -> UserResponse:
    return UserResponse.model_validate(verify_email(db, token))


@router.post(
    "/auth/verification/resend",
    status_code=202,
    dependencies=[Depends(rate_limit_dependency(lambda: RateLimit("email_resend", 5)))],
)
def resend_email(user: CurrentUserDep, db: DbSession) -> dict[str, str]:
    db.execute(select(User).where(User.id == user.id).with_for_update())
    db.refresh(user)
    if user.email_verified:
        return {"status": "verified"}
    queue_verification(db, user)
    db.commit()
    return {"status": "queued"}


@router.get("/auth/verification/status")
def email_status(user: CurrentUserDep, db: DbSession) -> dict[str, str]:
    message = db.scalar(
        select(EmailOutbox)
        .where(EmailOutbox.user_id == user.id, EmailOutbox.kind == "verification")
        .order_by(EmailOutbox.created_at.desc())
        .limit(1)
    )
    return {
        "status": "verified" if user.email_verified else message.status if message else "missing",
        "deliveryProvider": message.delivery_provider if message else "unknown",
        "currentProvider": settings.email_provider,
        "deliveryError": message.last_error_code or "" if message else "",
    }
