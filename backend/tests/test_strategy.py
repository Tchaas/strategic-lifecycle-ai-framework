from __future__ import annotations

import uuid
from typing import Any, cast

import sqlalchemy as sa
from app.core.security import create_access_token, hash_password
from app.models.implementation import Implementation
from app.models.implementation_value_streams import ImplementationValueStream
from app.models.lean_business_case_capabilities import LeanBusinessCaseCapability
from app.models.lean_business_case_key_activities import LeanBusinessCaseKeyActivity
from app.models.lean_business_case_value_streams import LeanBusinessCaseValueStream
from app.models.lean_business_cases import LeanBusinessCase
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session


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
    client: TestClient, workspace_id: str, architecture_id: str, token: str, name: str
) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture/{architecture_id}/capabilities",
        headers=auth_headers(token),
        json={"capabilityName": name},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def test_objective_cap_counts_non_archived(client: TestClient) -> None:
    owner = signup(client, "strategy-cap@example.com", "Strategy Cap Co")
    workspace_id = owner["workspace"]["id"]
    token = owner["accessToken"]
    objectives = [create_objective(client, workspace_id, token, f"Objective {idx}") for idx in range(3)]
    response = client.post(
        f"/workspaces/{workspace_id}/strategic-objectives",
        headers=auth_headers(token),
        json={"strategicInitiativeName": "Objective 4"},
    )
    assert_error(response, 409, "cardinality_limit")
    assert response.json()["error"]["details"] == {"limit": 3, "current": 3}
    assert (
        client.patch(
            f"/workspaces/{workspace_id}/strategic-objectives/{objectives[0]['id']}",
            headers=auth_headers(token),
            json={"status": "archived"},
        ).status_code
        == 200
    )
    create_objective(client, workspace_id, token, "Replacement")


def test_draft_create_rejects_client_status(client: TestClient) -> None:
    owner = signup(client, "strategy-create@example.com", "Strategy Create Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"], "Draft only")
    assert objective["status"] == "draft"
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives",
            headers=auth_headers(owner["accessToken"]),
            json={"strategicInitiativeName": "Active?", "status": "active"},
        ),
        422,
        "validation_error",
    )


def test_activation_gate_and_apply_fields_first(client: TestClient) -> None:
    owner = signup(client, "strategy-gate@example.com", "Strategy Gate Co")
    workspace_id = owner["workspace"]["id"]
    token = owner["accessToken"]
    objective = create_objective(client, workspace_id, token, "Gate objective")
    missing = client.patch(
        f"/workspaces/{workspace_id}/strategic-objectives/{objective['id']}",
        headers=auth_headers(token),
        json={"status": "active"},
    )
    assert_error(missing, 409, "activation_gate")
    assert missing.json()["error"]["details"]["missing"] == [
        "executiveObjective",
        "strategicValueCategory",
        "problemOpportunityStatement",
        "valueHypothesis",
    ]
    activated = client.patch(
        f"/workspaces/{workspace_id}/strategic-objectives/{objective['id']}",
        headers=auth_headers(token),
        json={
            "executiveObjective": "Executive goal",
            "strategicValueCategory": "cost_reduction",
            "problemOpportunityStatement": "Problem",
            "valueHypothesis": "Hypothesis",
            "status": "active",
        },
    )
    assert activated.status_code == 200
    assert activated.json()["status"] == "active"


