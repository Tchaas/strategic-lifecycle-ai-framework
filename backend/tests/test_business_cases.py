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


def create_objective(client: TestClient, workspace_id: str, token: str, name: str = "Objective") -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/strategic-objectives",
        headers=auth_headers(token),
        json={"strategicInitiativeName": name},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def activate_objective(client: TestClient, workspace_id: str, token: str, objective_id: str) -> dict[str, Any]:
    response = client.patch(
        f"/workspaces/{workspace_id}/strategic-objectives/{objective_id}",
        headers=auth_headers(token),
        json={
            "executiveObjective": "Executive goal",
            "strategicValueCategory": "cost_reduction",
            "problemOpportunityStatement": "Problem",
            "valueHypothesis": "Hypothesis",
            "status": "active",
        },
    )
    assert response.status_code == 200, response.text
    return cast(dict[str, Any], response.json())


def create_case(
    client: TestClient,
    workspace_id: str,
    objective_id: str,
    token: str,
    title: str = "Case",
    **payload: Any,
) -> dict[str, Any]:
    body = {"title": title, **payload}
    response = client.post(
        f"/workspaces/{workspace_id}/strategic-objectives/{objective_id}/lean-business-cases",
        headers=auth_headers(token),
        json=body,
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def activate_case(client: TestClient, workspace_id: str, case_id: str, token: str) -> dict[str, Any]:
    response = client.patch(
        f"/workspaces/{workspace_id}/lean-business-cases/{case_id}",
        headers=auth_headers(token),
        json={
            "summary": "Summary",
            "problemOpportunityStatement": "Problem",
            "valueHypothesis": "Hypothesis",
            "priority": "high",
            "status": "active",
        },
    )
    assert response.status_code == 200, response.text
    return cast(dict[str, Any], response.json())


def archive_case(client: TestClient, workspace_id: str, case_id: str, token: str) -> dict[str, Any]:
    response = client.patch(
        f"/workspaces/{workspace_id}/lean-business-cases/{case_id}/status",
        headers=auth_headers(token),
        json={"status": "archived"},
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


def create_stream(client: TestClient, workspace_id: str, architecture_id: str, token: str, name: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture/{architecture_id}/value-streams",
        headers=auth_headers(token),
        json={"name": name},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_activity(client: TestClient, workspace_id: str, stream_id: str, token: str, name: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/value-streams/{stream_id}/key-activities",
        headers=auth_headers(token),
        json={"activityName": name},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_capability(
    client: TestClient,
    workspace_id: str,
    architecture_id: str,
    token: str,
    name: str,
) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture/{architecture_id}/capabilities",
        headers=auth_headers(token),
        json={"capabilityName": name},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def test_case_cap_counts_non_archived(client: TestClient) -> None:
    owner = signup(client, "case-cap@example.com", "Case Cap Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    cases = [
        create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], f"Case {idx}")
        for idx in range(10)
    ]
    response = client.post(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/lean-business-cases",
        headers=auth_headers(owner["accessToken"]),
        json={"title": "Case 11"},
    )
    assert_error(response, 409, "cardinality_limit")
    assert response.json()["error"]["details"] == {"limit": 10, "current": 10}
    archive_case(client, owner["workspace"]["id"], cases[0]["id"], owner["accessToken"])
    create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], "Replacement")


def test_case_status_filter(client: TestClient) -> None:
    owner = signup(client, "case-filter@example.com", "Case Filter Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    active = create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], "Active")
    activate_case(client, owner["workspace"]["id"], active["id"], owner["accessToken"])
    create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], "Draft")

    response = client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/lean-business-cases",
        headers=auth_headers(owner["accessToken"]),
        params={"status": "active"},
    )
    assert response.status_code == 200
    assert [case["title"] for case in response.json()] == ["Active"]
    assert_error(
        client.get(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/lean-business-cases",
            headers=auth_headers(owner["accessToken"]),
            params={"status": "bogus"},
        ),
        422,
        "validation_error",
    )


