from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, cast

import jwt
import sqlalchemy as sa
from app.core.config import settings
from app.core.errors import AppError
from app.core.security import hash_password, hash_refresh_token
from fastapi.testclient import TestClient
from sqlalchemy import text


def signup_payload(email: str = "alex@example.com") -> dict[str, str]:
    return {
        "email": email,
        "password": "correct-horse",
        "fullName": "Alex Wright",
        "workspaceName": "Acme Strategy",
    }


def assert_error(response: Any, status_code: int, code: str) -> None:
    assert response.status_code == status_code
    body = response.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == code
    assert "message" in body["error"]
    assert "details" in body["error"]


def create_password_user(
    engine: sa.Engine,
    email: str = "user@example.com",
    password: str = "correct-horse",
) -> uuid.UUID:
    with engine.begin() as conn:
        return cast(
            uuid.UUID,
            conn.scalar(
                text("""
                    INSERT INTO users (email, full_name, auth_provider, password_hash)
                    VALUES (:email, 'Existing User', 'password', :password_hash)
                    RETURNING id
                    """),
                {"email": email, "password_hash": hash_password(password)},
            ),
        )


def create_google_user(
    engine: sa.Engine,
    email: str = "google@example.com",
    google_sub: str = "google-sub",
) -> uuid.UUID:
    with engine.begin() as conn:
        return cast(
            uuid.UUID,
            conn.scalar(
                text("""
                    INSERT INTO users (email, full_name, auth_provider, google_sub, email_verified)
                    VALUES (:email, 'Google User', 'google', :google_sub, true)
                    RETURNING id
                    """),
                {"email": email, "google_sub": google_sub},
            ),
        )


def test_signup_happy_path_creates_user_workspace_member_and_tokens(client: TestClient, engine: sa.Engine) -> None:
    response = client.post("/auth/signup", json=signup_payload())

    assert response.status_code == 201
    body = response.json()
    assert {"user", "workspace", "accessToken", "refreshToken", "expiresIn"} <= set(body)
    assert "fullName" in body["user"]
    assert "authProvider" in body["user"]
    assert "createdByUserId" in body["workspace"]
    assert "password_hash" not in response.text
    assert "google_sub" not in response.text

    user_id = body["user"]["id"]
    workspace_id = body["workspace"]["id"]
    with engine.begin() as conn:
        counts = conn.execute(text("""
                SELECT
                  (SELECT count(*) FROM users) AS users_count,
                  (SELECT count(*) FROM workspaces) AS workspaces_count,
                  (SELECT count(*) FROM workspace_members) AS members_count
                """)).one()
        member = conn.execute(
            text("SELECT is_admin FROM workspace_members WHERE user_id = :user_id"), {"user_id": user_id}
        ).one()
        workspace_creator = conn.scalar(
            text("SELECT created_by_user_id FROM workspaces WHERE id = :id"), {"id": workspace_id}
        )
        stored_hash = conn.scalar(text("SELECT token_hash FROM refresh_tokens LIMIT 1"))

    assert counts == (1, 1, 1)
    assert member.is_admin is True
    assert str(workspace_creator) == user_id
    assert stored_hash != body["refreshToken"]
    assert stored_hash == hash_refresh_token(body["refreshToken"])

    me = client.get("/me", headers={"Authorization": f"Bearer {body['accessToken']}"})
    assert me.status_code == 200
    assert me.json()["id"] == user_id


def test_signup_duplicate_email_rolls_back_case_insensitively(client: TestClient, engine: sa.Engine) -> None:
    assert client.post("/auth/signup", json=signup_payload("alex@example.com")).status_code == 201
    response = client.post("/auth/signup", json=signup_payload("ALEX@example.com"))

    assert_error(response, 409, "email_taken")
    with engine.begin() as conn:
        assert conn.scalar(text("SELECT count(*) FROM users")) == 1
        assert conn.scalar(text("SELECT count(*) FROM workspaces")) == 1
        assert conn.scalar(text("SELECT count(*) FROM workspace_members")) == 1


def test_login_happy_path_bad_password_and_unknown_email(client: TestClient, engine: sa.Engine) -> None:
    create_password_user(engine, "user@example.com", "correct-horse")

    ok = client.post("/auth/login", json={"email": "user@example.com", "password": "correct-horse"})
    assert ok.status_code == 200
    assert {"user", "accessToken", "refreshToken", "expiresIn"} <= set(ok.json())
    assert "password_hash" not in ok.text

    bad_password = client.post("/auth/login", json={"email": "user@example.com", "password": "wrong-password"})
    unknown_email = client.post("/auth/login", json={"email": "missing@example.com", "password": "wrong-password"})
    assert bad_password.status_code == 401
    assert unknown_email.status_code == 401
    assert bad_password.content == unknown_email.content


def test_login_google_provider_conflict(client: TestClient, engine: sa.Engine) -> None:
    create_google_user(engine)

    response = client.post("/auth/login", json={"email": "google@example.com", "password": "anything"})

    assert_error(response, 409, "provider_conflict")


def test_google_sign_in_new_user_without_workspace(client: TestClient, engine: sa.Engine, monkeypatch: Any) -> None:
    monkeypatch.setattr(
        "app.services.auth_service.verify_google_id_token",
        lambda _: {
            "sub": "new-google-sub",
            "email": "new-google@example.com",
            "name": "New Google",
            "picture": "https://example.com/avatar.png",
            "email_verified": True,
            "aud": settings.google_oauth_client_id,
        },
    )

    response = client.post("/auth/google", json={"idToken": "valid-google-token"})

    assert response.status_code == 200
    body = response.json()
    assert body["isNewUser"] is True
    assert body["user"]["authProvider"] == "google"
    assert "google_sub" not in response.text
    with engine.begin() as conn:
        assert conn.scalar(text("SELECT count(*) FROM users")) == 1
        assert conn.scalar(text("SELECT count(*) FROM workspaces")) == 0