def test_lifecycle_transitions_and_reactivation_gate(client: TestClient) -> None:
    owner = signup(client, "strategy-lifecycle@example.com", "Strategy Lifecycle Co")
    workspace_id = owner["workspace"]["id"]
    token = owner["accessToken"]
    objective = create_objective(client, workspace_id, token, "Lifecycle")

    assert_error(
        client.patch(
            f"/workspaces/{workspace_id}/strategic-objectives/{objective['id']}",
            headers=auth_headers(token),
            json={"status": "completed"},
        ),
        409,
        "invalid_transition",
    )
    active_payload = {
        "executiveObjective": "Goal",
        "strategicValueCategory": "cost_reduction",
        "problemOpportunityStatement": "Problem",
        "valueHypothesis": "Hypothesis",
        "status": "active",
    }
    assert (
        client.patch(
            f"/workspaces/{workspace_id}/strategic-objectives/{objective['id']}",
            headers=auth_headers(token),
            json=active_payload,
        ).json()["status"]
        == "active"
    )
    assert (
        client.patch(
            f"/workspaces/{workspace_id}/strategic-objectives/{objective['id']}",
            headers=auth_headers(token),
            json={"status": "completed"},
        ).json()["status"]
        == "completed"
    )
    assert_error(
        client.patch(
            f"/workspaces/{workspace_id}/strategic-objectives/{objective['id']}",
            headers=auth_headers(token),
            json={"status": "active"},
        ),
        409,
        "invalid_transition",
    )
    assert (
        client.patch(
            f"/workspaces/{workspace_id}/strategic-objectives/{objective['id']}",
            headers=auth_headers(token),
            json={"status": "archived"},
        ).json()["status"]
        == "archived"
    )
    assert_error(
        client.patch(
            f"/workspaces/{workspace_id}/strategic-objectives/{objective['id']}",
            headers=auth_headers(token),
            json={"status": "active"},
        ),
        409,
        "invalid_transition",
    )
    assert (
        client.patch(
            f"/workspaces/{workspace_id}/strategic-objectives/{objective['id']}",
            headers=auth_headers(token),
            json={"status": "draft"},
        ).json()["status"]
        == "draft"
    )
    assert_error(
        client.patch(
            f"/workspaces/{workspace_id}/strategic-objectives/{objective['id']}",
            headers=auth_headers(token),
            json={"executiveObjective": "", "status": "active"},
        ),
        409,
        "activation_gate",
    )


