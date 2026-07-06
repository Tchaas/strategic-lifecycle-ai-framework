from __future__ import annotations

import os
import secrets
import subprocess
from collections.abc import Generator
from pathlib import Path

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy import text

os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(32))
os.environ.setdefault("JWT_ACCESS_TTL", "900")
os.environ.setdefault("JWT_REFRESH_TTL", "2592000")
os.environ.setdefault("GOOGLE_OAUTH_CLIENT_ID", "test-google-client-id")
os.environ.setdefault("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
if "TEST_DATABASE_URL" in os.environ:
    os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]
else:
    os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/test")

from app.main import create_app  # noqa: E402


@pytest.fixture(scope="session")
def database_url() -> str:
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL is required for integration tests")
    return url


@pytest.fixture(scope="session", autouse=True)
def migrated_database(database_url: str) -> Generator[None, None, None]:
    env = os.environ.copy()
    env["DATABASE_URL"] = database_url
    subprocess.run(["alembic", "downgrade", "base"], cwd=Path(__file__).resolve().parents[1], env=env, check=True)
    subprocess.run(["alembic", "upgrade", "head"], cwd=Path(__file__).resolve().parents[1], env=env, check=True)
    yield
    subprocess.run(["alembic", "downgrade", "base"], cwd=Path(__file__).resolve().parents[1], env=env, check=True)


@pytest.fixture()
def engine(database_url: str, migrated_database: None) -> Generator[sa.Engine, None, None]:
    engine = sa.create_engine(database_url)
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE users RESTART IDENTITY CASCADE"))
    yield engine
    engine.dispose()


@pytest.fixture()
def client(engine: sa.Engine) -> TestClient:
    return TestClient(create_app(), raise_server_exceptions=False)
