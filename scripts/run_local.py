"""Start the local onboarding stack. Ctrl-C stops it; saved app records remain."""

import argparse
import json
import os
import secrets
import shutil
import socket
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / ".local" / "onboarding"
BACKEND = ROOT / "backend"
PYTHON = BACKEND / ".venv" / "bin" / "python"


def pg_tool(name):
    found = shutil.which(name)
    if found:
        return found
    fallback = Path("/opt/homebrew/opt/postgresql@16/bin") / name
    if fallback.exists():
        return str(fallback)
    raise RuntimeError(f"Install PostgreSQL and put {name} on PATH")


def main():
    parser = argparse.ArgumentParser(description="Run the app locally, using authenticated SMTP by default")
    parser.add_argument(
        "--email-provider",
        choices=("smtp", "smtp-local"),
        help="smtp-local only delivers to the test inbox",
    )
    args = parser.parse_args()
    if not PYTHON.exists():
        raise RuntimeError("Create backend/.venv and install backend/requirements-dev.txt first")
    env = os.environ.copy()
    env["DATABASE_URL"] = "postgresql+psycopg://postgres@127.0.0.1:55439/slaf_local"
    env["FRONTEND_BASE_URL"] = "http://127.0.0.1:5173"
    if args.email_provider:
        env["EMAIL_PROVIDER"] = args.email_provider
    # Let the backend load .env; inherit shell overrides and export only non-secret email settings.
    config = subprocess.check_output(
        [str(PYTHON), "-m", "app.email_preflight", "--export-config"],
        cwd=BACKEND,
        env=env,
        text=True,
    )
    env.update(json.loads(config))
    local_mail = env["EMAIL_PROVIDER"] == "smtp-local"
    if local_mail:
        # Explicit test mode uses only the inbox started by this launcher.
        env.update(
            {
                "SMTP_HOST": "127.0.0.1",
                "SMTP_PORT": "1025",
                "EMAIL_FROM": "no-reply@slaf.local",
            }
        )
    preflight = subprocess.run([str(PYTHON), "-m", "app.email_preflight"], cwd=BACKEND, env=env)
    if preflight.returncode:
        raise SystemExit(preflight.returncode)
    ports = (5173, 8000, 55439, 8025, 1025) if local_mail else (5173, 8000, 55439)
    for port in ports:
        with socket.socket() as probe:
            if probe.connect_ex(("127.0.0.1", port)) == 0:
                raise RuntimeError(f"Port {port} is already in use; stop that local service before starting this stack")
    LOCAL.mkdir(parents=True, exist_ok=True)
    os.chmod(LOCAL, 0o700)
    key_file = LOCAL / "jwt-secret"
    if not key_file.exists():
        key_file.write_text(secrets.token_urlsafe(48))
        key_file.chmod(0o600)
    env.update(
        {
            "DATABASE_URL": "postgresql+psycopg://postgres@127.0.0.1:55439/slaf_local",
            "JWT_SECRET": key_file.read_text().strip(),
            "CORS_ALLOWED_ORIGINS": "http://127.0.0.1:5173,http://localhost:5173",
            "FRONTEND_BASE_URL": "http://127.0.0.1:5173",
            "VITE_API_BASE_URL": "http://127.0.0.1:8000",
            "BASE_PATH": "/",
            "RATE_LIMIT_ENABLED": "true",
        }
    )
    data = LOCAL / "postgres"
    if not (data / "PG_VERSION").exists():
        subprocess.run(
            [
                pg_tool("initdb"),
                "-D",
                str(data),
                "-U",
                "postgres",
                "--auth=trust",
                "--encoding=UTF8",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
        )
    children, logs = [], []
    started_pg = False
    try:
        subprocess.run(
            [
                pg_tool("pg_ctl"),
                "-D",
                str(data),
                "-l",
                str(LOCAL / "postgres.log"),
                "-o",
                "-h 127.0.0.1 -p 55439 -k /tmp",
                "start",
            ],
            check=True,
        )
        started_pg = True
        exists = subprocess.check_output(
            [
                pg_tool("psql"),
                "-h",
                "127.0.0.1",
                "-p",
                "55439",
                "-U",
                "postgres",
                "-d",
                "postgres",
                "-tAc",
                "SELECT 1 FROM pg_database WHERE datname='slaf_local'",
            ],
            text=True,
        ).strip()
        if not exists:
            subprocess.run(
                [
                    pg_tool("createdb"),
                    "-h",
                    "127.0.0.1",
                    "-p",
                    "55439",
                    "-U",
                    "postgres",
                    "slaf_local",
                ],
                check=True,
            )
        subprocess.run(
            [str(PYTHON), "-m", "alembic", "upgrade", "head"],
            cwd=BACKEND,
            env=env,
            check=True,
        )
        services = [
            (
                "api",
                [
                    str(PYTHON),
                    "-m",
                    "uvicorn",
                    "app.main:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "8000",
                    "--no-access-log",
                ],
                BACKEND,
            ),
            ("email-worker", [str(PYTHON), "-m", "app.email_worker"], BACKEND),
            (
                "frontend",
                [
                    "npm",
                    "run",
                    "dev",
                    "--",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "5173",
                    "--strictPort",
                ],
                ROOT / "Build Webpage Framework",
            ),
        ]
        if local_mail:
            services.insert(
                0,
                ("inbox", [str(PYTHON), str(ROOT / "scripts/local_mailbox.py")], ROOT),
            )
        for name, command, cwd in services:
            log = (LOCAL / f"{name}.log").open("a")
            logs.append(log)
            children.append(subprocess.Popen(command, cwd=cwd, env=env, stdout=log, stderr=log))
        print("Local app: http://127.0.0.1:5173", flush=True)
        if local_mail:
            print(
                "EMAIL IS LOCAL ONLY: http://127.0.0.1:8025 (no external email is sent)",
                flush=True,
            )
        else:
            print(
                "Email transport: authenticated SMTP. Check the recipient's external inbox.",
                flush=True,
            )
        print(
            "Ctrl-C stops the stack. Saved workspace records remain in .local/onboarding.",
            flush=True,
        )
        while True:
            if any(child.poll() is not None for child in children):
                raise RuntimeError("A local service stopped. Check .local/onboarding/*.log")
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        for child in reversed(children):
            child.terminate()
        for child in children:
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()
        for log in logs:
            log.close()
        if started_pg:
            subprocess.run([pg_tool("pg_ctl"), "-D", str(data), "stop", "-m", "fast"], check=True)


if __name__ == "__main__":
    main()