def test_case_ownership_and_owner_display(client: TestClient, engine: sa.Engine) -> None:
    owner = signup(client, "case-owner@example.com", "Case Owner Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    member_id = create_password_user(engine, "case-owner-member@example.com", "Case Owner Member")
    non_member_id = create_password_user(engine, "case-owner-outsider@example.com", "Case Owner Outsider")
    add_member(engine, owner["workspace"]["id"], member_id, owner["user"]["id"])
    case = create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], "Owned")
    assert case["ownerUserId"] == owner["user"]["id"]

    reassigned = client.patch(
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}",
        headers=auth_headers(owner["accessToken"]),
        json={"ownerUserId": str(member_id)},
    )
    assert reassigned.status_code == 200
    detail = client.get(
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    assert detail["ownerUserId"] == str(member_id)
    assert detail["ownerFullName"] == "Case Owner Member"
    assert detail["ownerEmail"] == "case-owner-member@example.com"
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"ownerUserId": str(non_member_id)},
        ),
        404,
        "not_found",
    )


def test_dual_patch_lifecycle(client: TestClient) -> None:
    owner = signup(client, "case-lifecycle@example.com", "Case Lifecycle Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    draft_case = create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], "Draft")
    activated = activate_case(client, owner["workspace"]["id"], draft_case["id"], owner["accessToken"])
    assert activated["status"] == "active"
    completed = client.patch(
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{draft_case['id']}",
        headers=auth_headers(owner["accessToken"]),
        json={"status": "completed"},
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"

    for source_status in ("draft", "active", "completed"):
        case = create_case(
            client,
            owner["workspace"]["id"],
            objective["id"],
            owner["accessToken"],
            f"Archive {source_status}",
        )
        if source_status == "active":
            activate_case(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
        elif source_status == "completed":
            activate_case(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
            assert (
                client.patch(
                    f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}",
                    headers=auth_headers(owner["accessToken"]),
                    json={"status": "completed"},
                ).status_code
                == 200
            )
        archived = archive_case(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
        assert archived["status"] == "archived"
        reactivated = client.patch(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/status",
            headers=auth_headers(owner["accessToken"]),
            json={"status": "draft"},
        )
        assert reactivated.status_code == 200
        assert reactivated.json()["status"] == "draft"

    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{draft_case['id']}/status",
            headers=auth_headers(owner["accessToken"]),
            json={"status": "active"},
        ),
        409,
        "invalid_transition",
    )
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{draft_case['id']}/status",
            headers=auth_headers(owner["accessToken"]),
            json={"status": "completed"},
        ),
        409,
        "invalid_transition",
    )


def test_case_activation_gate_and_reactivation_guard(client: TestClient) -> None:
    owner = signup(client, "case-gate@example.com", "Case Gate Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    case = create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], "Gate")
    missing = client.patch(
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}",
        headers=auth_headers(owner["accessToken"]),
        json={"status": "active"},
    )
    assert_error(missing, 409, "activation_gate")
    assert missing.json()["error"]["details"]["missing"] == [
        "summary",
        "problemOpportunityStatement",
        "valueHypothesis",
        "priority",
    ]
    activate_case(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    archive_case(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/status",
            headers=auth_headers(owner["accessToken"]),
            json={"status": "draft"},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"summary": ""},
        ).status_code
        == 200
    )
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"status": "active"},
        ),
        409,
        "activation_gate",
    )


def test_gate_maintenance_cases_and_objectives(client: TestClient) -> None:
    owner = signup(client, "case-maintenance@example.com", "Case Maintenance Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    activate_objective(client, owner["workspace"]["id"], owner["accessToken"], objective["id"])
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"executiveObjective": ""},
        ),
        409,
        "activation_gate",
    )

    active_case = create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], "Active case")
    activate_case(client, owner["workspace"]["id"], active_case["id"], owner["accessToken"])
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{active_case['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"summary": ""},
        ),
        409,
        "activation_gate",
    )
    draft_case = create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], "Draft case")
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{draft_case['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"summary": ""},
        ).status_code
        == 200
    )


