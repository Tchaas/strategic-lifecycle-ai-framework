from __future__ import annotations

import os
import subprocess
import uuid
from pathlib import Path
from typing import Any, cast

import sqlalchemy as sa
from app.core.security import create_access_token, hash_password
from fastapi.testclient import TestClient
from sqlalchemy import text

REFERENCE_FKS = {
    ("departments", "parent_department_id"),
    ("value_streams", "linked_department_id"),
    ("business_capabilities", "owning_department_id"),
    ("business_processes", "linked_value_stream_id"),
    ("stakeholders_personas", "linked_value_stream_id"),
    ("information_concepts", "linked_value_stream_id"),
    ("business_impacts", "linked_value_stream_id"),
    ("business_impacts", "linked_lean_business_case_id"),
    ("features", "capability_id"),
}


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


def create_department(
    client: TestClient,
    workspace_id: str,
    token: str,
    name: str,
    parent_department_id: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"name": name}
    if parent_department_id is not None:
        payload["parentDepartmentId"] = parent_department_id
    response = client.post(f"/workspaces/{workspace_id}/departments", headers=auth_headers(token), json=payload)
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def assert_error(response: Any, status_code: int, code: str) -> None:
    assert response.status_code == status_code, response.text
    assert response.json()["error"]["code"] == code


def test_migration_0010_round_trip_reference_fk_rules(database_url: str) -> None:
    env = os.environ.copy()
    env["DATABASE_URL"] = database_url
    backend_dir = Path(__file__).resolve().parents[1]

    subprocess.run(["alembic", "downgrade", "0009_implementation"], cwd=backend_dir, env=env, check=True)
    assert _delete_rules(database_url) == {key: "CASCADE" for key in REFERENCE_FKS}

    subprocess.run(["alembic", "upgrade", "head"], cwd=backend_dir, env=env, check=True)
    assert _delete_rules(database_url) == {key: "SET NULL" for key in REFERENCE_FKS}


def test_workspace_delete_still_cascades_owned_rows(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "dept-cascade-admin@example.com", "Cascade Co")
    with engine.begin() as conn:
        objective_id = conn.scalar(
            text(
                """
                INSERT INTO strategic_objectives (workspace_id, strategic_initiative_name, created_by_user_id)
                VALUES (:workspace_id, 'Cascade objective', :user_id)
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
                VALUES (:workspace_id, :objective_id, :user_id, 'Cascade case', :user_id)
                RETURNING id
                """
            ),
            {"workspace_id": admin["workspace"]["id"], "objective_id": objective_id, "user_id": admin["user"]["id"]},
        )

    response = client.delete(f"/workspaces/{admin['workspace']['id']}", headers=auth_headers(admin["accessToken"]))
    assert response.status_code == 204
    with engine.begin() as conn:
        assert conn.scalar(text("SELECT count(*) FROM strategic_objectives WHERE id = :id"), {"id": objective_id}) == 0
        assert conn.scalar(text("SELECT count(*) FROM lean_business_cases WHERE id = :id"), {"id": case_id}) == 0


