from __future__ import annotations

from typing import Any, cast

import pytest
from app.core.config import settings
from app.core.rate_limit import RateLimit, rate_limiter
from app.services import auth_service
from fastapi.testclient import TestClient


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def signup_payload(email: str = "hardening@example.com") -> dict[str, str]:
    return {
        "email": email,
        "password": "correct-horse",
        "fullName": "Hardening User",
        "workspaceName": "Hardening Co",
    }


def signup(client: TestClient, email: str, workspace_name: str = "Hardening Co") -> dict[str, Any]:
    response = client.post("/auth/signup", json=signup_payload(email) | {"workspaceName": workspace_name})
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def create_objective(client: TestClient, workspace_id: str, token: str, name: str = "Objective") -> dict[str, Any]:
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
    objective_id: str,
    token: str,
    title: str = "Case",
    status: str | None = None,
) -> dict[str, Any]:
    response = client.post(
        f"/workspaces/{workspace_id}/strategic-objectives/{objective_id}/lean-business-cases",
        headers=auth_headers(token),
        json={"title": title},
    )
    assert response.status_code == 201, response.text
    body = cast(dict[str, Any], response.json())
    if status == "archived":
        archived = client.patch(
            f"/workspaces/{workspace_id}/lean-business-cases/{body['id']}/status",
            headers=auth_headers(token),
            json={"status": "archived"},
        )
        assert archived.status_code == 200, archived.text
        body = cast(dict[str, Any], archived.json())
    return body


class FakeClock:
    def __init__(self) -> None:
        self.now = 1_000.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


@pytest.fixture(autouse=True)
def reset_hardening_state() -> None:
    rate_limiter.reset()
    settings.rate_limit_enabled = False
    settings.max_request_body_bytes = 1_048_576


def test_rate_limit_login_window_and_independent_client_ips(client: TestClient) -> None:
    signup(client, "rate-limit@example.com")
    fake_clock = FakeClock()
    original_clock = rate_limiter.clock
    rate_limiter.clock = fake_clock
    settings.rate_limit_enabled = True
    settings.rate_limit_login_per_minute = 2
    try:
        for _ in range(2):
            response = client.post("/auth/login", json={"email": "missing@example.com", "password": "bad-password"})
            assert response.status_code == 401
        limited = client.post("/auth/login", json={"email": "missing@example.com", "password": "bad-password"})
        assert limited.status_code == 429
        assert limited.json()["error"]["code"] == "rate_limited"
        assert 1 <= int(limited.headers["Retry-After"]) <= 60

        direct_limit = RateLimit("direct_ip_budget", 2)
        assert rate_limiter.check("198.51.100.10", direct_limit) is None
        assert rate_limiter.check("198.51.100.10", direct_limit) is None
        assert rate_limiter.check("198.51.100.10", direct_limit) is not None
        assert rate_limiter.check("203.0.113.10", direct_limit) is None

        fake_clock.advance(61)
        restored = client.post("/auth/login", json={"email": "missing@example.com", "password": "bad-password"})
        assert restored.status_code == 401
    finally:
        settings.rate_limit_enabled = False
        rate_limiter.clock = original_clock
        rate_limiter.reset()


def test_invite_accept_rate_limit_uses_same_envelope(client: TestClient) -> None:
    fake_clock = FakeClock()
    original_clock = rate_limiter.clock
    rate_limiter.clock = fake_clock
    settings.rate_limit_enabled = True
    settings.rate_limit_invite_accept_per_minute = 2
    try:
        for _ in range(2):
            response = client.post("/invites/not-a-real-token/accept", headers=auth_headers("garbage"))
            assert response.status_code == 401
        limited = client.post("/invites/not-a-real-token/accept", headers=auth_headers("garbage"))
        assert limited.status_code == 429
        assert limited.json()["error"]["code"] == "rate_limited"
        fake_clock.advance(61)
        assert client.post("/invites/not-a-real-token/accept", headers=auth_headers("garbage")).status_code == 401
    finally:
        settings.rate_limit_enabled = False
        rate_limiter.clock = original_clock
        rate_limiter.reset()


