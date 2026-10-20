import re
from datetime import timedelta

from app.core.db import SessionLocal
from app.core.security import utc_now
from app.models.email import EmailOutbox, PasswordResetToken
from sqlalchemy import select

from test_auth import assert_error, create_google_user, create_password_user


def request_reset(client, email):
    response = client.post("/auth/password-reset/request", json={"email": email})
    assert response.status_code == 202, response.text
    assert response.json() == {"status": "accepted"}


def outbox(email, kind):
    with SessionLocal() as db:
        return list(
            db.scalars(
                select(EmailOutbox)
                .where(EmailOutbox.recipient == email, EmailOutbox.kind == kind)
                .order_by(EmailOutbox.created_at)
            )
        )


def reset_token(email):
    match = re.search(r"reset-password\?token=([A-Za-z0-9_-]+)", outbox(email, "password_reset")[-1].body)
    assert match
    return match.group(1)


def age_reset_tokens(**changes):
    with SessionLocal() as db:
        for record in db.scalars(select(PasswordResetToken)):
            for name, value in changes.items():
                setattr(record, name, value)
        db.commit()


def confirm(client, token, password="new-password"):
    return client.post("/auth/password-reset/confirm", json={"token": token, "password": password})


def login(client, email, password):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_request_response_is_identical_for_unknown_known_and_cooldown(client, engine):
    create_password_user(engine, "user@example.com")
    request_reset(client, "nobody@example.com")
    assert outbox("nobody@example.com", "password_reset") == []
    request_reset(client, "USER@example.com")
    request_reset(client, "user@example.com")
    assert len(outbox("user@example.com", "password_reset")) == 1
    assert_error(client.post("/auth/password-reset/request", json={"email": "not-an-email"}), 422, "validation_error")


def test_reset_changes_password_revokes_sessions_and_notifies(client, engine):
    create_password_user(engine, "user@example.com", "old-password")
    session = login(client, "user@example.com", "old-password").json()
    request_reset(client, "user@example.com")
    token = reset_token("user@example.com")

    short = client.post("/auth/password-reset/confirm", json={"token": token, "password": "short"})
    assert_error(short, 422, "validation_error")
    response = client.post("/auth/password-reset/confirm", json={"token": token, "password": "new-password"})
    assert response.status_code == 204, response.text

    assert_error(login(client, "user@example.com", "old-password"), 401, "invalid_credentials")
    assert login(client, "user@example.com", "new-password").status_code == 200
    assert client.post("/auth/refresh", json={"refreshToken": session["refreshToken"]}).status_code == 401
    assert len(outbox("user@example.com", "password_changed")) == 1
    used = client.post("/auth/password-reset/confirm", json={"token": token, "password": "another-password"})
    assert_error(used, 409, "token_used")


def test_invalid_expired_and_superseded_links(client, engine):
    create_password_user(engine, "user@example.com", "old-password")
    invalid = client.post("/auth/password-reset/confirm", json={"token": "nope", "password": "new-password"})
    assert_error(invalid, 400, "invalid_token")

    request_reset(client, "user@example.com")
    first = reset_token("user@example.com")
    age_reset_tokens(expires_at=utc_now() - timedelta(seconds=1), created_at=utc_now() - timedelta(minutes=2))
    expired = client.post("/auth/password-reset/confirm", json={"token": first, "password": "new-password"})
    assert_error(expired, 410, "token_expired")

    age_reset_tokens(expires_at=utc_now() + timedelta(hours=1), created_at=utc_now() - timedelta(minutes=2))
    request_reset(client, "user@example.com")
    second = reset_token("user@example.com")
    assert second != first
    assert confirm(client, second).status_code == 204
    superseded = client.post("/auth/password-reset/confirm", json={"token": first, "password": "other-password"})
    assert_error(superseded, 409, "token_used")
    assert login(client, "user@example.com", "new-password").status_code == 200


def test_google_account_can_add_a_password(client, engine):
    create_google_user(engine, "google@example.com")
    assert_error(login(client, "google@example.com", "anything-1"), 409, "provider_conflict")
    request_reset(client, "google@example.com")
    assert "add a password" in outbox("google@example.com", "password_reset")[-1].body
    token = reset_token("google@example.com")
    assert confirm(client, token).status_code == 204
    response = login(client, "google@example.com", "new-password")
    assert response.status_code == 200
    assert response.json()["user"]["authProvider"] == "google"
    assert_error(login(client, "google@example.com", "wrong-password"), 401, "invalid_credentials")


def test_reset_mail_does_not_change_verification_status(client):
    signup = client.post(
        "/auth/signup", json={"email": "new@example.com", "password": "correct-horse", "fullName": "New"}
    ).json()
    with SessionLocal() as db:
        db.scalar(select(EmailOutbox).where(EmailOutbox.kind == "verification")).status = "sent"
        db.commit()
    request_reset(client, "new@example.com")
    headers = {"Authorization": "Bearer " + signup["accessToken"]}
    assert client.get("/auth/verification/status", headers=headers).json()["status"] == "sent"
    assert client.get("/me", headers=headers).json()["emailVerified"] is False