def test_google_sign_in_existing_sub_and_password_email_collision(
    client: TestClient,
    engine: sa.Engine,
    monkeypatch: Any,
) -> None:
    create_google_user(engine, "existing-google@example.com", "existing-sub")
    monkeypatch.setattr(
        "app.services.auth_service.verify_google_id_token",
        lambda _: {"sub": "existing-sub", "email": "changed@example.com", "aud": settings.google_oauth_client_id},
    )

    existing = client.post("/auth/google", json={"idToken": "valid-google-token"})
    assert existing.status_code == 200
    assert existing.json()["isNewUser"] is False

    create_password_user(engine, "collision@example.com")
    monkeypatch.setattr(
        "app.services.auth_service.verify_google_id_token",
        lambda _: {"sub": "new-sub", "email": "collision@example.com", "aud": settings.google_oauth_client_id},
    )

    collision = client.post("/auth/google", json={"idToken": "valid-google-token"})
    assert_error(collision, 409, "provider_conflict")
    with engine.begin() as conn:
        assert conn.scalar(text("SELECT count(*) FROM users")) == 2


def test_google_sign_in_invalid_token(client: TestClient, monkeypatch: Any) -> None:
    def reject(_: str) -> dict[str, Any]:
        raise AppError("invalid_token", "Invalid token", 401)

    monkeypatch.setattr("app.services.auth_service.verify_google_id_token", reject)

    response = client.post("/auth/google", json={"idToken": "invalid-google-token"})

    assert_error(response, 401, "invalid_token")


def test_sensitive_user_fields_never_appear_in_response_bodies(client: TestClient, engine: sa.Engine) -> None:
    create_google_user(engine, "google-only@example.com", "google-sensitive-sub")
    signup = client.post("/auth/signup", json=signup_payload("sensitive@example.com"))
    login = client.post("/auth/login", json={"email": "sensitive@example.com", "password": "correct-horse"})
    provider_conflict = client.post("/auth/login", json={"email": "google-only@example.com", "password": "anything"})
    me = client.get("/me", headers={"Authorization": f"Bearer {signup.json()['accessToken']}"})

    for response in (signup, login, provider_conflict, me):
        assert "password_hash" not in response.text
        assert "google_sub" not in response.text


def test_refresh_rotation_and_reuse_detection(client: TestClient, engine: sa.Engine) -> None:
    assert client.post("/auth/signup", json=signup_payload()).status_code == 201
    login = client.post("/auth/login", json={"email": "alex@example.com", "password": "correct-horse"}).json()
    old_refresh = login["refreshToken"]

    rotated = client.post("/auth/refresh", json={"refreshToken": old_refresh})
    assert rotated.status_code == 200
    new_refresh = rotated.json()["refreshToken"]
    assert new_refresh != old_refresh
    assert client.get("/me", headers={"Authorization": f"Bearer {rotated.json()['accessToken']}"}).status_code == 200

    reused = client.post("/auth/refresh", json={"refreshToken": old_refresh})
    assert_error(reused, 401, "token_reused")
    with engine.begin() as conn:
        active_count = conn.scalar(text("SELECT count(*) FROM refresh_tokens WHERE revoked_at IS NULL"))
    assert active_count == 0


def test_expired_refresh_token(client: TestClient, engine: sa.Engine) -> None:
    user_id = create_password_user(engine)
    refresh = "expired-refresh"
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
                VALUES (:user_id, :token_hash, :expires_at)
                """),
            {
                "user_id": user_id,
                "token_hash": hash_refresh_token(refresh),
                "expires_at": datetime.now(UTC) - timedelta(seconds=1),
            },
        )

    response = client.post("/auth/refresh", json={"refreshToken": refresh})

    assert_error(response, 401, "token_expired")


def test_logout_is_idempotent(client: TestClient, engine: sa.Engine) -> None:
    create_password_user(engine, "logout@example.com", "correct-horse")
    login = client.post("/auth/login", json={"email": "logout@example.com", "password": "correct-horse"}).json()

    first = client.post("/auth/logout", json={"refreshToken": login["refreshToken"]})
    second = client.post("/auth/logout", json={"refreshToken": login["refreshToken"]})

    assert first.status_code == 204
    assert second.status_code == 204
    with engine.begin() as conn:
        assert conn.scalar(text("SELECT count(*) FROM refresh_tokens WHERE revoked_at IS NOT NULL")) == 1


def test_me_valid_missing_expired_and_garbage_tokens(client: TestClient) -> None:
    signup = client.post("/auth/signup", json=signup_payload()).json()

    assert client.get("/me", headers={"Authorization": f"Bearer {signup['accessToken']}"}).status_code == 200
    assert_error(client.get("/me"), 401, "invalid_token")
    assert_error(client.get("/me", headers={"Authorization": "Bearer garbage"}), 401, "invalid_token")

    expired = jwt.encode(
        {
            "sub": signup["user"]["id"],
            "iat": int((datetime.now(UTC) - timedelta(hours=1)).timestamp()),
            "exp": int((datetime.now(UTC) - timedelta(seconds=1)).timestamp()),
        },
        settings.require_jwt_secret(),
        algorithm="HS256",
    )
    assert_error(client.get("/me", headers={"Authorization": f"Bearer {expired}"}), 401, "token_expired")


def test_validation_error_envelope_has_field_details(client: TestClient) -> None:
    response = client.post("/auth/signup", json={"email": "alex@example.com"})

    assert_error(response, 422, "validation_error")
    fields = response.json()["error"]["details"]["fields"]
    assert any("workspaceName" in str(field["loc"]) for field in fields)
