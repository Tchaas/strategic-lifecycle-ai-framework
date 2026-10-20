"""Create real test records through the new account/setup endpoints."""

import re
from typing import Any

from app.core.db import SessionLocal
from app.models.email import EmailOutbox
from fastapi.testclient import TestClient
from sqlalchemy import select


def verification_token(email: str) -> str:
    with SessionLocal() as db:
        message = db.scalar(
            select(EmailOutbox).where(EmailOutbox.recipient == email).order_by(EmailOutbox.created_at.desc()).limit(1)
        )
        assert message is not None
        match = re.search(r"token=([A-Za-z0-9_-]+)", message.body)
        assert match
        return match.group(1)


def signup_workspace(client: TestClient, email: str, workspace_name: str = "Acme") -> dict[str, Any]:
    response = client.post(
        "/auth/signup",
        json={
            "email": email,
            "password": "correct-horse",
            "fullName": email.split("@")[0],
        },
    )
    assert response.status_code == 201, response.text
    account = response.json()
    verified = client.post("/auth/verify-email/" + verification_token(email))
    assert verified.status_code == 200, verified.text
    account["user"] = verified.json()
    headers = {"Authorization": "Bearer " + account["accessToken"]}
    response = client.post("/workspaces", headers=headers, json={"name": workspace_name})
    assert response.status_code == 201, response.text
    account["workspace"] = response.json()["workspace"]
    base = "/workspaces/" + account["workspace"]["id"]
    response = client.post(base + "/departments", headers=headers, json={"name": "Initial department"})
    assert response.status_code == 201, response.text
    response = client.post(base + "/complete-setup", headers=headers)
    assert response.status_code == 200, response.text
    account["workspace"] = response.json()
    return account
