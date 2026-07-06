from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    password_needs_rehash,
    refresh_expires_at,
    utc_now,
    verify_google_id_token,
    verify_password,
)
from app.models.refresh_tokens import RefreshToken
from app.models.users import User
from app.models.workspace_members import WorkspaceMember
from app.models.workspaces import Workspace
from app.schemas.auth import GoogleLoginRequest, LoginRequest, LogoutRequest, RefreshRequest, SignupRequest

INVALID_CREDENTIALS_MESSAGE = "Invalid email or password"


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str
    expires_in: int


@dataclass(frozen=True)
class SignupResult(TokenPair):
    user: User
    workspace: Workspace


@dataclass(frozen=True)
class LoginResult(TokenPair):
    user: User


@dataclass(frozen=True)
class GoogleLoginResult(LoginResult):
    is_new_user: bool


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def signup(self, payload: SignupRequest) -> SignupResult:
        user = User(
            email=payload.email,
            full_name=payload.full_name,
            auth_provider="password",
            password_hash=hash_password(payload.password),
            email_verified=False,
        )
        self.db.add(user)
        try:
            self.db.flush()
            workspace = Workspace(
                name=payload.workspace_name,
                created_by_user_id=user.id,
            )
            self.db.add(workspace)
            self.db.flush()
            membership = WorkspaceMember(
                workspace_id=workspace.id,
                user_id=user.id,
                is_admin=True,
                joined_at=utc_now(),
                created_by_user_id=user.id,
            )
            self.db.add(membership)
            tokens = self._issue_tokens(user)
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise AppError("email_taken", "An account with this email already exists", 409) from exc
        return SignupResult(user=user, workspace=workspace, **tokens.__dict__)

    def login(self, payload: LoginRequest) -> LoginResult:
        user = self._get_user_by_email(payload.email)
        if user is None:
            raise AppError("invalid_credentials", INVALID_CREDENTIALS_MESSAGE, 401)
        if user.auth_provider == "google":
            raise AppError("provider_conflict", "This account signs in with Google", 409)
        if not user.password_hash or not verify_password(payload.password, user.password_hash):
            raise AppError("invalid_credentials", INVALID_CREDENTIALS_MESSAGE, 401)
        if password_needs_rehash(user.password_hash):
            user.password_hash = hash_password(payload.password)
        user.last_login_at = utc_now()
        tokens = self._issue_tokens(user)
        self.db.commit()
        return LoginResult(user=user, **tokens.__dict__)

    def google_login(self, payload: GoogleLoginRequest) -> GoogleLoginResult:
        claims = verify_google_id_token(payload.id_token)
        google_sub = str(claims.get("sub") or "")
        email = str(claims.get("email") or "")
        if not google_sub or not email:
            raise AppError("invalid_token", "Invalid token", 401)

        user = self.db.scalar(select(User).where(User.google_sub == google_sub))
        is_new_user = False
        if user is None:
            existing = self._get_user_by_email(email)
            if existing is not None:
                raise AppError("provider_conflict", "This email is already registered with password sign-in", 409)
            user = User(
                email=email,
                full_name=claims.get("name"),
                avatar_url=claims.get("picture"),
                auth_provider="google",
                google_sub=google_sub,
                email_verified=bool(claims.get("email_verified", False)),
            )
            self.db.add(user)
            is_new_user = True
            try:
                self.db.flush()
            except IntegrityError as exc:
                self.db.rollback()
                raise AppError("provider_conflict", "This email is already registered", 409) from exc

        user.last_login_at = utc_now()
        tokens = self._issue_tokens(user)
        self.db.commit()
        return GoogleLoginResult(user=user, is_new_user=is_new_user, **tokens.__dict__)

    def refresh(self, payload: RefreshRequest) -> TokenPair:
        token_hash = hash_refresh_token(payload.refresh_token)
        refresh_token = self.db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        if refresh_token is None:
            raise AppError("invalid_token", "Invalid token", 401)
        if refresh_token.revoked_at is not None:
            self._revoke_all_user_tokens(refresh_token.user_id)
            self.db.commit()
            raise AppError("token_reused", "Refresh token reuse detected", 401)
        if refresh_token.expires_at <= utc_now():
            raise AppError("token_expired", "Refresh token has expired", 401)

        user = self.db.get(User, refresh_token.user_id)
        if user is None:
            raise AppError("invalid_token", "Invalid token", 401)
        refresh_token.revoked_at = utc_now()
        tokens = self._issue_tokens(user)
        self.db.commit()
        return tokens

    def logout(self, payload: LogoutRequest) -> None:
        token_hash = hash_refresh_token(payload.refresh_token)
        refresh_token = self.db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        if refresh_token is not None and refresh_token.revoked_at is None:
            refresh_token.revoked_at = utc_now()
            self.db.commit()

    def _issue_tokens(self, user: User) -> TokenPair:
        refresh_token = generate_refresh_token()
        self.db.add(
            RefreshToken(
                user_id=user.id,
                token_hash=hash_refresh_token(refresh_token),
                expires_at=refresh_expires_at(),
            )
        )
        return TokenPair(
            access_token=create_access_token(user.id),
            refresh_token=refresh_token,
            expires_in=settings.jwt_access_ttl,
        )

    def _get_user_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

    def _revoke_all_user_tokens(self, user_id: object) -> None:
        tokens = self.db.scalars(select(RefreshToken).where(RefreshToken.user_id == user_id))
        now = utc_now()
        for token in tokens:
            token.revoked_at = now
