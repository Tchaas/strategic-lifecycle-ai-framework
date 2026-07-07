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


def create_password_user(engine: sa.Engine, email: str) -> uuid.UUID:
    with engine.begin() as conn:
        return cast(
            uuid.UUID,
            conn.scalar(
                text("""
                    INSERT INTO users (email, full_name, auth_provider, password_hash)
                    VALUES (:email, 'Member', 'password', :password_hash)
                    RETURNING id
                    """),
                {"email": email, "password_hash": hash_password("correct-horse")},
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


def create_objective(
    client: TestClient,
    workspace_id: str,
    token: str,
    *,
    name: str = "Objective",
) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/strategic-objectives",
        headers=auth_headers(token),
        json={"strategicInitiativeName": name},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_case(
    client: TestClient,
    workspace_id: str,
    token: str,
    *,
    objective_id: str | None = None,
    title: str = "Case",
    **payload: Any,
) -> dict[str, Any]:
    if objective_id is None:
        objective_id = create_objective(client, workspace_id, token)["id"]
    body = {"title": title, **payload}
    response = client.post(
        f"/workspaces/{workspace_id}/strategic-objectives/{objective_id}/lean-business-cases",
        headers=auth_headers(token),
        json=body,
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def archive_case(client: TestClient, workspace_id: str, case_id: str, token: str) -> None:
    response = client.patch(
        f"/workspaces/{workspace_id}/lean-business-cases/{case_id}/status",
        headers=auth_headers(token),
        json={"status": "archived"},
    )
    assert response.status_code == 200, response.text


def reactivate_case(client: TestClient, workspace_id: str, case_id: str, token: str) -> None:
    response = client.patch(
        f"/workspaces/{workspace_id}/lean-business-cases/{case_id}/status",
        headers=auth_headers(token),
        json={"status": "draft"},
    )
    assert response.status_code == 200, response.text


def activate_case(client: TestClient, workspace_id: str, case_id: str, token: str) -> dict[str, Any]:
    response = client.patch(
        f"/workspaces/{workspace_id}/lean-business-cases/{case_id}",
        headers=auth_headers(token),
        json={
            "summary": "Summary",
            "problemOpportunityStatement": "Problem",
            "valueHypothesis": "Value",
            "priority": "high",
            "status": "active",
        },
    )
    assert response.status_code == 200, response.text
    return cast(dict[str, Any], response.json())


def create_architecture(client: TestClient, workspace_id: str, token: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture",
        headers=auth_headers(token),
        json={"name": "Architecture"},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_stream(
    client: TestClient,
    workspace_id: str,
    architecture_id: str,
    token: str,
    name: str = "Stream",
) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture/{architecture_id}/value-streams",
        headers=auth_headers(token),
        json={"name": name},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_implementation(
    client: TestClient,
    workspace_id: str,
    case_id: str,
    token: str,
    **payload: Any,
) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/lean-business-cases/{case_id}/implementation",
        headers=auth_headers(token),
        json=payload,
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_allocation(
    client: TestClient,
    workspace_id: str,
    implementation_id: str,
    stream_id: str,
    token: str,
    **payload: Any,
) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/implementation/{implementation_id}/value-streams/{stream_id}",
        headers=auth_headers(token),
        json=payload,
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def get_implementation(client: TestClient, workspace_id: str, case_id: str, token: str) -> dict[str, Any]:
    response = client.get(
        f"/workspaces/{workspace_id}/lean-business-cases/{case_id}/implementation",
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text
    return cast(dict[str, Any], response.json())


def test_implementation_one_to_one_and_get_before_create(client: TestClient) -> None:
    owner = signup(client, "implementation-one@example.com", "Implementation One Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    assert_error(
        client.get(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/implementation",
            headers=auth_headers(owner["accessToken"]),
        ),
        404,
        "not_found",
    )
    implementation = create_implementation(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    assert implementation["implementationStatus"] == "not_started"
    assert implementation["actualCost"] is None
    assert implementation["actualValue"] is None
    assert implementation["allocations"] == []
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/implementation",
            headers=auth_headers(owner["accessToken"]),
            json={},
        ),
        409,
        "implementation_exists",
    )


def test_case_archived_blocks_implementation_creation(client: TestClient) -> None:
    owner = signup(client, "implementation-archived@example.com", "Implementation Archived Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    archive_case(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/implementation",
            headers=auth_headers(owner["accessToken"]),
            json={},
        ),
        409,
        "case_archived",
    )
    reactivate_case(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    create_implementation(client, owner["workspace"]["id"], case["id"], owner["accessToken"])


def test_implementation_field_restriction_and_patch(client: TestClient) -> None:
    owner = signup(client, "implementation-fields@example.com", "Implementation Fields Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/implementation",
            headers=auth_headers(owner["accessToken"]),
            json={"actualCost": 10},
        ),
        422,
        "validation_error",
    )
    implementation = create_implementation(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"actualCost": 10},
        ),
        422,
        "validation_error",
    )
    updated = client.patch(
        f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}",
        headers=auth_headers(owner["accessToken"]),
        json={
            "implementationStatus": "in_progress",
            "startDate": "2026-01-15",
            "completionDate": "2026-03-30",
            "outcomeNotes": "Pilot started",
            "valueType": "efficiency",
        },
    )
    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["implementationStatus"] == "in_progress"
    assert body["startDate"] == "2026-01-15"
    assert body["completionDate"] == "2026-03-30"
    assert body["outcomeNotes"] == "Pilot started"
    assert body["valueType"] == "efficiency"
    assert body["actualCost"] is None


