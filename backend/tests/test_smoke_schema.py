from __future__ import annotations

import uuid

import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError


def expect_integrity_error(conn: sa.Connection, statement: str, params: dict[str, object]) -> None:
    trans = conn.begin_nested()
    try:
        conn.execute(text(statement), params)
    except IntegrityError:
        trans.rollback()
        return
    trans.rollback()
    raise AssertionError(f"Expected IntegrityError for: {statement}")


def test_schema_constraints_and_cascade(engine: sa.Engine) -> None:
    with engine.begin() as conn:
        table_count = conn.scalar(text("""
                SELECT count(*)
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                  AND table_name <> 'alembic_version'
                """))
        assert table_count == 33, table_count

        pk_issues = conn.execute(text("""
                SELECT c.relname, a.attname, format_type(a.atttypid, a.atttypmod), pg_get_expr(d.adbin, d.adrelid)
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                JOIN pg_index i ON i.indrelid = c.oid AND i.indisprimary
                JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
                LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
                WHERE n.nspname = 'public'
                  AND c.relkind = 'r'
                  AND c.relname <> 'alembic_version'
                  AND (a.attname <> 'id'
                       OR format_type(a.atttypid, a.atttypmod) <> 'uuid'
                       OR pg_get_expr(d.adbin, d.adrelid) <> 'gen_random_uuid()')
                ORDER BY c.relname
                """)).all()
        assert pk_issues == [], pk_issues

        fk_index_issues = conn.execute(text("""
                SELECT conrelid::regclass::text AS table_name, a.attname AS column_name
                FROM pg_constraint c
                JOIN unnest(c.conkey) AS cols(attnum) ON true
                JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = cols.attnum
                WHERE c.contype = 'f'
                  AND NOT EXISTS (
                    SELECT 1
                    FROM pg_index i
                    WHERE i.indrelid = c.conrelid
                      AND cols.attnum = ANY(i.indkey)
                  )
                ORDER BY table_name, column_name
                """)).all()
        assert fk_index_issues == [], fk_index_issues

        user_id = conn.scalar(
            text("""
                INSERT INTO users (email, auth_provider)
                VALUES (:email, 'password')
                RETURNING id
                """),
            {"email": f"smoke-{uuid.uuid4()}@example.com"},
        )
        workspace_id = conn.scalar(
            text("""
                INSERT INTO workspaces (created_by_user_id, name)
                VALUES (:user_id, 'Smoke Co')
                RETURNING id
                """),
            {"user_id": user_id},
        )
        architecture_id = conn.scalar(
            text("""
                INSERT INTO business_architecture_components (workspace_id, name, created_by_user_id)
                VALUES (:workspace_id, 'Architecture', :user_id)
                RETURNING id
                """),
            {"workspace_id": workspace_id, "user_id": user_id},
        )
        expect_integrity_error(
            conn,
            """
            INSERT INTO business_architecture_components (workspace_id, name, created_by_user_id)
            VALUES (:workspace_id, 'Duplicate', :user_id)
            """,
            {"workspace_id": workspace_id, "user_id": user_id},
        )

        value_stream_id = conn.scalar(
            text("""
                INSERT INTO value_streams (workspace_id, business_architecture_id, name, created_by_user_id)
                VALUES (:workspace_id, :architecture_id, 'Order to Cash', :user_id)
                RETURNING id
                """),
            {"workspace_id": workspace_id, "architecture_id": architecture_id, "user_id": user_id},
        )
        capability_id = conn.scalar(
            text("""
                INSERT INTO business_capabilities (workspace_id, business_architecture_id, capability_name, created_by_user_id)
                VALUES (:workspace_id, :architecture_id, 'Billing', :user_id)
                RETURNING id
                """),
            {"workspace_id": workspace_id, "architecture_id": architecture_id, "user_id": user_id},
        )
        conn.execute(
            text("""
                INSERT INTO value_stream_capabilities (value_stream_id, capability_id)
                VALUES (:value_stream_id, :capability_id)
                """),
            {"value_stream_id": value_stream_id, "capability_id": capability_id},
        )
        expect_integrity_error(
            conn,
            """
            INSERT INTO value_stream_capabilities (value_stream_id, capability_id)
            VALUES (:value_stream_id, :capability_id)
            """,
            {"value_stream_id": value_stream_id, "capability_id": capability_id},
        )

        objective_id = conn.scalar(
            text("""
                INSERT INTO strategic_objectives (workspace_id, strategic_initiative_name, created_by_user_id)
                VALUES (:workspace_id, 'Improve lifecycle throughput', :user_id)
                RETURNING id
                """),
            {"workspace_id": workspace_id, "user_id": user_id},
        )
        expect_integrity_error(
            conn,
            """
            INSERT INTO lean_business_cases (workspace_id, strategic_objective_id, owner_user_id, title, status, created_by_user_id)
            VALUES (:workspace_id, :objective_id, :user_id, 'Bad status case', 'bogus', :user_id)
            """,
            {"workspace_id": workspace_id, "objective_id": objective_id, "user_id": user_id},
        )
        case_id = conn.scalar(
            text("""
                INSERT INTO lean_business_cases (workspace_id, strategic_objective_id, owner_user_id, title, created_by_user_id)
                VALUES (:workspace_id, :objective_id, :user_id, 'Valid case', :user_id)
                RETURNING id
                """),
            {"workspace_id": workspace_id, "objective_id": objective_id, "user_id": user_id},
        )

        conn.execute(text("DELETE FROM workspaces WHERE id = :workspace_id"), {"workspace_id": workspace_id})
        remaining = conn.scalar(
            text("SELECT count(*) FROM lean_business_cases WHERE id = :case_id"), {"case_id": case_id}
        )
        assert remaining == 0, remaining
