from __future__ import annotations

import uuid
from typing import Any, cast

import sqlalchemy as sa
from app.core.security import create_access_token, hash_password
from fastapi.testclient import TestClient
from sqlalchemy import text

DELIVERABLE_TYPES = [
    "conceptual_architecture_document",
    "end_to_end_architecture_diagram",
    "system_context_diagram",
    "capability_to_component_diagram",
    "value_stream_to_feature_map",
    "data_flow_diagram",
    "api_integration_view",
    "governance_oversight_view",
    "prioritized_epic_feature_roadmap",
    "requirement_sets",
    "risk_dependency_register",
    "traceability_matrix",
]


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
                text(
                    """
                    INSERT INTO users (email, full_name, auth_provider, password_hash)
                    VALUES (:email, 'Member', 'password', :password_hash)
                    RETURNING id
                    """
                ),
                {"email": email, "password_hash": hash_password("correct-horse")},
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


def create_objective(client: TestClient, workspace_id: str, token: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/strategic-objectives",
        headers=auth_headers(token),
        json={"strategicInitiativeName": "Objective"},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_case(client: TestClient, workspace_id: str, token: str, title: str = "Case") -> dict[str, Any]:
    objective = create_objective(client, workspace_id, token)
    response = client.post(
        f"/workspaces/{workspace_id}/strategic-objectives/{objective['id']}/lean-business-cases",
        headers=auth_headers(token),
        json={"title": title},
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


def create_architecture(client: TestClient, workspace_id: str, token: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture",
        headers=auth_headers(token),
        json={"name": "Architecture"},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_capability(client: TestClient, workspace_id: str, architecture_id: str, token: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/business-architecture/{architecture_id}/capabilities",
        headers=auth_headers(token),
        json={"capabilityName": "Capability"},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_feature(client: TestClient, workspace_id: str, case_id: str, token: str, **payload: Any) -> dict[str, Any]:
    body = {"featureName": "Feature", **payload}
    response = client.post(
        f"/workspaces/{workspace_id}/lean-business-cases/{case_id}/features",
        headers=auth_headers(token),
        json=body,
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_requirement(client: TestClient, workspace_id: str, feature_id: str, token: str) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/features/{feature_id}/requirements",
        headers=auth_headers(token),
        json={"requirementName": "Requirement"},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_deliverable(
    client: TestClient,
    workspace_id: str,
    case_id: str,
    token: str,
    deliverable_type: str = "traceability_matrix",
    **payload: Any,
) -> dict[str, Any]:
    body = {"deliverableType": deliverable_type, "title": "Deliverable", **payload}
    response = client.post(
        f"/workspaces/{workspace_id}/lean-business-cases/{case_id}/deliverables",
        headers=auth_headers(token),
        json=body,
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def test_features_crud_and_capability_set_null(client: TestClient) -> None:
    owner = signup(client, "solution-features@example.com", "Solution Features Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    architecture = create_architecture(client, owner["workspace"]["id"], owner["accessToken"])
    capability = create_capability(client, owner["workspace"]["id"], architecture["id"], owner["accessToken"])
    other = signup(client, "solution-features-other@example.com", "Other Features Co")
    other_architecture = create_architecture(client, other["workspace"]["id"], other["accessToken"])
    other_capability = create_capability(
        client,
        other["workspace"]["id"],
        other_architecture["id"],
        other["accessToken"],
    )

    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/features",
            headers=auth_headers(owner["accessToken"]),
            json={"featureName": "Bad", "capabilityId": other_capability["id"]},
        ),
        404,
        "not_found",
    )
    feature = create_feature(
        client,
        owner["workspace"]["id"],
        case["id"],
        owner["accessToken"],
        featureType="platform",
        priority="high",
        capabilityId=capability["id"],
    )
    assert feature["capabilityId"] == capability["id"]
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/features/{feature['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"description": "Updated"},
        ).json()["description"]
        == "Updated"
    )
    assert (
        len(
            client.get(
                f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/features",
                headers=auth_headers(owner["accessToken"]),
            ).json()
        )
        == 1
    )
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/capabilities/{capability['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )
    listed = client.get(
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/features",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    assert listed[0]["capabilityId"] is None
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/features/{feature['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )


def test_case_archived_blocks_solution_children(client: TestClient) -> None:
    owner = signup(client, "solution-archived@example.com", "Solution Archived Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    archive_case(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/features",
            headers=auth_headers(owner["accessToken"]),
            json={"featureName": "Blocked"},
        ),
        409,
        "case_archived",
    )
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/deliverables",
            headers=auth_headers(owner["accessToken"]),
            json={"deliverableType": "traceability_matrix", "title": "Blocked"},
        ),
        409,
        "case_archived",
    )
    reactivate_case(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    create_feature(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    create_deliverable(client, owner["workspace"]["id"], case["id"], owner["accessToken"])


def test_requirements_crud_delete_and_feature_cascade(client: TestClient, engine: sa.Engine) -> None:
    owner = signup(client, "solution-reqs@example.com", "Solution Reqs Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    feature = create_feature(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    requirement = create_requirement(client, owner["workspace"]["id"], feature["id"], owner["accessToken"])
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/requirements/{requirement['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"acceptanceCriteria": "Done"},
        ).json()["acceptanceCriteria"]
        == "Done"
    )
    assert (
        len(
            client.get(
                f"/workspaces/{owner['workspace']['id']}/features/{feature['id']}/requirements",
                headers=auth_headers(owner["accessToken"]),
            ).json()
        )
        == 1
    )
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/requirements/{requirement['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )
    second = create_requirement(client, owner["workspace"]["id"], feature["id"], owner["accessToken"])
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/features/{feature['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )
    with engine.begin() as conn:
        assert conn.scalar(text("SELECT count(*) FROM requirements WHERE id = :id"), {"id": second["id"]}) == 0


def test_linear_lifecycle_for_solution_resources(client: TestClient) -> None:
    owner = signup(client, "solution-life@example.com", "Solution Life Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    feature = create_feature(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    requirement = create_requirement(client, owner["workspace"]["id"], feature["id"], owner["accessToken"])
    deliverable = create_deliverable(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    lifecycle_targets = [
        ("features", feature["id"]),
        ("requirements", requirement["id"]),
        ("deliverables", deliverable["id"]),
    ]
    for resource, resource_id in lifecycle_targets:
        assert (
            client.patch(
                f"/workspaces/{owner['workspace']['id']}/{resource}/{resource_id}",
                headers=auth_headers(owner["accessToken"]),
                json={"status": "active"},
            ).json()["status"]
            == "active"
        )
        assert (
            client.patch(
                f"/workspaces/{owner['workspace']['id']}/{resource}/{resource_id}",
                headers=auth_headers(owner["accessToken"]),
                json={"status": "completed"},
            ).json()["status"]
            == "completed"
        )
        assert_error(
            client.patch(
                f"/workspaces/{owner['workspace']['id']}/{resource}/{resource_id}",
                headers=auth_headers(owner["accessToken"]),
                json={"status": "active"},
            ),
            409,
            "invalid_transition",
        )
        assert_error(
            client.patch(
                f"/workspaces/{owner['workspace']['id']}/{resource}/{resource_id}",
                headers=auth_headers(owner["accessToken"]),
                json={"status": "archived"},
            ),
            422,
            "validation_error",
        )


def test_solution_enum_validation_and_deliverable_types(client: TestClient) -> None:
    owner = signup(client, "solution-enums@example.com", "Solution Enums Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    feature = create_feature(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/features",
            headers=auth_headers(owner["accessToken"]),
            json={"featureName": "Bad", "featureType": "bogus"},
        ),
        422,
        "validation_error",
    )
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/features/{feature['id']}/requirements",
            headers=auth_headers(owner["accessToken"]),
            json={"requirementName": "Bad", "requirementType": "bogus"},
        ),
        422,
        "validation_error",
    )
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/deliverables",
            headers=auth_headers(owner["accessToken"]),
            json={"deliverableType": "bogus", "title": "Bad"},
        ),
        422,
        "validation_error",
    )
    assert_error(
        client.post(
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/features",
            headers=auth_headers(owner["accessToken"]),
            json={"featureName": "Bad", "priority": "urgent"},
        ),
        422,
        "validation_error",
    )
    for deliverable_type in DELIVERABLE_TYPES:
        assert (
            create_deliverable(
                client,
                owner["workspace"]["id"],
                case["id"],
                owner["accessToken"],
                deliverable_type,
                title=deliverable_type,
            )["deliverableType"]
            == deliverable_type
        )


def test_deliverable_creation_and_finalization(client: TestClient) -> None:
    owner = signup(client, "solution-deliverables@example.com", "Solution Deliverables Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    suggested = create_deliverable(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    assert suggested["source"] == "suggested"
    finalized = create_deliverable(
        client,
        owner["workspace"]["id"],
        case["id"],
        owner["accessToken"],
        source="user_finalized",
    )
    assert finalized["source"] == "user_finalized"
    duplicate_type = create_deliverable(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    assert duplicate_type["deliverableType"] == suggested["deliverableType"]
    finalization = client.patch(
        f"/workspaces/{owner['workspace']['id']}/deliverables/{suggested['id']}",
        headers=auth_headers(owner["accessToken"]),
        json={"source": "user_finalized"},
    )
    assert finalization.status_code == 200
    assert finalization.json()["source"] == "user_finalized"
    assert_error(
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/deliverables/{suggested['id']}",
            headers=auth_headers(owner["accessToken"]),
            json={"source": "suggested"},
        ),
        409,
        "already_finalized",
    )
    edited = client.patch(
        f"/workspaces/{owner['workspace']['id']}/deliverables/{suggested['id']}",
        headers=auth_headers(owner["accessToken"]),
        json={"title": "Edited", "content": "Still editable"},
    )
    assert edited.status_code == 200
    assert edited.json()["title"] == "Edited"
    assert (
        len(
            client.get(
                f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/deliverables",
                headers=auth_headers(owner["accessToken"]),
            ).json()
        )
        == 3
    )


def test_deliverable_deletion_gate(client: TestClient) -> None:
    owner = signup(client, "solution-delete-deliverables@example.com", "Solution Delete Deliverables Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    suggested = create_deliverable(client, owner["workspace"]["id"], case["id"], owner["accessToken"])
    finalized = create_deliverable(
        client,
        owner["workspace"]["id"],
        case["id"],
        owner["accessToken"],
        source="user_finalized",
    )
    assert (
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/deliverables/{suggested['id']}",
            headers=auth_headers(owner["accessToken"]),
        ).status_code
        == 204
    )
    assert_error(
        client.delete(
            f"/workspaces/{owner['workspace']['id']}/deliverables/{finalized['id']}",
            headers=auth_headers(owner["accessToken"]),
        ),
        409,
        "already_finalized",
    )


def test_solution_tenancy_and_non_admin_writes(client: TestClient, engine: sa.Engine) -> None:
    owner = signup(client, "solution-tenant@example.com", "Solution Tenant Co")
    outsider = signup(client, "solution-outsider@example.com", "Solution Outsider Co")
    case = create_case(client, owner["workspace"]["id"], owner["accessToken"])
    member_id = create_password_user(engine, "solution-member@example.com")
    add_member(engine, owner["workspace"]["id"], member_id, owner["user"]["id"])
    member_token = create_access_token(member_id)
    feature = create_feature(client, owner["workspace"]["id"], case["id"], member_token)
    requirement = create_requirement(client, owner["workspace"]["id"], feature["id"], member_token)
    deliverable = create_deliverable(client, owner["workspace"]["id"], case["id"], member_token)
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/features/{feature['id']}",
            headers=auth_headers(member_token),
            json={"status": "active"},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/requirements/{requirement['id']}",
            headers=auth_headers(member_token),
            json={"status": "active"},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/workspaces/{owner['workspace']['id']}/deliverables/{deliverable['id']}",
            headers=auth_headers(member_token),
            json={"status": "active"},
        ).status_code
        == 200
    )
    nonexistent = client.get(
        f"/workspaces/{uuid.uuid4()}/lean-business-cases/{case['id']}/features",
        headers=auth_headers(outsider["accessToken"]),
    )
    cross_tenant = client.get(
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/features",
        headers=auth_headers(outsider["accessToken"]),
    )
    assert nonexistent.status_code == 404
    assert cross_tenant.status_code == 404
    assert nonexistent.content == cross_tenant.content
    routes = [
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/features",
            {"featureName": "No"},
        ),
        (
            "patch",
            f"/workspaces/{owner['workspace']['id']}/features/{feature['id']}",
            {"description": "No"},
        ),
        ("delete", f"/workspaces/{owner['workspace']['id']}/features/{feature['id']}", None),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/features/{feature['id']}/requirements",
            {"requirementName": "No"},
        ),
        (
            "get",
            f"/workspaces/{owner['workspace']['id']}/features/{feature['id']}/requirements",
            None,
        ),
        (
            "patch",
            f"/workspaces/{owner['workspace']['id']}/requirements/{requirement['id']}",
            {"description": "No"},
        ),
        ("delete", f"/workspaces/{owner['workspace']['id']}/requirements/{requirement['id']}", None),
        (
            "post",
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/deliverables",
            {"deliverableType": "traceability_matrix", "title": "No"},
        ),
        (
            "get",
            f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/deliverables",
            None,
        ),
        ("patch", f"/workspaces/{owner['workspace']['id']}/deliverables/{deliverable['id']}", {"title": "No"}),
        ("delete", f"/workspaces/{owner['workspace']['id']}/deliverables/{deliverable['id']}", None),
    ]
    for method, path, payload in routes:
        if payload is None:
            response = getattr(client, method)(path, headers=auth_headers(outsider["accessToken"]))
        else:
            response = getattr(client, method)(path, headers=auth_headers(outsider["accessToken"]), json=payload)
        assert_error(response, 404, "not_found")
