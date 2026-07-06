from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import decode_access_token
from app.models.users import User
from app.services.auth_service import AuthService

bearer_scheme = HTTPBearer(auto_error=False)
BearerCredentials = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)]
DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    credentials: BearerCredentials,
    db: DbSession,
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError("invalid_token", "Missing bearer token", 401)
    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id)
    if user is None:
        raise AppError("invalid_token", "Invalid token", 401)
    return user


def get_auth_service(db: DbSession) -> Generator[AuthService, None, None]:
    yield AuthService(db)