def test_implementation_status_transitions_are_free(client: TestClient) -> None:
    owner = signup(client, "implementation-status@example.com", "Implementation Status Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    implementation = create_implementation(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    for target in ["in_progress", "on_hold", "in_progress", "completed", "on_hold"]:
        response = client.patch(
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"implementationStatus": target},
        )
        assert response.status_code == 200, response.text
        assert response.json()["implementationStatus"] == target
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"implementationStatus": "archived"},
        ),
        422,
        "validation_error",
    )


def test_allocation_lifecycle_and_cross_workspace_guard(client: TestClient) -> None:
    owner = signup(client, "implementation-allocation@example.com", "Implementation Allocation Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    implementation = create_implementation(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    stream = create_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Allocated")
    other = signup(client, "implementation-allocation-other@example.com", "Other Allocation Co")
    other_architecture = create_architecture(client, other["workspace"]["id"], other["accessToken"])
    other_stream = create_stream(
        client,
        other["workspace"]["id"],
        other_architecture["id"],
        other["accessToken"],
        "Other",
    )
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{other_stream['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"allocatedCost": 1},
        ),
        404,
        "not_found",
    )
    allocation = create_allocation(
        client,
        owner["workspace"]["id"],
        implementation["id"],
        stream["id"],
        owner["accessToken"],
        allocatedCost=100.5,
        allocatedValue=250.25,
    )
    assert allocation["valueStreamId"] == stream["id"]
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{stream['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={},
        ),
        409,
        "already_linked",
    )
    patched = client.patch(
        f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{stream['id']}",
        headers=auth_headers(owner["accessToken"]),
        json={"allocatedCost": 150, "allocatedValue": 300},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["allocatedCost"] == 150
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{stream['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{stream['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"allocatedCost": 1},
        ),
        404,
        "not_found",
    )
    assert_error(
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{stream['id']}",
            headers=auth_headers(owner["accessToken"]),
        ),
        404,
        "not_found",
    )


