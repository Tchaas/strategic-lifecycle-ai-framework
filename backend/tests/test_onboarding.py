from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from unittest.mock import patch

from app.core.db import SessionLocal
from app.core.security import utc_now
from app.email_worker import deliver_one
from app.models.email import EmailOutbox, EmailVerificationToken
from sqlalchemy import select, text

from onboarding_helpers import signup_workspace, verification_token


def account(client, email="creator@example.com"):
    response = client.post(
        "/auth/signup",
        json={"email": email, "fullName": "Creator", "password": "correct-horse"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def headers(user):
    return {"Authorization": "Bearer " + user["accessToken"]}


def verify(client, user):
    response = client.post("/auth/verify-email/" + verification_token(user["user"]["email"]))
    assert response.status_code == 200, response.text


def test_verification_and_required_setup_survive_returning_login(client, engine):
    user = account(client)
    assert client.get("/workspaces", headers=headers(user)).json()["total"] == 0
    denied = client.post("/workspaces", headers=headers(user), json={"name": "Company"})
    assert denied.status_code == 403 and denied.json()["error"]["code"] == "email_unverified"
    token = verification_token(user["user"]["email"])
    verify(client, user)
    assert client.post("/auth/verify-email/" + token).status_code == 409
    workspace = client.post("/workspaces", headers=headers(user), json={"name": "Company"}).json()["workspace"]
    base = "/workspaces/" + workspace["id"]
    assert client.post(base + "/complete-setup", headers=headers(user)).status_code == 409
    assert client.get(base + "/strategic-objectives", headers=headers(user)).status_code == 403
    with engine.connect() as conn:
        assert conn.scalar(text("SELECT count(*) FROM business_architecture_components")) == 1
        assert conn.scalar(text("SELECT role FROM workspace_members")) == "admin"
    department = client.post(base + "/departments", headers=headers(user), json={"name": "Operations"})
    assert department.status_code == 201
    assert department.json()["businessArchitectureId"]
    assert client.post(base + "/complete-setup", headers=headers(user)).status_code == 200
    again = client.post(
        "/auth/login",
        json={"email": user["user"]["email"], "password": "correct-horse"},
    ).json()
    saved = client.get("/workspaces", headers=headers(again)).json()["items"][0]
    assert saved["setupCompletedAt"] and saved["name"] == "Company"
    assert client.get(base + "/departments", headers=headers(again)).json()["items"][0]["name"] == "Operations"


def test_expired_invalid_resend_and_single_use_links(client):
    user = account(client)
    token = verification_token(user["user"]["email"])
    assert client.post("/auth/verify-email/not-a-valid-token").status_code == 400
    assert client.post("/auth/verification/resend", headers=headers(user)).status_code == 429
    with SessionLocal() as db:
        record = db.scalar(select(EmailVerificationToken))
        record.expires_at = utc_now() - timedelta(seconds=1)
        record.created_at = utc_now() - timedelta(minutes=2)
        db.commit()
    assert client.post("/auth/verify-email/" + token).status_code == 410
    assert client.post("/auth/verification/resend", headers=headers(user)).status_code == 202
    new_token = verification_token(user["user"]["email"])
    assert new_token != token
    assert client.post("/auth/verify-email/" + new_token).status_code == 200


def test_workspace_creation_rolls_back_all_parts(client, engine):
    user = account(client)
    verify(client, user)
    from app.models.business_architecture_components import (
        BusinessArchitectureComponent,
    )
    from sqlalchemy import event

    def fail(*args):
        raise RuntimeError("Simulated storage failure")

    event.listen(BusinessArchitectureComponent, "before_insert", fail)
    try:
        assert client.post("/workspaces", headers=headers(user), json={"name": "Company"}).status_code == 500
    finally:
        event.remove(BusinessArchitectureComponent, "before_insert", fail)
    with engine.connect() as conn:
        for table in (
            "workspaces",
            "workspace_members",
            "business_architecture_components",
        ):
            assert conn.scalar(text(f"SELECT count(*) FROM {table}")) == 0
    assert client.post("/workspaces", headers=headers(user), json={"name": "Company"}).status_code == 201


def test_concurrent_workspace_creation_only_creates_one(client, engine):
    user = account(client)
    verify(client, user)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(
                lambda _: client.post("/workspaces", headers=headers(user), json={"name": "Company"}).status_code,
                range(2),
            )
        )
    assert sorted(results) == [201, 409]
    with engine.connect() as conn:
        assert conn.scalar(text("SELECT count(*) FROM workspaces")) == 1


def test_last_department_is_protected_under_concurrent_deletion(client):
    owner = signup_workspace(client, "departments@example.com")
    base = "/workspaces/" + owner["workspace"]["id"] + "/departments"
    first = client.get(base, headers=headers(owner)).json()["items"][0]
    assert client.delete(base + "/" + first["id"], headers=headers(owner)).status_code == 409
    assert (
        client.patch(
            base + "/" + first["id"],
            headers=headers(owner),
            json={"name": "Renamed", "headcount": 10},
        ).status_code
        == 200
    )
    second = client.post(base, headers=headers(owner), json={"name": "Second"}).json()
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(
                lambda d: client.delete(base + "/" + d["id"], headers=headers(owner)).status_code,
                [first, second],
            )
        )
    assert sorted(results) == [204, 409]
    assert client.get(base, headers=headers(owner)).json()["total"] == 1
    assert client.post(base, headers=headers(owner), json={"name": "   "}).status_code == 422
    assert client.post(base, headers=headers(owner), json={"name": "Test", "headcount": -1}).status_code == 422


