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


def create_objective(client: TestClient, workspace_id: str, token: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/strategic-objectives",
        headers=auth_headers(token),
        json={"strategicInitiativeName": "Objective"},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_case(client: TestClient, workspace_id: str, objective_id: str, token: str, title: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/strategic-objectives/{objective_id}/lean-business-cases",
        headers=auth_headers(token),
        json={"title": title},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_case_with_objective(client: TestClient, owner: dict[str, Any], title: str = "Case") -> dict[str, Any]:
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    return create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], title)


def create_discovery(client: TestClient, workspace_id: str, case_id: str, token: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/lean-business-cases/{case_id}/discovery",
        headers=auth_headers(token),
        json={"problemStatement": "Problem"},
    )
    assert response.status_code == 201, response.text
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


def create_process(client: TestClient, workspace_id: str, architecture_id: str, token: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture/{architecture_id}/processes",
        headers=auth_headers(token),
        json={"processName": "Process"},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_stakeholder(client: TestClient, workspace_id: str, architecture_id: str, token: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture/{architecture_id}/stakeholders",
        headers=auth_headers(token),
        json={"name": "Persona"},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_concept(client: TestClient, workspace_id: str, architecture_id: str, token: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture/{architecture_id}/information-concepts",
        headers=auth_headers(token),
        json={"conceptName": "Concept"},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def test_discovery_one_to_one(client: TestClient) -> None:
    owner = signup(client, "discovery-one@example.com", "Discovery One Co")
    case_one = create_case_with_objective(client, owner, "Case One")
    case_two = create_case_with_objective(client, owner, "Case Two")
    assert_error(
        client.get(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case_one['id']}/discovery",
            headers=auth_headers(owner["accessToken"]),
        ),
        404,
        "not_found",
    )
    discovery = create_discovery(client, owner["workspace"]["id"], case_one["id"], owner["accessToken"])
    assert discovery["status"] == "draft"
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case_one['id']}/discovery",
            headers=auth_headers(owner["accessToken"]),
            json={},
        ),
        409,
        "discovery_exists",
    )
    other_discovery = create_discovery(client, owner["workspace"]["id"], case_two["id"], owner["accessToken"])
    assert other_discovery["leanBusinessCaseId"] == case_two["id"]


def test_discovery_patch_findings_and_reject_unknown(client: TestClient) -> None:
    owner = signup(client, "discovery-patch@example.com", "Discovery Patch Co")
    case = create_case_with_objective(client, owner)
    discovery = create_discovery(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    payload = {
        "problemStatement": "Problem",
        "personaFindings": "Personas",
        "journeyMap": "Journey",
        "currentStateProcessMap": "Map",
        "bottleneckAnalysis": "Bottleneck",
        "dataFindings": "Data",
        "legacyConstraints": "Legacy",
        "futureStateNeeds": "Future",
        "discoveryMetrics": "Metrics",
        "governanceFindings": "Governance",
    }
    response = client.patch(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}",
        headers=auth_headers(owner["accessToken"]),
        json=payload,
    )
    assert response.status_code == 200
    for key, value in payload.items():
        assert response.json()[key] == value
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"origin": "discovery"},
        ),
        422,
        "validation_error",
    )


def test_discovery_linear_lifecycle(client: TestClient) -> None:
    owner = signup(client, "discovery-life@example.com", "Discovery Life Co")
    case = create_case_with_objective(client, owner)
    discovery = create_discovery(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"status": "active"},
        ).json()["status"]
        == "active"
    )
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"status": "completed"},
        ).json()["status"]
        == "completed"
    )
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"status": "active"},
        ),
        409,
        "invalid_transition",
    )
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"status": "archived"},
        ),
        422,
        "validation_error",
    )


