from __future__ import annotations

import uuid
from typing import Any, cast

import sqlalchemy as sa
from app.core.security import create_access_token, hash_password
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


def add_member(engine: sa.Engine, workspace_id: str, user_id: uuid.UUID, created_by_user_id: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO workspace_members
                  (workspace_id, user_id, is_admin, joined_at, created_by_user_id)
                VALUES (:workspace_id, :user_id, false, now(), :created_by_user_id)
                """
            ),
            {"workspace_id": workspace_id, "user_id": user_id, "created_by_user_id": created_by_user_id},
        )


def assert_error(response: Any, status_code: int, code: str) -> None:
    assert response.status_code == status_code, response.text
    assert response.json()["error"]["code"] == code


def create_department(client: TestClient, workspace_id: str, token: str, name: str = "Operations") -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/departments",
        headers=auth_headers(token),
        json={"name": name},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_architecture(
    client: TestClient, workspace_id: str, token: str, name: str = "Architecture"
) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture",
        headers=auth_headers(token),
        json={"name": name, "description": "Company architecture"},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_value_stream(
    client: TestClient,
    workspace_id: str,
    ba_id: str,
    token: str,
    name: str = "Value stream",
    **extra: Any,
) -> dict[str, Any]:
    payload = {"name": name, **extra}
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture/{ba_id}/value-streams",
        headers=auth_headers(token),
        json=payload,
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_key_activity(
    client: TestClient,
    workspace_id: str,
    vs_id: str,
    token: str,
    name: str = "Activity",
    **extra: Any,
) -> dict[str, Any]:
    payload = {"activityName": name, **extra}
    response = client.post(
        f"/workspaces/{workspace_id}/value-streams/{vs_id}/key-activities",
        headers=auth_headers(token),
        json=payload,
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_capability(
    client: TestClient,
    workspace_id: str,
    ba_id: str,
    token: str,
    name: str = "Capability",
    **extra: Any,
) -> dict[str, Any]:
    payload = {"capabilityName": name, **extra}
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture/{ba_id}/capabilities",
        headers=auth_headers(token),
        json=payload,
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def test_architecture_singleton_lifecycle(client: TestClient) -> None:
    owner = signup(client, "arch-singleton@example.com", "Architecture Co")
    workspace_id = owner["workspace"]["id"]
    headers = auth_headers(owner["accessToken"])

    assert_error(client.get(f"/workspaces/{workspace_id}/business-architecture", headers=headers), 404, "not_found")
    architecture = create_architecture(client, workspace_id, owner["accessToken"])
    assert architecture["origin"] == "architecture"
    assert architecture["status"] == "draft"
    assert_error(
        client.post(
            f"/workspaces/{workspace_id}/business-architecture",
            headers=headers,
            json={"name": "Duplicate"},
        ),
        409,
        "architecture_exists",
    )

    patched = client.patch(
        f"/workspaces/{workspace_id}/business-architecture/{architecture['id']}",
        headers=headers,
        json={"currentStateSummary": "Current", "futureStateSummary": "Future", "status": "active"},
    )
    assert patched.status_code == 200
    assert patched.json()["currentStateSummary"] == "Current"
    assert patched.json()["futureStateSummary"] == "Future"
    assert patched.json()["status"] == "active"


def test_collaborative_member_writes_and_non_member_404(client: TestClient, engine: sa.Engine) -> None:
    owner = signup(client, "arch-owner@example.com", "Collaborative Co")
    member_user = create_password_user(engine, "arch-member@example.com")
    add_member(engine, owner["workspace"]["id"], member_user, owner["user"]["id"])
    member_token = create_access_token(member_user)
    outsider = signup(client, "arch-outsider@example.com", "Other Co")

    architecture = create_architecture(client, owner["workspace"]["id"], member_token, "Member Architecture")
    stream = create_value_stream(client, owner["workspace"]["id"], architecture["id"], member_token, "Member Stream")
    activity = create_key_activity(client, owner["workspace"]["id"], stream["id"], member_token, "Member Activity")
    capability = create_capability(
        client, owner["workspace"]["id"], architecture["id"], member_token, "Member Capability"
    )

    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}",
            headers=auth_headers(member_token),
            json={"status": "active"},
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}/capabilities/{capability['id']}",
            headers=auth_headers(member_token),
        ).status_code
        == 201
    )
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/key-activities/{activity['id']}/capabilities/{capability['id']}",
            headers=auth_headers(member_token),
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}/capabilities/{capability['id']}",
            headers=auth_headers(member_token),
        ).status_code
        == 204
    )
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/key-activities/{activity['id']}",
            headers=auth_headers(member_token),
        ).status_code
        == 204
    )
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/capabilities/{capability['id']}",
            headers=auth_headers(member_token),
        ).status_code
        == 204
    )
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}",
            headers=auth_headers(member_token),
        ).status_code
        == 204
    )

    nonexistent = client.get(
        f"/workspaces/{uuid.uuid4()}/business-architecture", headers=auth_headers(outsider["accessToken"])
    )
    cross_tenant = client.get(
        f"/workspaces/{owner['workspace']['id']}/business-architecture",
        headers=auth_headers(outsider["accessToken"]),
    )
    assert nonexistent.status_code == 404
    assert cross_tenant.status_code == 404
    assert nonexistent.content == cross_tenant.content


def test_value_stream_cap(client: TestClient) -> None:
    owner = signup(client, "stream-cap@example.com", "Stream Cap Co")
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    streams = [
        create_value_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], f"Stream {idx}")
        for idx in range(6)
    ]

    response = client.post(
        f"/workspaces/{owner['workspace']['id']}/business-architecture/{architecture['id']}/value-streams",
        headers=auth_headers(owner["accessToken"]),
        json={"name": "Stream 7"},
    )
    assert_error(response, 409, "cardinality_limit")
    assert response.json()["error"]["details"] == {"limit": 6, "current": 6}

    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{streams[0]['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )
    create_value_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Replacement")


def test_key_activity_cap_and_independent_stream_budget(client: TestClient) -> None:
    owner = signup(client, "activity-cap@example.com", "Activity Cap Co")
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    stream_one = create_value_stream(
        client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Stream 1"
    )
    stream_two = create_value_stream(
        client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Stream 2"
    )
    for idx in range(6):
        create_key_activity(client, owner["workspace"]["id"], stream_one["id"], owner["accessToken"], f"Activity {idx}")

    response = client.post(
        f"/workspaces/{owner['workspace']['id']}/value-streams/{stream_one['id']}/key-activities",
        headers=auth_headers(owner["accessToken"]),
        json={"activityName": "Activity 7"},
    )
    assert_error(response, 409, "cardinality_limit")
    assert response.json()["error"]["details"] == {"limit": 6, "current": 6}
    create_key_activity(
        client, owner["workspace"]["id"], stream_two["id"], owner["accessToken"], "Other stream activity"
    )


def test_sequence_order_defaults_explicit_values_and_duplicates(client: TestClient) -> None:
    owner = signup(client, "sequence@example.com", "Sequence Co")
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    stream = create_value_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Stream")
    first = create_key_activity(client, owner["workspace"]["id"], stream["id"], owner["accessToken"], "First")
    second = create_key_activity(client, owner["workspace"]["id"], stream["id"], owner["accessToken"], "Second")
    explicit = create_key_activity(
        client,
        owner["workspace"]["id"],
        stream["id"],
        owner["accessToken"],
        "Explicit",
        sequenceOrder=10,
    )
    duplicate = create_key_activity(
        client,
        owner["workspace"]["id"],
        stream["id"],
        owner["accessToken"],
        "Duplicate",
        sequenceOrder=10,
    )

    assert first["sequenceOrder"] == 1
    assert second["sequenceOrder"] == 2
    assert explicit["sequenceOrder"] == 10
    assert duplicate["sequenceOrder"] == 10
    response = client.get(
        f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}/key-activities",
        headers=auth_headers(owner["accessToken"]),
    )
    assert response.status_code == 200
    assert [item["sequenceOrder"] for item in response.json()] == [1, 2, 10, 10]


def test_department_references_validate_and_set_null(client: TestClient) -> None:
    owner = signup(client, "arch-dept@example.com", "Architecture Departments Co")
    other = signup(client, "arch-other-dept@example.com", "Other Departments Co")
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    local_department = create_department(client, owner["workspace"]["id"], owner["accessToken"], "Local")
    foreign_department = create_department(client, other["workspace"]["id"], other["accessToken"], "Foreign")

    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/business-architecture/{architecture['id']}/value-streams",
            headers=auth_headers(owner["accessToken"]),
            json={"name": "Foreign linked stream", "linkedDepartmentId": foreign_department["id"]},
        ),
        404,
        "not_found",
    )
    stream = create_value_stream(
        client,
        owner["workspace"]["id"],
        architecture["id"],
        owner["accessToken"],
        "Local stream",
        linkedDepartmentId=local_department["id"],
    )
    capability = create_capability(
        client,
        owner["workspace"]["id"],
        architecture["id"],
        owner["accessToken"],
        "Local capability",
        owningDepartmentId=local_department["id"],
    )
    assert stream["linkedDepartmentId"] == local_department["id"]
    assert capability["owningDepartmentId"] == local_department["id"]

    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/departments/{local_department['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )
    assert (
        client.get(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).json()["linkedDepartmentId"]
        is None
    )
    capabilities = client.get(
        f"/workspaces/{owner['workspace']['id']}/business-architecture/{architecture['id']}/capabilities",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    assert [item for item in capabilities if item["id"] == capability["id"]][0]["owningDepartmentId"] is None


def test_capability_link_lifecycle(client: TestClient) -> None:
    owner = signup(client, "links@example.com", "Links Co")
    other = signup(client, "links-other@example.com", "Other Links Co")
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    other_architecture = create_architecture(client, other["workspace"]["id"], other["accessToken"])
    stream = create_value_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Stream")
    activity = create_key_activity(client, owner["workspace"]["id"], stream["id"], owner["accessToken"], "Activity")
    capability = create_capability(
        client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Capability"
    )
    foreign_capability = create_capability(
        client,
        other["workspace"]["id"],
        other_architecture["id"],
        other["accessToken"],
        "Foreign Capability",
    )

    vs_link = client.post(
        f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}/capabilities/{capability['id']}",
        headers=auth_headers(owner["accessToken"]),
    )
    assert vs_link.status_code == 201
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}/capabilities/{capability['id']}",
            headers=auth_headers(owner["accessToken"]),
        ),
        409,
        "already_linked",
    )
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}/capabilities/{foreign_capability['id']}",
            headers=auth_headers(owner["accessToken"]),
        ),
        404,
        "not_found",
    )
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}/capabilities/{capability['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )
    assert_error(
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}/capabilities/{capability['id']}",
            headers=auth_headers(owner["accessToken"]),
        ),
        404,
        "not_found",
    )

    ka_link = client.post(
        f"/workspaces/{owner['workspace']['id']}/key-activities/{activity['id']}/capabilities/{capability['id']}",
        headers=auth_headers(owner["accessToken"]),
    )
    assert ka_link.status_code == 201
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/key-activities/{activity['id']}/capabilities/{capability['id']}",
            headers=auth_headers(owner["accessToken"]),
        ),
        409,
        "already_linked",
    )
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/key-activities/{activity['id']}/capabilities/{capability['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )


def test_delete_cascades_for_core_owned_and_junction_rows(client: TestClient, engine: sa.Engine) -> None:
    owner = signup(client, "delete-core@example.com", "Delete Core Co")
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    stream = create_value_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Stream")
    activity = create_key_activity(client, owner["workspace"]["id"], stream["id"], owner["accessToken"], "Activity")
    capability = create_capability(
        client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Capability"
    )
    assert (
        client.post(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}/capabilities/{capability['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/workspaces/{owner['workspace']['id']}/key-activities/{activity['id']}/capabilities/{capability['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 201
    )

    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )
    with engine.begin() as conn:
        assert conn.scalar(text("SELECT count(*) FROM key_activities WHERE id = :id"), {"id": activity["id"]}) == 0
        assert conn.scalar(text("SELECT count(*) FROM value_stream_capabilities")) == 0
        assert conn.scalar(text("SELECT count(*) FROM key_activity_capabilities")) == 0
        assert (
            conn.scalar(text("SELECT count(*) FROM business_capabilities WHERE id = :id"), {"id": capability["id"]})
            == 1
        )

    stream_two = create_value_stream(
        client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Stream 2"
    )
    activity_two = create_key_activity(
        client, owner["workspace"]["id"], stream_two["id"], owner["accessToken"], "Activity 2"
    )
    assert (
        client.post(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream_two['id']}/capabilities/{capability['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/workspaces/{owner['workspace']['id']}/key-activities/{activity_two['id']}/capabilities/{capability['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 201
    )
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/capabilities/{capability['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )
    with engine.begin() as conn:
        assert conn.scalar(text("SELECT count(*) FROM value_stream_capabilities")) == 0
        assert conn.scalar(text("SELECT count(*) FROM key_activity_capabilities")) == 0
        assert conn.scalar(text("SELECT count(*) FROM value_streams WHERE id = :id"), {"id": stream_two["id"]}) == 1
        assert conn.scalar(text("SELECT count(*) FROM key_activities WHERE id = :id"), {"id": activity_two["id"]}) == 1


def test_origin_is_not_client_writable(client: TestClient) -> None:
    owner = signup(client, "origin@example.com", "Origin Co")
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/business-architecture/{architecture['id']}/value-streams",
            headers=auth_headers(owner["accessToken"]),
            json={"name": "Discovery Stream", "origin": "discovery"},
        ),
        422,
        "validation_error",
    )
    stream = create_value_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Stream")
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"origin": "discovery"},
        ),
        422,
        "validation_error",
    )


def test_invalid_enums_return_422(client: TestClient) -> None:
    owner = signup(client, "invalid-enum@example.com", "Invalid Enum Co")
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    stream = create_value_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Stream")

    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"status": "bogus"},
        ),
        422,
        "validation_error",
    )
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"valueStreamType": "bogus"},
        ),
        422,
        "validation_error",
    )
