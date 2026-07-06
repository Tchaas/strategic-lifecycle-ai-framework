from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, cast

import sqlalchemy as sa
from app.core.security import create_access_token, hash_password
from app.services.auth_service import provision_workspace_for_user as auth_provision_workspace_for_user
from app.services.workspace_service import provision_workspace_for_user
from fastapi.testclient import TestClient
from sqlalchemy import text


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def signup(client: TestClient, email: str, workspace_name: str = "Acme") -> dict[str, Any]:
    response = client.post(
        "/auth/signup",
        json={
            "email": email,
            "password": "correct-horse",
            "fullName": email.split("@")[0].title(),
            "workspaceName": workspace_name,
        },
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_password_user(engine: sa.Engine, email: str, full_name: str = "User") -> uuid.UUID:
    with engine.begin() as conn:
        return cast(
            uuid.UUID,
            conn.scalar(
                text(
                    """
                    INSERT INTO users (email, full_name, auth_provider, password_hash)
                    VALUES (:email, :full_name, 'password', :password_hash)
                    RETURNING id
                    """
                ),
                {"email": email, "full_name": full_name, "password_hash": hash_password("correct-horse")},
            ),
        )


def create_google_user(engine: sa.Engine, email: str) -> tuple[uuid.UUID, str]:
    with engine.begin() as conn:
        user_id = cast(
            uuid.UUID,
            conn.scalar(
                text(
                    """
                    INSERT INTO users (email, full_name, auth_provider, google_sub, email_verified)
                    VALUES (:email, 'Google User', 'google', :google_sub, true)
                    RETURNING id
                    """
                ),
                {"email": email, "google_sub": f"sub-{uuid.uuid4()}"},
            ),
        )
    return user_id, create_access_token(user_id)


def member_id(engine: sa.Engine, workspace_id: str, user_id: str) -> str:
    with engine.begin() as conn:
        return str(
            conn.scalar(
                text("SELECT id FROM workspace_members WHERE workspace_id = :workspace_id AND user_id = :user_id"),
                {"workspace_id": workspace_id, "user_id": user_id},
            )
        )


def set_admin(engine: sa.Engine, workspace_id: str, user_id: str, is_admin: bool) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE workspace_members
                SET is_admin = :is_admin
                WHERE workspace_id = :workspace_id AND user_id = :user_id
                """
            ),
            {"workspace_id": workspace_id, "user_id": user_id, "is_admin": is_admin},
        )


def add_member(engine: sa.Engine, workspace_id: str, user_id: uuid.UUID, created_by_user_id: str) -> str:
    with engine.begin() as conn:
        return str(
            conn.scalar(
                text(
                    """
                    INSERT INTO workspace_members
                      (workspace_id, user_id, is_admin, joined_at, created_by_user_id)
                    VALUES (:workspace_id, :user_id, false, now(), :created_by_user_id)
                    RETURNING id
                    """
                ),
                {"workspace_id": workspace_id, "user_id": user_id, "created_by_user_id": created_by_user_id},
            )
        )


def assert_error(response: Any, status_code: int, code: str) -> None:
    assert response.status_code == status_code, response.text
    assert response.json()["error"]["code"] == code


def test_tenancy_not_found_bodies_are_byte_identical(client: TestClient) -> None:
    owner = signup(client, "owner@example.com", "Owner Co")
    outsider = signup(client, "outsider@example.com", "Outsider Co")
    headers = auth_headers(outsider["accessToken"])

    nonexistent = client.get(f"/workspaces/{uuid.uuid4()}", headers=headers)
    cross_tenant = client.get(f"/workspaces/{owner['workspace']['id']}", headers=headers)

    assert nonexistent.status_code == 404
    assert cross_tenant.status_code == 404
    assert nonexistent.content == cross_tenant.content


def test_post_workspaces_google_setup_path(client: TestClient, engine: sa.Engine) -> None:
    user_id, token = create_google_user(engine, "google-setup@example.com")
    response = client.post(
        "/workspaces",
        headers=auth_headers(token),
        json={"name": "Google Workspace", "industry": "Logistics"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["member"]["isAdmin"] is True
    assert body["workspace"]["createdByUserId"] == str(user_id)
    with engine.begin() as conn:
        assert conn.scalar(text("SELECT count(*) FROM workspaces")) == 1
        assert conn.scalar(text("SELECT count(*) FROM workspace_members WHERE is_admin")) == 1


def test_signup_and_post_workspaces_share_provisioning_function(client: TestClient, engine: sa.Engine) -> None:
    assert auth_provision_workspace_for_user is provision_workspace_for_user
    signup_body = signup(client, "signup-shared@example.com", "Signup Workspace")
    user_id, token = create_google_user(engine, "post-shared@example.com")
    post_body = client.post("/workspaces", headers=auth_headers(token), json={"name": "Post Workspace"}).json()

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT w.name, w.created_by_user_id, m.user_id, m.is_admin
                FROM workspaces w
                JOIN workspace_members m ON m.workspace_id = w.id
                ORDER BY w.name
                """
            )
        ).all()
    assert ("Post Workspace", user_id, user_id, True) in rows
    assert (
        "Signup Workspace",
        uuid.UUID(signup_body["user"]["id"]),
        uuid.UUID(signup_body["user"]["id"]),
        True,
    ) in rows
    assert post_body["member"]["isAdmin"] is True