def test_metrics_crud_and_validation(client: TestClient) -> None:
    owner = signup(client, "strategy-metrics@example.com", "Strategy Metrics Co")
    other = signup(client, "strategy-metrics-other@example.com", "Other Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    response = client.post(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/metrics",
        headers=auth_headers(owner["accessToken"]),
        json={"name": "Cost per stop", "metricCategory": "financial", "baselineValue": 10, "targetValue": 8},
    )
    assert response.status_code == 201
    metric = response.json()
    assert metric["baselineValue"] == 10
    assert (
        client.get(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/metrics",
            headers=auth_headers(owner["accessToken"]),
        ).json()[0]["name"]
        == "Cost per stop"
    )
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/metrics/{metric['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"targetValue": 7},
        ).json()["targetValue"]
        == 7
    )
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/metrics",
            headers=auth_headers(owner["accessToken"]),
            json={"name": "Bad", "baselineValue": "10"},
        ),
        422,
        "validation_error",
    )
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/metrics",
            headers=auth_headers(owner["accessToken"]),
            json={"name": "Bad", "metricCategory": "bogus"},
        ),
        422,
        "validation_error",
    )
    assert_error(
        client.get(
            f"/workspaces/{other['workspace']['id']}/strategic-objectives/{objective['id']}/metrics",
            headers=auth_headers(other["accessToken"]),
        ),
        404,
        "not_found",
    )
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/metrics/{metric['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )


def test_component_links_and_objective_detail(client: TestClient) -> None:
    owner = signup(client, "strategy-links@example.com", "Strategy Links Co")
    other = signup(client, "strategy-links-other@example.com", "Other Links Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    stream = create_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Stream A")
    capability = create_capability(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Cap X")
    other_architecture = create_architecture(client, other["workspace"]["id"], other["accessToken"])
    other_stream = create_stream(
        client, other["workspace"]["id"], other_architecture["id"], other["accessToken"], "Other"
    )

    vs_path = (
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/value-streams/{stream['id']}"
    )
    cap_path = (
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/capabilities/{capability['id']}"
    )
    assert client.post(vs_path, headers=auth_headers(owner["accessToken"])).status_code == 201
    assert_error(client.post(vs_path, headers=auth_headers(owner["accessToken"])), 409, "already_linked")
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/value-streams/{other_stream['id']}",
            headers=auth_headers(owner["accessToken"]),
        ),
        404,
        "not_found",
    )
    assert client.post(cap_path, headers=auth_headers(owner["accessToken"])).status_code == 201
    detail = client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    assert detail["valueStreamIds"] == [stream["id"]]
    assert detail["capabilityIds"] == [capability["id"]]
    assert client.delete(vs_path, headers=auth_headers(owner["accessToken"])).status_code == 204
    assert_error(client.delete(vs_path, headers=auth_headers(owner["accessToken"])), 404, "not_found")
    assert client.delete(cap_path, headers=auth_headers(owner["accessToken"])).status_code == 204


def test_financials_computed_view(client: TestClient, engine: sa.Engine) -> None:
    owner = signup(client, "strategy-financials@example.com", "Strategy Financials Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    stream_a = create_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Stream A")
    stream_b = create_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Stream B")
    fresh = create_objective(client, owner["workspace"]["id"], owner["accessToken"], "Fresh")

    with Session(engine) as session:
        case_one = LeanBusinessCase(
            workspace_id=uuid.UUID(owner["workspace"]["id"]),
            strategic_objective_id=uuid.UUID(objective["id"]),
            owner_user_id=uuid.UUID(owner["user"]["id"]),
            title="Case 1",
            forecast_cost=100.0,
            forecast_value=300.0,
            status="draft",
            created_by_user_id=uuid.UUID(owner["user"]["id"]),
        )
        case_two = LeanBusinessCase(
            workspace_id=uuid.UUID(owner["workspace"]["id"]),
            strategic_objective_id=uuid.UUID(objective["id"]),
            owner_user_id=uuid.UUID(owner["user"]["id"]),
            title="Case 2",
            forecast_cost=None,
            forecast_value=50.0,
            status="draft",
            created_by_user_id=uuid.UUID(owner["user"]["id"]),
        )
        archived = LeanBusinessCase(
            workspace_id=uuid.UUID(owner["workspace"]["id"]),
            strategic_objective_id=uuid.UUID(objective["id"]),
            owner_user_id=uuid.UUID(owner["user"]["id"]),
            title="Archived",
            forecast_cost=999.0,
            forecast_value=999.0,
            status="archived",
            created_by_user_id=uuid.UUID(owner["user"]["id"]),
        )
        session.add_all([case_one, case_two, archived])
        session.flush()
        implementation_one = Implementation(
            workspace_id=uuid.UUID(owner["workspace"]["id"]),
            lean_business_case_id=case_one.id,
            actual_cost=120.0,
            actual_value=280.0,
            created_by_user_id=uuid.UUID(owner["user"]["id"]),
        )
        implementation_two = Implementation(
            workspace_id=uuid.UUID(owner["workspace"]["id"]),
            lean_business_case_id=case_two.id,
            actual_cost=None,
            actual_value=70.0,
            created_by_user_id=uuid.UUID(owner["user"]["id"]),
        )
        session.add_all([implementation_one, implementation_two])
        session.flush()
        session.add_all(
            [
                ImplementationValueStream(
                    implementation_id=implementation_one.id,
                    value_stream_id=uuid.UUID(stream_a["id"]),
                    allocated_cost=80.0,
                    allocated_value=200.0,
                ),
                ImplementationValueStream(
                    implementation_id=implementation_two.id,
                    value_stream_id=uuid.UUID(stream_a["id"]),
                    allocated_cost=10.0,
                    allocated_value=30.0,
                ),
                ImplementationValueStream(
                    implementation_id=implementation_one.id,
                    value_stream_id=uuid.UUID(stream_b["id"]),
                    allocated_cost=40.0,
                    allocated_value=80.0,
                ),
            ]
        )
        session.commit()

    financials = client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/financials",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    assert financials["forecast"] == {"cost": 100.0, "value": 350.0}
    assert financials["actuals"] == {"cost": 120.0, "value": 350.0}
    assert financials["variance"] == {"cost": 20.0, "value": 0.0}
    by_stream = {row["name"]: row for row in financials["byValueStream"]}
    assert by_stream["Stream A"]["allocatedCost"] == 90.0
    assert by_stream["Stream A"]["allocatedValue"] == 230.0
    assert by_stream["Stream B"]["allocatedCost"] == 40.0
    assert by_stream["Stream B"]["allocatedValue"] == 80.0
    assert client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{fresh['id']}/financials",
        headers=auth_headers(owner["accessToken"]),
    ).json() == {
        "forecast": {"cost": 0.0, "value": 0.0},
        "actuals": {"cost": 0.0, "value": 0.0},
        "variance": {"cost": 0.0, "value": 0.0},
        "byValueStream": [],
    }