def test_invitation_register_verifies_recipient_and_member_permissions(client, engine):
    owner = signup_workspace(client, "admin@example.com")
    base = "/workspaces/" + owner["workspace"]["id"]
    invited = client.post(
        base + "/invites",
        headers=headers(owner),
        json={"invitedEmail": "member@example.com"},
    ).json()
    token = invited["inviteToken"]
    assert client.get("/invites/" + token).json()["email"] == "member@example.com"
    payload = {
        "email": "wrong@example.com",
        "fullName": "Member",
        "password": "correct-horse",
    }
    assert client.post("/invites/" + token + "/register", json=payload).status_code == 403
    with engine.connect() as conn:
        assert conn.scalar(text("SELECT count(*) FROM users")) == 1
    payload["email"] = "member@example.com"
    response = client.post("/invites/" + token + "/register", json=payload)
    assert response.status_code == 201, response.text
    member = response.json()
    assert member["user"]["emailVerified"] is True
    assert client.post("/invites/" + token + "/accept", headers=headers(member)).status_code == 409
    assert client.get("/workspaces", headers=headers(member)).json()["items"][0]["role"] == "member"
    department = client.get(base + "/departments", headers=headers(member)).json()["items"][0]
    for method, path, data in [
        ("post", "/departments", {"name": "X"}),
        ("patch", "/departments/" + department["id"], {"name": "X"}),
        ("post", "/invites", {"invitedEmail": "other@example.com"}),
        ("patch", "", {"name": "Renamed", "industry": "Changed"}),
    ]:
        assert getattr(client, method)(base + path, headers=headers(member), json=data).status_code == 403
    assert client.delete(base + "/departments/" + department["id"], headers=headers(member)).status_code == 403
    assert client.get(base, headers=headers(owner)).json()["industry"] is None
    assert client.patch(base, headers=headers(member), json={"industry": "Logistics"}).status_code == 200
    assert client.get(base, headers=headers(owner)).json()["industry"] == "Logistics"
    outsider = signup_workspace(client, "outsider@example.com")
    assert client.get(base + "/departments", headers=headers(outsider)).status_code == 404


def test_existing_account_invitation_verifies_and_blocks_second_workspace(client):
    owner = signup_workspace(client, "owner@example.com")
    member = account(client, "member@example.com")
    base = "/workspaces/" + owner["workspace"]["id"]
    token = client.post(
        base + "/invites",
        headers=headers(owner),
        json={"invitedEmail": "member@example.com"},
    ).json()["inviteToken"]
    assert client.post("/invites/" + token + "/accept", headers=headers(member)).status_code == 200
    assert client.get("/me", headers=headers(member)).json()["emailVerified"] is True
    assert client.post("/workspaces", headers=headers(member), json={"name": "Second"}).status_code == 409


def test_email_worker_delivery_failure_and_retry_are_truthful(client):
    user = account(client)
    with patch(
        "app.email_worker.send_message",
        side_effect=RuntimeError("provider unavailable"),
    ):
        assert deliver_one()
    assert client.get("/auth/verification/status", headers=headers(user)).json()["status"] == "queued"
    with SessionLocal() as db:
        message = db.scalar(select(EmailOutbox))
        assert message.attempts == 1 and message.body
        message.available_at = utc_now() - timedelta(seconds=1)
        message.attempts = 4
        db.commit()
    with patch(
        "app.email_worker.send_message",
        side_effect=RuntimeError("provider unavailable"),
    ):
        assert deliver_one()
    assert client.get("/auth/verification/status", headers=headers(user)).json()["status"] == "failed"
    with SessionLocal() as db:
        record = db.scalar(select(EmailVerificationToken))
        record.created_at = utc_now() - timedelta(minutes=2)
        db.commit()
    assert client.post("/auth/verification/resend", headers=headers(user)).status_code == 202
    with patch("app.email_worker.send_message", return_value="test-provider-id") as delivery:
        assert deliver_one()
        assert delivery.call_count == 1
    assert client.get("/auth/verification/status", headers=headers(user)).json()["status"] == "sent"
    with SessionLocal() as db:
        assert all(not row.body for row in db.scalars(select(EmailOutbox)))


def test_failed_invitation_delivery_can_be_retried_by_admin_only(client):
    owner = signup_workspace(client, "retry-admin@example.com")
    base = "/workspaces/" + owner["workspace"]["id"]
    response = client.post(base + "/invites", headers=headers(owner), json={"invitedEmail": "retry-member@example.com"})
    invite = response.json()
    path = base + "/invites/" + invite["id"] + "/resend"
    assert client.post(path, headers=headers(owner)).status_code == 429
    with SessionLocal() as db:
        message = db.scalar(select(EmailOutbox).where(EmailOutbox.invite_id == invite["id"]))
        message.created_at = utc_now() - timedelta(minutes=2)
        message.status = "failed"
        db.commit()
    assert client.get(base + "/invites", headers=headers(owner)).json()["items"][0]["deliveryStatus"] == "failed"
    assert client.post(path, headers=headers(owner)).status_code == 202
    assert client.get(base + "/invites", headers=headers(owner)).json()["items"][0]["deliveryStatus"] == "queued"
    outsider = signup_workspace(client, "retry-outsider@example.com")
    assert client.post(path, headers=headers(outsider)).status_code == 404