def test_discovery_reference_links(client: TestClient) -> None:
    owner = signup(client, "discovery-links@example.com", "Discovery Links Co")
    other = signup(client, "discovery-links-other@example.com", "Other Links Co")
    case = create_case_with_objective(client, owner)
    discovery = create_discovery(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    stakeholder = create_stakeholder(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"])
    process = create_process(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"])
    concept = create_concept(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"])
    other_arch = create_architecture(client, other["workspace"]["id"], other["accessToken"])
    other_persona = create_stakeholder(client, other["workspace"]["id"], other_arch["id"], other["accessToken"])
    paths = [
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/personas/{stakeholder['id']}",
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/processes/{process['id']}",
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/information-concepts/{concept['id']}",
    ]
    for path in paths:
        assert client.post(path, headers=auth_headers(owner["accessToken"])).status_code == 201
        assert_error(client.post(path, headers=auth_headers(owner["accessToken"])), 409, "already_linked")
        assert client.delete(path, headers=auth_headers(owner["accessToken"])).status_code == 204
        assert_error(client.delete(path, headers=auth_headers(owner["accessToken"])), 404, "not_found")
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/personas/{other_persona['id']}",
            headers=auth_headers(owner["accessToken"]),
        ),
        404,
        "not_found",
    )


def test_roll_down_guard_origin_and_normal_visibility(client: TestClient) -> None:
    owner = signup(client, "discovery-roll@example.com", "Discovery Roll Co")
    case = create_case_with_objective(client, owner)
    discovery = create_discovery(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    no_ba_routes = [
        ("value-streams", {"name": "Stream"}),
        ("key-activities", {"valueStreamId": str(uuid.uuid4()), "activityName": "Activity"}),
        ("capabilities", {"capabilityName": "Capability"}),
        ("business-impacts", {"impactedArea": "Area"}),
        ("personas", {"name": "Persona"}),
        ("processes", {"processName": "Process"}),
        ("information-concepts", {"conceptName": "Concept"}),
    ]
    for suffix, payload in no_ba_routes:
        assert_error(
            client.post(
                f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/{suffix}",
                headers=auth_headers(owner["accessToken"]),
                json=payload,
            ),
            409,
            "architecture_required",
        )
    architecture = client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/business-architecture",
        headers=auth_headers(owner["accessToken"]),
        json={"name": "Discovery Architecture"},
    )
    assert architecture.status_code == 201
    assert architecture.json()["origin"] == "discovery"
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/business-architecture",
            headers=auth_headers(owner["accessToken"]),
            json={"name": "Duplicate"},
        ),
        409,
        "architecture_exists",
    )
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/business-architecture",
            headers=auth_headers(owner["accessToken"]),
            json={"name": "Duplicate"},
        ),
        409,
        "architecture_exists",
    )
    stream = client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/value-streams",
        headers=auth_headers(owner["accessToken"]),
        json={"name": "Discovery Stream"},
    ).json()
    activity = client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/key-activities",
        headers=auth_headers(owner["accessToken"]),
        json={"valueStreamId": stream["id"], "activityName": "Discovery Activity"},
    ).json()
    capability = client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/capabilities",
        headers=auth_headers(owner["accessToken"]),
        json={"capabilityName": "Discovery Capability"},
    ).json()
    impact = client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/business-impacts",
        headers=auth_headers(owner["accessToken"]),
        json={"impactedArea": "Discovery Impact"},
    ).json()
    assert [stream["origin"], activity["origin"], capability["origin"], impact["origin"]] == ["discovery"] * 4
    normal_streams = client.get(
        f"/workspaces/{owner['workspace']['id']}/business-architecture/{architecture.json()['id']}/value-streams",
        headers=auth_headers(owner["accessToken"]),
    ).json()["items"]
    assert normal_streams[0]["id"] == stream["id"]
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{stream['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"origin": "architecture"},
        ),
        422,
        "validation_error",
    )


def test_roll_down_atomic_create_and_link(client: TestClient) -> None:
    owner = signup(client, "discovery-atomic@example.com", "Discovery Atomic Co")
    case = create_case_with_objective(client, owner)
    discovery = create_discovery(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/business-architecture",
        headers=auth_headers(owner["accessToken"]),
        json={"name": "Architecture"},
    )
    stakeholder = client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/personas",
        headers=auth_headers(owner["accessToken"]),
        json={"name": "Discovery Persona"},
    ).json()
    process = client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/processes",
        headers=auth_headers(owner["accessToken"]),
        json={"processName": "Discovery Process"},
    ).json()
    concept = client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/information-concepts",
        headers=auth_headers(owner["accessToken"]),
        json={"conceptName": "Discovery Concept"},
    ).json()
    assert stakeholder["origin"] == "discovery"
    assert process["origin"] == "discovery"
    assert concept["origin"] == "discovery"
    detail = client.get(
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/discovery",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    assert detail["stakeholderPersonaIds"] == [stakeholder["id"]]
    assert detail["businessProcessIds"] == [process["id"]]
    assert detail["informationConceptIds"] == [concept["id"]]


def test_mixed_origin_caps(client: TestClient) -> None:
    owner = signup(client, "discovery-caps@example.com", "Discovery Caps Co")
    case = create_case_with_objective(client, owner)
    discovery = create_discovery(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    streams = [
        create_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], f"Arch {idx}")
        for idx in range(4)
    ]
    for idx in range(2):
        response = client.post(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/value-streams",
            headers=auth_headers(owner["accessToken"]),
            json={"name": f"Discovery {idx}"},
        )
        assert response.status_code == 201
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/value-streams",
            headers=auth_headers(owner["accessToken"]),
            json={"name": "Too many"},
        ),
        409,
        "cardinality_limit",
    )
    activities = [
        create_activity(client, owner["workspace"]["id"], streams[0]["id"], owner["accessToken"], f"Arch KA {idx}")
        for idx in range(4)
    ]
    assert len(activities) == 4
    for idx in range(2):
        response = client.post(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/key-activities",
            headers=auth_headers(owner["accessToken"]),
            json={"valueStreamId": streams[0]["id"], "activityName": f"Discovery KA {idx}"},
        )
        assert response.status_code == 201
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/value-streams/{streams[0]['id']}/key-activities",
            headers=auth_headers(owner["accessToken"]),
            json={"activityName": "Too many"},
        ),
        409,
        "cardinality_limit",
    )