def test_traceability_computed_view(client: TestClient, engine: sa.Engine) -> None:
    owner = signup(client, "strategy-trace@example.com", "Strategy Trace Co")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    stream = create_stream(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Stream A")
    activity = create_activity(client, owner["workspace"]["id"], stream["id"], owner["accessToken"], "Activity K")
    cap_x = create_capability(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Cap X")
    cap_y = create_capability(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"], "Cap Y")
    assert (
        client.post(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/value-streams/{stream['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/capabilities/{cap_x['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 201
    )
    with Session(engine) as session:
        case = LeanBusinessCase(
            workspace_id=uuid.UUID(owner["workspace"]["id"]),
            strategic_objective_id=uuid.UUID(objective["id"]),
            owner_user_id=uuid.UUID(owner["user"]["id"]),
            title="Trace case",
            status="draft",
            created_by_user_id=uuid.UUID(owner["user"]["id"]),
        )
        session.add(case)
        session.flush()
        session.add_all(
            [
                LeanBusinessCaseValueStream(case_id=case.id, value_stream_id=uuid.UUID(stream["id"])),
                LeanBusinessCaseKeyActivity(case_id=case.id, key_activity_id=uuid.UUID(activity["id"])),
                LeanBusinessCaseCapability(case_id=case.id, capability_id=uuid.UUID(cap_y["id"])),
            ]
        )
        case_id = case.id
        session.commit()

    trace = client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/traceability",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    stream_item = trace["valueStreams"][0]
    assert stream_item["id"] == stream["id"]
    assert stream_item["viaObjective"] is True
    assert stream_item["viaCaseIds"] == [str(case_id)]
    activity_item = trace["keyActivities"][0]
    assert activity_item["id"] == activity["id"]
    assert activity_item["viaObjective"] is False
    assert activity_item["viaCaseIds"] == [str(case_id)]
    caps = {item["name"]: item for item in trace["capabilities"]}
    assert caps["Cap X"]["viaObjective"] is True
    assert caps["Cap X"]["viaCaseIds"] == []
    assert caps["Cap Y"]["viaObjective"] is False
    assert caps["Cap Y"]["viaCaseIds"] == [str(case_id)]


def test_strategy_tenancy_and_non_admin_writes(client: TestClient, engine: sa.Engine) -> None:
    owner = signup(client, "strategy-tenant@example.com", "Strategy Tenant Co")
    outsider = signup(client, "strategy-outsider@example.com", "Other Tenant Co")
    member_id = create_password_user(engine, "strategy-member@example.com")
    add_member(engine, owner["workspace"]["id"], member_id, owner["user"]["id"])
    member_token = create_access_token(member_id)
    objective = create_objective(client, owner["workspace"]["id"], member_token, "Member objective")
    metric = client.post(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/metrics",
        headers=auth_headers(member_token),
        json={"name": "Metric"},
    )
    assert metric.status_code == 201
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}",
            headers=auth_headers(member_token),
            json={"financialImpact": "Forecast"},
        ).status_code
        == 200
    )
    nonexistent = client.get(
        f"/workspaces/{uuid.uuid4()}/strategic-objectives", headers=auth_headers(outsider["accessToken"])
    )
    cross_tenant = client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives",
        headers=auth_headers(outsider["accessToken"]),
    )
    assert nonexistent.status_code == 404
    assert cross_tenant.status_code == 404
    assert nonexistent.content == cross_tenant.content
    for method, path, payload in (
        ("get", f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}", None),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/metrics",
            {"name": "Denied"},
        ),
        ("patch", f"/workspaces/{owner['workspace']['id']}/metrics/{metric.json()['id']}", {"name": "Denied"}),
        ("delete", f"/workspaces/{owner['workspace']['id']}/metrics/{metric.json()['id']}", None),
    ):
        if payload is None:
            response = getattr(client, method)(path, headers=auth_headers(outsider["accessToken"]))
        else:
            response = getattr(client, method)(path, headers=auth_headers(outsider["accessToken"]), json=payload)
        assert_error(response, 404, "not_found")