def test_patch_workspace_admin_non_admin_and_non_member(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "admin@example.com", "Patch Co")
    member_user = create_password_user(engine, "member@example.com")
    add_member(engine, admin["workspace"]["id"], member_user, admin["user"]["id"])
    member_token = create_access_token(member_user)
    outsider = signup(client, "outsider@example.com", "Other Co")

    ok = client.patch(
        f"/workspaces/{admin['workspace']['id']}",
        headers=auth_headers(admin["accessToken"]),
        json={"name": "Patched Co", "annualRevenue": 12.5},
    )
    assert ok.status_code == 200
    assert ok.json()["name"] == "Patched Co"
    assert ok.json()["annualRevenue"] == 12.5
    assert_error(
        client.patch(
            f"/workspaces/{admin['workspace']['id']}",
            headers=auth_headers(member_token),
            json={"name": "Denied"},
        ),
        403,
        "admin_required",
    )
    assert_error(
        client.patch(
            f"/workspaces/{admin['workspace']['id']}",
            headers=auth_headers(outsider["accessToken"]),
            json={"name": "Hidden"},
        ),
        404,
        "not_found",
    )


def test_delete_workspace_cascades_and_requires_admin(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "delete-admin@example.com", "Delete Co")
    member_user = create_password_user(engine, "delete-member@example.com")
    add_member(engine, admin["workspace"]["id"], member_user, admin["user"]["id"])
    member_token = create_access_token(member_user)
    with engine.begin() as conn:
        objective_id = conn.scalar(
            text(
                """
                INSERT INTO strategic_objectives (workspace_id, strategic_initiative_name, created_by_user_id)
                VALUES (:workspace_id, 'Delete objective', :user_id)
                RETURNING id
                """
            ),
            {"workspace_id": admin["workspace"]["id"], "user_id": admin["user"]["id"]},
        )
        case_id = conn.scalar(
            text(
                """
                INSERT INTO lean_business_cases
                  (workspace_id, strategic_objective_id, owner_user_id, title, created_by_user_id)
                VALUES (:workspace_id, :objective_id, :user_id, 'Delete case', :user_id)
                RETURNING id
                """
            ),
            {"workspace_id": admin["workspace"]["id"], "objective_id": objective_id, "user_id": admin["user"]["id"]},
        )

    assert_error(
        client.delete(f"/workspaces/{admin['workspace']['id']}", headers=auth_headers(member_token)),
        403,
        "admin_required",
    )
    response = client.delete(f"/workspaces/{admin['workspace']['id']}", headers=auth_headers(admin["accessToken"]))
    assert response.status_code == 204
    with engine.begin() as conn:
        assert conn.scalar(text("SELECT count(*) FROM strategic_objectives WHERE id = :id"), {"id": objective_id}) == 0
        assert conn.scalar(text("SELECT count(*) FROM lean_business_cases WHERE id = :id"), {"id": case_id}) == 0


def test_members_list_joins_display_fields_and_non_member_404(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "members-admin@example.com", "Members Co")
    member_user = create_password_user(engine, "display@example.com", "Display User")
    add_member(engine, admin["workspace"]["id"], member_user, admin["user"]["id"])
    outsider = signup(client, "members-outsider@example.com", "Other Co")

    response = client.get(f"/workspaces/{admin['workspace']['id']}/members", headers=auth_headers(admin["accessToken"]))
    assert response.status_code == 200
    assert {item["email"] for item in response.json()} == {"members-admin@example.com", "display@example.com"}
    assert any(item["fullName"] == "Display User" and item["isAdmin"] is False for item in response.json())
    assert_error(
        client.get(f"/workspaces/{admin['workspace']['id']}/members", headers=auth_headers(outsider["accessToken"])),
        404,
        "not_found",
    )