def test_discovery_tenancy_and_non_admin_writes(client: TestClient, engine: sa.Engine) -> None:
    owner = signup(client, "discovery-tenant@example.com", "Discovery Tenant Co")
    outsider = signup(client, "discovery-outsider@example.com", "Discovery Outsider Co")
    case = create_case_with_objective(client, owner)
    member_id = create_password_user(engine, "discovery-member@example.com")
    add_member(engine, owner["workspace"]["id"], member_id, owner["user"]["id"])
    member_token = create_access_token(member_id)
    discovery = create_discovery(client, owner["workspace"]["id"], case["id"], member_token)
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}",
            headers=auth_headers(member_token),
            json={"status": "active"},
        ).status_code
        == 200
    )
    architecture = client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/business-architecture",
        headers=auth_headers(member_token),
        json={"name": "Member architecture"},
    ).json()
    stream = client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/value-streams",
        headers=auth_headers(member_token),
        json={"name": "Member stream"},
    ).json()
    assert architecture["origin"] == "discovery"
    assert stream["origin"] == "discovery"
    assert (
        client.post(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/key-activities",
            headers=auth_headers(member_token),
            json={"valueStreamId": stream["id"], "activityName": "Member activity"},
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/capabilities",
            headers=auth_headers(member_token),
            json={"capabilityName": "Member capability"},
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/business-impacts",
            headers=auth_headers(member_token),
            json={"impactedArea": "Member impact"},
        ).status_code
        == 201
    )
    stakeholder = client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/personas",
        headers=auth_headers(member_token),
        json={"name": "Member persona"},
    ).json()
    process = client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/processes",
        headers=auth_headers(member_token),
        json={"processName": "Member process"},
    ).json()
    concept = client.post(
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/information-concepts",
        headers=auth_headers(member_token),
        json={"conceptName": "Member concept"},
    ).json()
    member_link_paths = [
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/personas/{stakeholder['id']}",
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/processes/{process['id']}",
        f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/information-concepts/{concept['id']}",
    ]
    for path in member_link_paths:
        assert client.delete(path, headers=auth_headers(member_token)).status_code == 204
        assert client.post(path, headers=auth_headers(member_token)).status_code == 201
    nonexistent = client.get(
        f"/workspaces/{uuid.uuid4()}/lean-business-cases/{case['id']}/discovery",
        headers=auth_headers(outsider["accessToken"]),
    )
    cross_tenant = client.get(
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/discovery",
        headers=auth_headers(outsider["accessToken"]),
    )
    assert nonexistent.status_code == 404
    assert cross_tenant.status_code == 404
    assert nonexistent.content == cross_tenant.content
    routes = [
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/discovery",
            {"problemStatement": "No"},
        ),
        ("patch", f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}", {"problemStatement": "No"}),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/personas/{stakeholder['id']}",
            None,
        ),
        (
            "delete",
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/personas/{stakeholder['id']}",
            None,
        ),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/processes/{process['id']}",
            None,
        ),
        (
            "delete",
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/processes/{process['id']}",
            None,
        ),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/information-concepts/{concept['id']}",
            None,
        ),
        (
            "delete",
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/information-concepts/{concept['id']}",
            None,
        ),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/business-architecture",
            {"name": "No"},
        ),
        ("post", f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/value-streams", {"name": "No"}),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/key-activities",
            {"valueStreamId": str(uuid.uuid4()), "activityName": "No"},
        ),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/capabilities",
            {"capabilityName": "No"},
        ),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/business-impacts",
            {"impactedArea": "No"},
        ),
        ("post", f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/personas", {"name": "No"}),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/processes",
            {"processName": "No"},
        ),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/discovery/{discovery['id']}/information-concepts",
            {"conceptName": "No"},
        ),
    ]
    for method, path, payload in routes:
        if payload is None:
            response = getattr(client, method)(path, headers=auth_headers(outsider["accessToken"]))
        else:
            response = getattr(client, method)(path, headers=auth_headers(outsider["accessToken"]), json=payload)
        assert_error(
            response,
            404,
            "not_found",
        )
