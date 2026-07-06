from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, cast

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, VerifyMismatchError
from google.auth.transport.requests import Request
from google.oauth2 import id_token

from app.core.config import settings
from app.core.errors import AppError

ALGORITHM = "HS256"

password_hasher = PasswordHasher()


def utc_now() -> datetime:
    return datetime.now(UTC)


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    return password_hasher.check_needs_rehash(password_hash)


def create_access_token(user_id: uuid.UUID) -> str:
    now = utc_now()
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=settings.jwt_access_ttl)).timestamp()),
    }
    return jwt.encode(payload, settings.require_jwt_secret(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> uuid.UUID:
    try:
        payload = jwt.decode(token, settings.require_jwt_secret(), algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise AppError("token_expired", "Token has expired", 401) from exc
    except jwt.PyJWTError as exc:
        raise AppError("invalid_token", "Invalid token", 401) from exc

    sub = payload.get("sub")
    if not isinstance(sub, str):
        raise AppError("invalid_token", "Invalid token", 401)
    try:
        return uuid.UUID(sub)
    except ValueError as exc:
        raise AppError("invalid_token", "Invalid token", 401) from exc


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(refresh_token: str) -> str:
    return hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()


def refresh_expires_at() -> datetime:
    return utc_now() + timedelta(seconds=settings.jwt_refresh_ttl)


def verify_google_id_token(raw_id_token: str) -> dict[str, Any]:
    if not settings.google_oauth_client_id:
        raise AppError("invalid_token", "Google sign-in is not configured", 401)
    try:
        claims = cast(
            dict[str, Any],
            id_token.verify_oauth2_token(raw_id_token, Request(), settings.google_oauth_client_id),  # type: ignore[no-untyped-call]
        )
    except ValueError as exc:
        raise AppError("invalid_token", "Invalid token", 401) from exc
    if claims.get("aud") != settings.google_oauth_client_id:
        raise AppError("invalid_token", "Invalid token", 401)
    return claims