def test_allocation_recomputes_actuals_and_unlinked_stream_allowed(client: TestClient) -> None:
    owner = signup(client, "implementation-recompute@example.com", "Implementation Recompute Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    implementation = create_implementation(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    linked_stream = create_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Linked")
    unlinked_stream = create_stream(
        client,
        owner["workspace"]["id"],
        architecture["id"],
        owner["accessToken"],
        "Unlinked but allocatable",
    )
    link_response = client.post(
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/value-streams/{linked_stream['id']}",
        headers=auth_headers(owner["accessToken"]),
    )
    assert link_response.status_code == 201, link_response.text

    create_allocation(
        client,
        owner["workspace"]["id"],
        implementation["id"],
        unlinked_stream["id"],
        owner["accessToken"],
        allocatedCost=None,
        allocatedValue=500,
    )
    detail = get_implementation(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    assert detail["actualCost"] == 0
    assert detail["actualValue"] == 500
    assert detail["allocations"][0]["valueStreamId"] == unlinked_stream["id"]

    patched = client.patch(
        f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{unlinked_stream['id']}",
        headers=auth_headers(owner["accessToken"]),
        json={"allocatedCost": 125, "allocatedValue": None},
    )
    assert patched.status_code == 200, patched.text
    detail = get_implementation(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    assert detail["actualCost"] == 125
    assert detail["actualValue"] == 0

    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{unlinked_stream['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )
    detail = get_implementation(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    assert detail["actualCost"] is None
    assert detail["actualValue"] is None
    assert detail["allocations"] == []


def test_objective_financials_end_to_end_from_public_api(client: TestClient) -> None:
    owner = signup(client, "implementation-financials@example.com", "Implementation Financials Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"], name="Financial Objective")
    case = create_case(
        client,
        owner["workspace"]["id"],
        owner["accessToken"],
        objective_id=objective["id"],
        title="Financial Case",
        forecastCost=1000,
        forecastValue=2500,
    )
    activate_case(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    implementation = create_implementation(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    stream_a = create_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Alpha")
    stream_b = create_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Beta")
    create_allocation(
        client,
        owner["workspace"]["id"],
        implementation["id"],
        stream_a["id"],
        owner["accessToken"],
        allocatedCost=200,
        allocatedValue=800,
    )
    create_allocation(
        client,
        owner["workspace"]["id"],
        implementation["id"],
        stream_b["id"],
        owner["accessToken"],
        allocatedCost=300,
        allocatedValue=900,
    )

    financials = client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/financials",
        headers=auth_headers(owner["accessToken"]),
    )
    assert financials.status_code == 200, financials.text
    body = financials.json()
    assert body["forecast"] == {"cost": 1000.0, "value": 2500.0}
    assert body["actuals"] == {"cost": 500.0, "value": 1700.0}
    assert body["variance"] == {"cost": -500.0, "value": -800.0}
    assert body["byValueStream"] == [
        {"valueStreamId": stream_a["id"], "name": "Alpha", "allocatedCost": 200.0, "allocatedValue": 800.0},
        {"valueStreamId": stream_b["id"], "name": "Beta", "allocatedCost": 300.0, "allocatedValue": 900.0},
    ]


def test_implementation_tenancy_and_non_admin_writes(client: TestClient, engine: sa.Engine) -> None:
    owner = signup(client, "implementation-tenancy@example.com", "Implementation Tenancy Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    member_user_id = create_password_user(engine, "implementation-member@example.com")
    add_member(engine, owner["workspace"]["id"], member_user_id, owner["user"]["id"])
    member_token = create_access_token(member_user_id)
    outsider = signup(client, "implementation-outsider@example.com", "Implementation Outsider Co")
    implementation = create_implementation(client, owner["workspace"]["id"], case["id"], member_token)
    architecture = create_architecture(client, owner["workspace"]["id"], member_token)
    stream = create_stream(client, owner["workspace"]["id"], architecture["id"], member_token, "Member stream")
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}",
            headers=auth_headers(member_token),
            json={"implementationStatus": "in_progress"},
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{stream['id']}",
            headers=auth_headers(member_token),
            json={"allocatedCost": 10, "allocatedValue": 20},
        ).status_code
        == 201
    )
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{stream['id']}",
            headers=auth_headers(member_token),
            json={"allocatedCost": 15, "allocatedValue": 25},
        ).status_code
        == 200
    )
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{stream['id']}",
            headers=auth_headers(member_token),
        ).status_code
        == 204
    )

    nonexistent = client.get(
        f"/workspaces/{uuid.uuid4()}/lean-business-cases/{case['id']}/implementation",
        headers=auth_headers(outsider["accessToken"]),
    )
    cross_tenant = client.get(
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/implementation",
        headers=auth_headers(outsider["accessToken"]),
    )
    assert nonexistent.status_code == 404
    assert cross_tenant.status_code == 404
    assert nonexistent.content == cross_tenant.content

    route_checks = [
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/implementation",
            {},
        ),
        (
            "patch",
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}",
            {"implementationStatus": "completed"},
        ),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{stream['id']}",
            {},
        ),
        (
            "patch",
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{stream['id']}",
            {},
        ),
        (
            "delete",
            f"/workspaces/{owner['workspace']['id']}/implementation/{implementation['id']}/value-streams/{stream['id']}",
            None,
        ),
    ]
    for method, path, payload in route_checks:
        if payload is None:
            response = getattr(client, method)(path, headers=auth_headers(outsider["accessToken"]))
        else:
            response = getattr(client, method)(path, headers=auth_headers(outsider["accessToken"]), json=payload)
        assert_error(response, 404, "not_found")