def test_case_links_traceability_and_financials(client: TestClient) -> None:
    owner = signup(client, "case-links@example.com", "Case Links Co")
    other = signup(client, "case-links-other@example.com", "Other Links Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    stream = create_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Stream A")
    activity = create_activity(client, owner["workspace"]["id"], stream["id"], owner["accessToken"], "Activity K")
    capability = create_capability(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Cap X")
    other_architecture = create_architecture(client, other["workspace"]["id"], other["accessToken"])
    other_stream = create_stream(
        client, other["workspace"]["id"], other_architecture["id"], other["accessToken"], "Other"
    )
    case = create_case(
        client,
        owner["workspace"]["id"],
        objective["id"],
        owner["accessToken"],
        "Linked case",
        forecastCost=125.0,
        forecastValue=400.0,
    )
    paths = [
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/value-streams/{stream['id']}",
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/key-activities/{activity['id']}",
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/capabilities/{capability['id']}",
    ]
    for path in paths:
        assert client.post(path, headers=auth_headers(owner["accessToken"])).status_code == 201
        assert_error(client.post(path, headers=auth_headers(owner["accessToken"])), 409, "already_linked")

    detail = client.get(
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    assert detail["valueStreamIds"] == [stream["id"]]
    assert detail["keyActivityIds"] == [activity["id"]]
    assert detail["capabilityIds"] == [capability["id"]]
    trace = client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/traceability",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    assert trace["keyActivities"][0]["id"] == activity["id"]
    assert trace["keyActivities"][0]["viaCaseIds"] == [case["id"]]
    financials = client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/financials",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    assert financials["forecast"] == {"cost": 125.0, "value": 400.0}

    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/value-streams/{other_stream['id']}",
            headers=auth_headers(owner["accessToken"]),
        ),
        404,
        "not_found",
    )
    for path in paths:
        assert client.delete(path, headers=auth_headers(owner["accessToken"])).status_code == 204
        assert_error(client.delete(path, headers=auth_headers(owner["accessToken"])), 404, "not_found")


def test_objective_archived_blocks_new_cases(client: TestClient) -> None:
    owner = signup(client, "case-objective-archived@example.com", "Case Objective Archived Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], "Before archive")
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"status": "archived"},
        ).status_code
        == 200
    )
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/lean-business-cases",
            headers=auth_headers(owner["accessToken"]),
            json={"title": "Blocked"},
        ),
        409,
        "objective_archived",
    )
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"status": "draft"},
        ).status_code
        == 200
    )
    create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], "After archive")


def test_case_tenancy_and_non_admin_writes(client: TestClient, engine: sa.Engine) -> None:
    owner = signup(client, "case-tenant@example.com", "Case Tenant Co")
    outsider = signup(client, "case-outsider@example.com", "Case Outsider Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    member_id = create_password_user(engine, "case-member@example.com", "Case Member")
    add_member(engine, owner["workspace"]["id"], member_id, owner["user"]["id"])
    member_token = create_access_token(member_id)
    case = create_case(client, owner["workspace"]["id"], objective["id"], member_token, "Member case")
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}",
            headers=auth_headers(member_token),
            json={"summary": "Member edit"},
        ).status_code
        == 200
    )
    assert archive_case(client, owner["workspace"]["id"], case["id"], member_token)["status"] == "archived"

    nonexistent = client.get(
        f"/workspaces/{uuid.uuid4()}/strategic-objectives/{objective['id']}/lean-business-cases",
        headers=auth_headers(outsider["accessToken"]),
    )
    cross_tenant = client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/lean-business-cases",
        headers=auth_headers(outsider["accessToken"]),
    )
    assert nonexistent.status_code == 404
    assert cross_tenant.status_code == 404
    assert nonexistent.content == cross_tenant.content
    for method, path, payload in (
        ("get", f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}", None),
        ("patch", f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}", {"summary": "Denied"}),
        (
            "patch",
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/status",
            {"status": "draft"},
        ),
    ):
        if payload is None:
            response = getattr(client, method)(path, headers=auth_headers(outsider["accessToken"]))
        else:
            response = getattr(client, method)(path, headers=auth_headers(outsider["accessToken"]), json=payload)
        assert_error(response, 404, "not_found")