def test_department_crud_auth_and_tenancy(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "dept-admin@example.com", "Departments Co")
    member_user = create_password_user(engine, "dept-member@example.com")
    add_member(engine, admin["workspace"]["id"], member_user, admin["user"]["id"])
    member_token = create_access_token(member_user)
    outsider = signup(client, "dept-outsider@example.com", "Other Co")

    department = create_department(client, admin["workspace"]["id"], admin["accessToken"], "Operations")
    fetched = client.get(
        f"/workspaces/{admin['workspace']['id']}/departments/{department['id']}",
        headers=auth_headers(member_token),
    )
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Operations"

    patched = client.patch(
        f"/workspaces/{admin['workspace']['id']}/departments/{department['id']}",
        headers=auth_headers(admin["accessToken"]),
        json={"name": "Network Operations", "description": "Core org"},
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "Network Operations"

    assert_error(
        client.post(
            f"/workspaces/{admin['workspace']['id']}/departments",
            headers=auth_headers(member_token),
            json={"name": "Denied"},
        ),
        403,
        "admin_required",
    )
    nonexistent = client.get(f"/workspaces/{uuid.uuid4()}/departments", headers=auth_headers(outsider["accessToken"]))
    cross_tenant = client.get(
        f"/workspaces/{admin['workspace']['id']}/departments",
        headers=auth_headers(outsider["accessToken"]),
    )
    assert nonexistent.status_code == 404
    assert cross_tenant.status_code == 404
    assert nonexistent.content == cross_tenant.content

    deleted = client.delete(
        f"/workspaces/{admin['workspace']['id']}/departments/{department['id']}",
        headers=auth_headers(admin["accessToken"]),
    )
    assert deleted.status_code == 204


def test_parent_in_another_workspace_is_not_found(client: TestClient) -> None:
    admin = signup(client, "parent-admin@example.com", "Parent Co")
    other = signup(client, "other-parent-admin@example.com", "Other Parent Co")
    other_parent = create_department(client, other["workspace"]["id"], other["accessToken"], "Foreign Parent")
    department = create_department(client, admin["workspace"]["id"], admin["accessToken"], "Local")

    assert_error(
        client.post(
            f"/workspaces/{admin['workspace']['id']}/departments",
            headers=auth_headers(admin["accessToken"]),
            json={"name": "Child", "parentDepartmentId": other_parent["id"]},
        ),
        404,
        "not_found",
    )
    assert_error(
        client.patch(
            f"/workspaces/{admin['workspace']['id']}/departments/{department['id']}",
            headers=auth_headers(admin["accessToken"]),
            json={"parentDepartmentId": other_parent["id"]},
        ),
        404,
        "not_found",
    )


def test_cycle_detection_and_valid_reparent(client: TestClient) -> None:
    admin = signup(client, "cycle-admin@example.com", "Cycle Co")
    root = create_department(client, admin["workspace"]["id"], admin["accessToken"], "Root")
    child = create_department(client, admin["workspace"]["id"], admin["accessToken"], "Child", root["id"])
    grandchild = create_department(client, admin["workspace"]["id"], admin["accessToken"], "Grandchild", child["id"])

    assert_error(
        client.patch(
            f"/workspaces/{admin['workspace']['id']}/departments/{root['id']}",
            headers=auth_headers(admin["accessToken"]),
            json={"parentDepartmentId": root["id"]},
        ),
        409,
        "department_cycle",
    )
    assert_error(
        client.patch(
            f"/workspaces/{admin['workspace']['id']}/departments/{root['id']}",
            headers=auth_headers(admin["accessToken"]),
            json={"parentDepartmentId": child["id"]},
        ),
        409,
        "department_cycle",
    )
    assert_error(
        client.patch(
            f"/workspaces/{admin['workspace']['id']}/departments/{root['id']}",
            headers=auth_headers(admin["accessToken"]),
            json={"parentDepartmentId": grandchild["id"]},
        ),
        409,
        "department_cycle",
    )
    ok = client.patch(
        f"/workspaces/{admin['workspace']['id']}/departments/{grandchild['id']}",
        headers=auth_headers(admin["accessToken"]),
        json={"parentDepartmentId": root["id"]},
    )
    assert ok.status_code == 200
    assert ok.json()["parentDepartmentId"] == root["id"]


def test_parent_filter_returns_direct_children_only(client: TestClient) -> None:
    admin = signup(client, "filter-admin@example.com", "Filter Co")
    root = create_department(client, admin["workspace"]["id"], admin["accessToken"], "Root")
    child = create_department(client, admin["workspace"]["id"], admin["accessToken"], "Child", root["id"])
    grandchild = create_department(client, admin["workspace"]["id"], admin["accessToken"], "Grandchild", child["id"])
    sibling = create_department(client, admin["workspace"]["id"], admin["accessToken"], "Sibling", root["id"])

    children = client.get(
        f"/workspaces/{admin['workspace']['id']}/departments",
        headers=auth_headers(admin["accessToken"]),
        params={"parentId": root["id"]},
    )
    assert children.status_code == 200
    assert {row["id"] for row in children.json()} == {child["id"], sibling["id"]}

    all_departments = client.get(
        f"/workspaces/{admin['workspace']['id']}/departments",
        headers=auth_headers(admin["accessToken"]),
    )
    assert all_departments.status_code == 200
    assert {row["id"] for row in all_departments.json()} == {root["id"], child["id"], grandchild["id"], sibling["id"]}

    assert_error(
        client.get(
            f"/workspaces/{admin['workspace']['id']}/departments",
            headers=auth_headers(admin["accessToken"]),
            params={"parentId": str(uuid.uuid4())},
        ),
        404,
        "not_found",
    )


def test_delete_promotes_children_to_root(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "promote-admin@example.com", "Promote Co")
    parent = create_department(client, admin["workspace"]["id"], admin["accessToken"], "Parent")
    child = create_department(client, admin["workspace"]["id"], admin["accessToken"], "Child", parent["id"])

    response = client.delete(
        f"/workspaces/{admin['workspace']['id']}/departments/{parent['id']}",
        headers=auth_headers(admin["accessToken"]),
    )
    assert response.status_code == 204
    with engine.begin() as conn:
        assert (
            conn.scalar(text("SELECT parent_department_id FROM departments WHERE id = :id"), {"id": child["id"]})
            is None
        )


def test_delete_nulls_department_references(client: TestClient, engine: sa.Engine) -> None:
    admin = signup(client, "reference-admin@example.com", "Reference Co")
    department = create_department(client, admin["workspace"]["id"], admin["accessToken"], "Linked Department")
    with engine.begin() as conn:
        architecture_id = conn.scalar(
            text(
                """
                INSERT INTO business_architecture_components
                  (workspace_id, name, created_by_user_id)
                VALUES (:workspace_id, 'Architecture', :user_id)
                RETURNING id
                """
            ),
            {"workspace_id": admin["workspace"]["id"], "user_id": admin["user"]["id"]},
        )
        value_stream_id = conn.scalar(
            text(
                """
                INSERT INTO value_streams
                  (workspace_id, business_architecture_id, name, linked_department_id, created_by_user_id)
                VALUES (:workspace_id, :architecture_id, 'Stream', :department_id, :user_id)
                RETURNING id
                """
            ),
            {
                "workspace_id": admin["workspace"]["id"],
                "architecture_id": architecture_id,
                "department_id": department["id"],
                "user_id": admin["user"]["id"],
            },
        )
        capability_id = conn.scalar(
            text(
                """
                INSERT INTO business_capabilities
                  (workspace_id, business_architecture_id, capability_name, owning_department_id, created_by_user_id)
                VALUES (:workspace_id, :architecture_id, 'Capability', :department_id, :user_id)
                RETURNING id
                """
            ),
            {
                "workspace_id": admin["workspace"]["id"],
                "architecture_id": architecture_id,
                "department_id": department["id"],
                "user_id": admin["user"]["id"],
            },
        )

    response = client.delete(
        f"/workspaces/{admin['workspace']['id']}/departments/{department['id']}",
        headers=auth_headers(admin["accessToken"]),
    )
    assert response.status_code == 204
    with engine.begin() as conn:
        assert (
            conn.scalar(
                text("SELECT linked_department_id FROM value_streams WHERE id = :id"),
                {"id": value_stream_id},
            )
            is None
        )
        assert (
            conn.scalar(
                text("SELECT owning_department_id FROM business_capabilities WHERE id = :id"),
                {"id": capability_id},
            )
            is None
        )


def test_patch_rejects_unknown_columns(client: TestClient) -> None:
    admin = signup(client, "unknown-column-admin@example.com", "Unknown Column Co")
    department = create_department(client, admin["workspace"]["id"], admin["accessToken"], "Operations")

    assert_error(
        client.patch(
            f"/workspaces/{admin['workspace']['id']}/departments/{department['id']}",
            headers=auth_headers(admin["accessToken"]),
            json={"workspaceId": str(uuid.uuid4())},
        ),
        422,
        "validation_error",
    )


def _delete_rules(database_url: str) -> dict[tuple[str, str], str]:
    query = text(
        """
        SELECT kcu.table_name, kcu.column_name, rc.delete_rule
        FROM information_schema.referential_constraints rc
        JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_schema = rc.constraint_schema
         AND kcu.constraint_name = rc.constraint_name
        WHERE (kcu.table_name, kcu.column_name) IN (
          ('departments', 'parent_department_id'),
          ('value_streams', 'linked_department_id'),
          ('business_capabilities', 'owning_department_id'),
          ('business_processes', 'linked_value_stream_id'),
          ('stakeholders_personas', 'linked_value_stream_id'),
          ('information_concepts', 'linked_value_stream_id'),
          ('business_impacts', 'linked_value_stream_id'),
          ('business_impacts', 'linked_lean_business_case_id'),
          ('features', 'capability_id')
        )
        """
    )
    engine = sa.create_engine(database_url)
    try:
        with engine.begin() as conn:
            rows = conn.execute(query).all()
        return {(row.table_name, row.column_name): row.delete_rule for row in rows}
    finally:
        engine.dispose()