def test_admin_toggle_guardrails(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "toggle-admin@example.com", "Toggle Co")
    member_user = create_password_user(engine, "toggle-member@example.com")
    target_member_id = add_member(engine, admin["workspace"]["id"], member_user, admin["user"]["id"])

    promote = client.patch(
        f"/workspaces/{admin['workspace']['id']}/members/{target_member_id}",
        headers=auth_headers(admin["accessToken"]),
        json={"isAdmin": True},
    )
    assert promote.status_code == 200
    assert promote.json()["isAdmin"] is True
    demote = client.patch(
        f"/workspaces/{admin['workspace']['id']}/members/{target_member_id}",
        headers=auth_headers(admin["accessToken"]),
        json={"isAdmin": False},
    )
    assert demote.status_code == 200
    admin_member_id = member_id(engine, admin["workspace"]["id"], admin["user"]["id"])
    assert_error(
        client.patch(
            f"/workspaces/{admin['workspace']['id']}/members/{admin_member_id}",
            headers=auth_headers(admin["accessToken"]),
            json={"isAdmin": False},
        ),
        409,
        "last_admin",
    )


def test_member_removal_guardrails(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "remove-admin@example.com", "Remove Co")
    member_user = create_password_user(engine, "remove-member@example.com")
    other_user = create_password_user(engine, "remove-other@example.com")
    member_member_id = add_member(engine, admin["workspace"]["id"], member_user, admin["user"]["id"])
    other_member_id = add_member(engine, admin["workspace"]["id"], other_user, admin["user"]["id"])

    assert_error(
        client.delete(
            f"/workspaces/{admin['workspace']['id']}/members/{other_member_id}",
            headers=auth_headers(create_access_token(member_user)),
        ),
        403,
        "admin_required",
    )
    self_leave = client.delete(
        f"/workspaces/{admin['workspace']['id']}/members/{member_member_id}",
        headers=auth_headers(create_access_token(member_user)),
    )
    assert self_leave.status_code == 204
    admin_remove = client.delete(
        f"/workspaces/{admin['workspace']['id']}/members/{other_member_id}",
        headers=auth_headers(admin["accessToken"]),
    )
    assert admin_remove.status_code == 204
    admin_member_id = member_id(engine, admin["workspace"]["id"], admin["user"]["id"])
    assert_error(
        client.delete(
            f"/workspaces/{admin['workspace']['id']}/members/{admin_member_id}",
            headers=auth_headers(admin["accessToken"]),
        ),
        409,
        "last_admin",
    )


def test_invite_create_guardrails(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "invite-admin@example.com", "Invite Co")
    member_user = create_password_user(engine, "invite-member@example.com")
    add_member(engine, admin["workspace"]["id"], member_user, admin["user"]["id"])
    set_admin(engine, admin["workspace"]["id"], admin["user"]["id"], False)

    assert_error(
        client.post(
            f"/workspaces/{admin['workspace']['id']}/invites",
            headers=auth_headers(admin["accessToken"]),
            json={"invitedEmail": "new@example.com"},
        ),
        403,
        "admin_required",
    )
    set_admin(engine, admin["workspace"]["id"], admin["user"]["id"], True)
    created = client.post(
        f"/workspaces/{admin['workspace']['id']}/invites",
        headers=auth_headers(admin["accessToken"]),
        json={"invitedEmail": "new@example.com"},
    )
    assert created.status_code == 201
    assert created.json()["inviteToken"]
    assert created.json()["inviteUrl"].endswith(f"/#/invite/{created.json()['inviteToken']}")
    assert_error(
        client.post(
            f"/workspaces/{admin['workspace']['id']}/invites",
            headers=auth_headers(admin["accessToken"]),
            json={"invitedEmail": "new@example.com"},
        ),
        409,
        "invite_exists",
    )
    assert_error(
        client.post(
            f"/workspaces/{admin['workspace']['id']}/invites",
            headers=auth_headers(admin["accessToken"]),
            json={"invitedEmail": "invite-member@example.com"},
        ),
        409,
        "already_member",
    )


def test_invite_list_excludes_tokens_and_lazily_expires(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "list-invite-admin@example.com", "List Invite Co")
    created = client.post(
        f"/workspaces/{admin['workspace']['id']}/invites",
        headers=auth_headers(admin["accessToken"]),
        json={"invitedEmail": "expired@example.com"},
    ).json()
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE workspace_invites SET expires_at = :expires_at WHERE id = :id"),
            {"expires_at": datetime.now(UTC) - timedelta(seconds=1), "id": created["id"]},
        )

    response = client.get(f"/workspaces/{admin['workspace']['id']}/invites", headers=auth_headers(admin["accessToken"]))

    assert response.status_code == 200
    assert response.json()[0]["status"] == "expired"
    assert "inviteToken" not in response.text