def test_login_timing_equalization_invokes_one_verify_on_401_paths(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    signup(client, "equalized@example.com")
    calls: list[tuple[str, str]] = []

    def spy(password: str, password_hash: str) -> bool:
        calls.append((password, password_hash))
        return False

    monkeypatch.setattr(auth_service, "verify_password", spy)
    unknown = client.post("/auth/login", json={"email": "unknown@example.com", "password": "bad-password"})
    unknown_body = unknown.content
    assert unknown.status_code == 401
    assert len(calls) == 1
    calls.clear()

    wrong = client.post("/auth/login", json={"email": "equalized@example.com", "password": "bad-password"})
    assert wrong.status_code == 401
    assert wrong.content == unknown_body
    assert len(calls) == 1


def test_pagination_envelope_params_offset_and_status_filter(client: TestClient) -> None:
    owner = signup(client, "pagination@example.com")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    case_a = create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], "A")
    case_b = create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], "B")
    create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"], "C", status="archived")

    default_page = client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/lean-business-cases",
        headers=auth_headers(owner["accessToken"]),
    )
    assert default_page.status_code == 200
    assert default_page.json()["limit"] == 50
    assert default_page.json()["offset"] == 0
    assert default_page.json()["total"] == 3

    first = client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/lean-business-cases?limit=1&offset=0",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    second = client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/lean-business-cases?limit=1&offset=1",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    assert [item["id"] for item in first["items"]] == [case_a["id"]]
    assert [item["id"] for item in second["items"]] == [case_b["id"]]
    assert first["total"] == second["total"] == 3

    archived = client.get(
        f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/lean-business-cases?status=archived",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    assert archived["total"] == 1
    assert archived["items"][0]["status"] == "archived"

    for query in ["limit=0", "limit=201", "offset=-1"]:
        invalid = client.get(
            f"/workspaces/{owner['workspace']['id']}/strategic-objectives/{objective['id']}/lean-business-cases?{query}",
            headers=auth_headers(owner["accessToken"]),
        )
        assert invalid.status_code == 422
        assert invalid.json()["error"]["code"] == "validation_error"


def test_pagination_boundary_pages_more_than_default_limit(client: TestClient) -> None:
    owner = signup(client, "pagination-boundary@example.com")
    objective = create_objective(client, owner["workspace"]["id"], owner["accessToken"])
    case = create_case(client, owner["workspace"]["id"], objective["id"], owner["accessToken"])
    feature = client.post(
        f"/workspaces/{owner['workspace']['id']}/lean-business-cases/{case['id']}/features",
        headers=auth_headers(owner["accessToken"]),
        json={"featureName": "Feature"},
    ).json()
    for index in range(60):
        response = client.post(
            f"/workspaces/{owner['workspace']['id']}/features/{feature['id']}/requirements",
            headers=auth_headers(owner["accessToken"]),
            json={"requirementName": f"Requirement {index:02d}"},
        )
        assert response.status_code == 201, response.text

    first = client.get(
        f"/workspaces/{owner['workspace']['id']}/features/{feature['id']}/requirements?limit=50&offset=0",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    second = client.get(
        f"/workspaces/{owner['workspace']['id']}/features/{feature['id']}/requirements?limit=50&offset=50",
        headers=auth_headers(owner["accessToken"]),
    ).json()
    assert first["total"] == second["total"] == 60
    assert len(first["items"]) == 50
    assert len(second["items"]) == 10
    assert {item["id"] for item in first["items"]}.isdisjoint({item["id"] for item in second["items"]})


def test_body_size_limit_envelope(client: TestClient) -> None:
    settings.max_request_body_bytes = 80
    oversized = client.post("/auth/signup", json=signup_payload("large@example.com") | {"fullName": "x" * 200})
    assert oversized.status_code == 413
    assert oversized.json()["error"]["code"] == "payload_too_large"
    settings.max_request_body_bytes = 1_048_576
    normal = client.post("/auth/signup", json=signup_payload("normal-size@example.com"))
    assert normal.status_code == 201
