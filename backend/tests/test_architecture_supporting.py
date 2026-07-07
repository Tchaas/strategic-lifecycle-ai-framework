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
                text("""
                    INSERT INTO users (email, full_name, auth_provider, password_hash)
                    VALUES (:email, :full_name, 'password', :password_hash)
                    RETURNING id
                    """),
                {"email": email, "full_name": full_name, "password_hash": hash_password("correct-horse")},
            ),
        )


def add_member(engine: sa.Engine, workspace_id: str, user_id: uuid.UUID, created_by_user_id: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO workspace_members
                  (workspace_id, user_id, is_admin, joined_at, created_by_user_id)
                VALUES (:workspace_id, :user_id, false, now(), :created_by_user_id)
                """),
            {"workspace_id": workspace_id, "user_id": user_id, "created_by_user_id": created_by_user_id},
        )


def assert_error(response: Any, status_code: int, code: str) -> None:
    assert response.status_code == status_code, response.text
    assert response.json()["error"]["code"] == code


def create_architecture(client: TestClient, workspace_id: str, token: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture",
        headers=auth_headers(token),
        json={"name": "Architecture"},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_value_stream(client: TestClient, workspace_id: str, ba_id: str, token: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture/{ba_id}/value-streams",
        headers=auth_headers(token),
        json={"name": "Stream"},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def post_supporting(
    client: TestClient,
    workspace_id: str,
    ba_id: str,
    token: str,
    resource: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture/{ba_id}/{resource}",
        headers=auth_headers(token),
        json=payload,
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def setup_architecture(client: TestClient, email: str) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    owner = signup(client, email, "Supporting Co")
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    stream = create_value_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"])
    return owner, architecture, stream


def test_crud_happy_path_for_all_resources_by_non_admin_member(client: TestClient, engine: sa.Engine) -> None:
    owner, architecture, stream = setup_architecture(client, "supporting-owner@example.com")
    member_user = create_password_user(engine, "supporting-member@example.com")
    add_member(engine, owner["workspace"]["id"], member_user, owner["user"]["id"])
    member_token = create_access_token(member_user)
    workspace_id = owner["workspace"]["id"]

    process = post_supporting(
        client,
        workspace_id,
        architecture["id"],
        member_token,
        "processes",
        {
            "processName": "Route planning",
            "currentStateProcess": "Manual",
            "futureStateProcess": "Automated",
            "processGap": "No shared data",
            "impactedSystems": "Dispatch",
            "linkedValueStreamId": stream["id"],
        },
    )
    stakeholder = post_supporting(
        client,
        workspace_id,
        architecture["id"],
        member_token,
        "stakeholders",
        {
            "name": "Dispatch Manager",
            "roleOrPersona": "Operations lead",
            "stakeholderType": "internal",
            "needs": "Single queue",
            "painPoints": "Two systems",
            "valueReceived": "Prioritized work",
            "linkedValueStreamId": stream["id"],
        },
    )
    concept = post_supporting(
        client,
        workspace_id,
        architecture["id"],
        member_token,
        "information-concepts",
        {
            "conceptName": "Route Plan",
            "description": "Daily plan",
            "dataOwner": "Logistics",
            "sourceSystem": "Dispatch A",
            "targetSystem": "Routing",
            "dataQualityIssue": "Format drift",
            "businessUsage": "Daily dispatch",
            "linkedValueStreamId": stream["id"],
        },
    )
    impact = post_supporting(
        client,
        workspace_id,
        architecture["id"],
        member_token,
        "business-impacts",
        {
            "impactedArea": "Dispatch operations",
            "impactDescription": "Workflow change",
            "impactType": "operational",
            "severity": "high",
            "mitigationNotes": "Training",
            "expectedValue": "Lower labor cost",
            "linkedValueStreamId": stream["id"],
            "linkedLeanBusinessCaseId": None,
        },
    )
    for item in (process, stakeholder, concept, impact):
        assert item["origin"] == "architecture"
        assert item["status"] == "draft"
        assert item["linkedValueStreamId"] == stream["id"]

    patch_cases = [
        ("processes", process["id"], {"status": "active", "processGap": "Shared data gap"}, "processGap"),
        ("stakeholders", stakeholder["id"], {"status": "active", "painPoints": "Manual reconciliation"}, "painPoints"),
        ("information-concepts", concept["id"], {"status": "active", "businessUsage": "Dispatch"}, "businessUsage"),
        ("business-impacts", impact["id"], {"status": "active", "expectedValue": "Reduced cost"}, "expectedValue"),
    ]
    for resource, item_id, payload, asserted_field in patch_cases:
        response = client.patch(
            f"/workspaces/{workspace_id}/{resource}/{item_id}",
            headers=auth_headers(member_token),
            json=payload,
        )
        assert response.status_code == 200, response.text
        assert response.json()["status"] == "active"
        assert response.json()[asserted_field] == payload[asserted_field]

    list_cases = [
        ("processes", "processName", "Route planning"),
        ("stakeholders", "name", "Dispatch Manager"),
        ("information-concepts", "conceptName", "Route Plan"),
        ("business-impacts", "impactedArea", "Dispatch operations"),
    ]
    for resource, field, expected in list_cases:
        response = client.get(
            f"/workspaces/{workspace_id}/business-architecture/{architecture['id']}/{resource}",
            headers=auth_headers(member_token),
        )
        assert response.status_code == 200
        assert response.json()["items"][0][field] == expected

    for resource, item in (
        ("processes", process),
        ("stakeholders", stakeholder),
        ("information-concepts", concept),
        ("business-impacts", impact),
    ):
        response = client.delete(
            f"/workspaces/{workspace_id}/{resource}/{item['id']}", headers=auth_headers(member_token)
        )
        assert response.status_code == 204


def test_non_member_and_wrong_architecture_are_not_found(client: TestClient) -> None:
    owner, architecture, _ = setup_architecture(client, "supporting-tenancy@example.com")
    other, other_architecture, _ = setup_architecture(client, "supporting-tenancy-other@example.com")
    process = post_supporting(
        client,
        owner["workspace"]["id"],
        architecture["id"],
        owner["accessToken"],
        "processes",
        {"processName": "Route planning"},
    )
    outsider_headers = auth_headers(other["accessToken"])

    nonexistent = client.get(f"/workspaces/{uuid.uuid4()}/business-architecture", headers=outsider_headers)
    cross_tenant = client.get(
        f"/workspaces/{owner['workspace']['id']}/business-architecture/{architecture['id']}/processes",
        headers=outsider_headers,
    )
    assert nonexistent.status_code == 404
    assert cross_tenant.status_code == 404
    assert nonexistent.content == cross_tenant.content

    routes = [
        ("get", f"/workspaces/{owner['workspace']['id']}/business-architecture/{architecture['id']}/processes", None),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/business-architecture/{architecture['id']}/stakeholders",
            {"name": "Denied"},
        ),
        ("patch", f"/workspaces/{owner['workspace']['id']}/processes/{process['id']}", {"processName": "Denied"}),
        ("delete", f"/workspaces/{owner['workspace']['id']}/processes/{process['id']}", None),
    ]
    for method, path, payload in routes:
        if payload is None:
            response = getattr(client, method)(path, headers=outsider_headers)
        else:
            response = getattr(client, method)(path, headers=outsider_headers, json=payload)
        assert_error(response, 404, "not_found")

    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/business-architecture/{other_architecture['id']}/processes",
            headers=auth_headers(owner["accessToken"]),
            json={"processName": "Wrong architecture"},
        ),
        404,
        "not_found",
    )


def test_linked_value_stream_validation_and_delete_set_null(client: TestClient) -> None:
    owner, architecture, stream = setup_architecture(client, "supporting-links@example.com")
    other, other_architecture, other_stream = setup_architecture(client, "supporting-links-other@example.com")
    workspace_id = owner["workspace"]["id"]
    token = owner["accessToken"]

    assert_error(
        client.post(
            f"/workspaces/{workspace_id}/business-architecture/{architecture['id']}/processes",
            headers=auth_headers(token),
            json={"processName": "Foreign stream", "linkedValueStreamId": other_stream["id"]},
        ),
        404,
        "not_found",
    )
    assert other_architecture["id"]
    created = {
        "processes": post_supporting(
            client,
            workspace_id,
            architecture["id"],
            token,
            "processes",
            {"processName": "Process", "linkedValueStreamId": stream["id"]},
        ),
        "stakeholders": post_supporting(
            client,
            workspace_id,
            architecture["id"],
            token,
            "stakeholders",
            {"name": "Stakeholder", "linkedValueStreamId": stream["id"]},
        ),
        "information-concepts": post_supporting(
            client,
            workspace_id,
            architecture["id"],
            token,
            "information-concepts",
            {"conceptName": "Concept", "linkedValueStreamId": stream["id"]},
        ),
        "business-impacts": post_supporting(
            client,
            workspace_id,
            architecture["id"],
            token,
            "business-impacts",
            {"impactedArea": "Impact", "linkedValueStreamId": stream["id"]},
        ),
    }
    assert all(item["linkedValueStreamId"] == stream["id"] for item in created.values())

    assert (
        client.delete(
            f"/workspaces/{workspace_id}/value-streams/{stream['id']}", headers=auth_headers(token)
        ).status_code
        == 204
    )
    for resource, item in created.items():
        list_response = client.get(
            f"/workspaces/{workspace_id}/business-architecture/{architecture['id']}/{resource}",
            headers=auth_headers(token),
        )
        assert list_response.status_code == 200
        reloaded = [row for row in list_response.json()["items"] if row["id"] == item["id"]][0]
        assert reloaded["linkedValueStreamId"] is None


def test_business_impact_linked_case_validation_and_null_allowed(client: TestClient) -> None:
    owner, architecture, _ = setup_architecture(client, "supporting-case-link@example.com")

    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/business-architecture/{architecture['id']}/business-impacts",
            headers=auth_headers(owner["accessToken"]),
            json={"impactedArea": "Impact", "linkedLeanBusinessCaseId": str(uuid.uuid4())},
        ),
        404,
        "not_found",
    )
    impact = post_supporting(
        client,
        owner["workspace"]["id"],
        architecture["id"],
        owner["accessToken"],
        "business-impacts",
        {"impactedArea": "Impact", "linkedLeanBusinessCaseId": None},
    )
    assert impact["linkedLeanBusinessCaseId"] is None


def test_enum_validation_uses_422_envelope(client: TestClient) -> None:
    owner, architecture, _ = setup_architecture(client, "supporting-enums@example.com")
    stakeholder = post_supporting(
        client,
        owner["workspace"]["id"],
        architecture["id"],
        owner["accessToken"],
        "stakeholders",
        {"name": "Stakeholder"},
    )
    impact = post_supporting(
        client,
        owner["workspace"]["id"],
        architecture["id"],
        owner["accessToken"],
        "business-impacts",
        {"impactedArea": "Impact"},
    )
    requests = [
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/business-architecture/{architecture['id']}/stakeholders",
            {"name": "Bad", "stakeholderType": "bogus"},
        ),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/business-architecture/{architecture['id']}/business-impacts",
            {"impactedArea": "Bad", "impactType": "bogus"},
        ),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/business-architecture/{architecture['id']}/business-impacts",
            {"impactedArea": "Bad", "severity": "bogus"},
        ),
        (
            "patch",
            f"/workspaces/{owner['workspace']['id']}/stakeholders/{stakeholder['id']}",
            {"status": "bogus"},
        ),
        (
            "patch",
            f"/workspaces/{owner['workspace']['id']}/business-impacts/{impact['id']}",
            {"status": "bogus"},
        ),
    ]
    for method, path, payload in requests:
        assert_error(
            getattr(client, method)(path, headers=auth_headers(owner["accessToken"]), json=payload),
            422,
            "validation_error",
        )


def test_origin_not_client_writable(client: TestClient) -> None:
    owner, architecture, _ = setup_architecture(client, "supporting-origin@example.com")
    process = post_supporting(
        client,
        owner["workspace"]["id"],
        architecture["id"],
        owner["accessToken"],
        "processes",
        {"processName": "Process"},
    )
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/business-architecture/{architecture['id']}/processes",
            headers=auth_headers(owner["accessToken"]),
            json={"processName": "Discovery process", "origin": "discovery"},
        ),
        422,
        "validation_error",
    )
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/processes/{process['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"origin": "discovery"},
        ),
        422,
        "validation_error",
    )


def test_patch_rejects_unknown_columns(client: TestClient) -> None:
    owner, architecture, _ = setup_architecture(client, "supporting-patch-fields@example.com")
    process = post_supporting(
        client,
        owner["workspace"]["id"],
        architecture["id"],
        owner["accessToken"],
        "processes",
        {"processName": "Process"},
    )
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/processes/{process['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"workspaceId": str(uuid.uuid4())},
        ),
        422,
        "validation_error",
    )