def test_invite_accept_happy_path(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "accept-admin@example.com", "Accept Co")
    invitee_id = create_password_user(engine, "accept@example.com")
    token = client.post(
        f"/workspaces/{admin['workspace']['id']}/invites",
        headers=auth_headers(admin["accessToken"]),
        json={"invitedEmail": "accept@example.com"},
    ).json()["inviteToken"]

    response = client.post(f"/invites/{token}/accept", headers=auth_headers(create_access_token(invitee_id)))

    assert response.status_code == 200
    assert response.json()["workspace"]["id"] == admin["workspace"]["id"]
    assert response.json()["member"]["isAdmin"] is False
    with engine.begin() as conn:
        assert (
            conn.scalar(
                text("SELECT status FROM workspace_invites WHERE invite_token = :token"),
                {"token": token},
            )
            == "accepted"
        )


def test_invite_accept_email_mismatch_and_case_variant_success(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "case-admin@example.com", "Case Invite Co")
    wrong_user = create_password_user(engine, "wrong@example.com")
    right_user = create_password_user(engine, "maria@acme.com")
    wrong_token = client.post(
        f"/workspaces/{admin['workspace']['id']}/invites",
        headers=auth_headers(admin["accessToken"]),
        json={"invitedEmail": "right@example.com"},
    ).json()["inviteToken"]
    case_token = client.post(
        f"/workspaces/{admin['workspace']['id']}/invites",
        headers=auth_headers(admin["accessToken"]),
        json={"invitedEmail": "Maria@Acme.com"},
    ).json()["inviteToken"]

    assert_error(
        client.post(
            f"/invites/{wrong_token}/accept",
            headers=auth_headers(create_access_token(wrong_user)),
        ),
        403,
        "email_mismatch",
    )
    ok = client.post(f"/invites/{case_token}/accept", headers=auth_headers(create_access_token(right_user)))
    assert ok.status_code == 200


def test_invite_accept_expired_consumed_and_unknown(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "state-admin@example.com", "State Invite Co")
    expired_user = create_password_user(engine, "expired-accept@example.com")
    consumed_user = create_password_user(engine, "consumed@example.com")
    expired_token = client.post(
        f"/workspaces/{admin['workspace']['id']}/invites",
        headers=auth_headers(admin["accessToken"]),
        json={"invitedEmail": "expired-accept@example.com"},
    ).json()["inviteToken"]
    consumed_token = client.post(
        f"/workspaces/{admin['workspace']['id']}/invites",
        headers=auth_headers(admin["accessToken"]),
        json={"invitedEmail": "consumed@example.com"},
    ).json()["inviteToken"]
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE workspace_invites SET expires_at = :expires_at WHERE invite_token = :token"),
            {"expires_at": datetime.now(UTC) - timedelta(seconds=1), "token": expired_token},
        )

    assert_error(
        client.post(
            f"/invites/{expired_token}/accept",
            headers=auth_headers(create_access_token(expired_user)),
        ),
        410,
        "invite_expired",
    )
    assert (
        client.post(
            f"/invites/{consumed_token}/accept",
            headers=auth_headers(create_access_token(consumed_user)),
        ).status_code
        == 200
    )
    assert_error(
        client.post(
            f"/invites/{consumed_token}/accept",
            headers=auth_headers(create_access_token(consumed_user)),
        ),
        409,
        "invite_consumed",
    )
    assert_error(
        client.post(
            f"/invites/{uuid.uuid4().hex}/accept",
            headers=auth_headers(create_access_token(consumed_user)),
        ),
        404,
        "not_found",
    )


def test_invite_accept_already_member_keeps_invite_pending(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "already-admin@example.com", "Already Invite Co")
    member_user = create_password_user(engine, "already-member@example.com")
    add_member(engine, admin["workspace"]["id"], member_user, admin["user"]["id"])
    token = f"manual-{uuid.uuid4().hex}"
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO workspace_invites
                  (workspace_id, invited_email, invited_by_user_id, invite_token,
                   status, expires_at, created_by_user_id)
                VALUES (:workspace_id, 'already-member@example.com', :user_id, :token, 'pending', :expires_at, :user_id)
                """
            ),
            {
                "workspace_id": admin["workspace"]["id"],
                "user_id": admin["user"]["id"],
                "token": token,
                "expires_at": datetime.now(UTC) + timedelta(days=1),
            },
        )

    assert_error(
        client.post(
            f"/invites/{token}/accept",
            headers=auth_headers(create_access_token(member_user)),
        ),
        409,
        "already_member",
    )
    with engine.begin() as conn:
        assert (
            conn.scalar(
                text("SELECT status FROM workspace_invites WHERE invite_token = :token"),
                {"token": token},
            )
            == "pending"
        )
