"""SMTP delivery, real local TLS/auth, recovery, and transport isolation.

The local test server does not establish delivery to an external recipient inbox.
"""

import json
import os
import queue
import re
import smtplib
import socket
import ssl
import subprocess
import sys
from datetime import timedelta
from email import policy
from email.parser import BytesParser
from pathlib import Path
from unittest.mock import patch

import pytest
from aiosmtpd.controller import Controller
from aiosmtpd.smtp import AuthResult, LoginPassword
from app.core.config import settings
from app.core.db import SessionLocal
from app.core.security import utc_now
from app.email_preflight import check_email, export_config, main
from app.email_worker import deliver_one
from app.models.email import EmailOutbox
from app.services.email_transport import EmailConfigurationError, validate_email_config
from pydantic import SecretStr
from sqlalchemy import select


@pytest.fixture(autouse=True)
def smtp_settings(monkeypatch):
    for key, value in {
        "email_provider": "smtp",
        "email_from": "Workspace <verify@example.com>",
        "smtp_host": "smtp.example.com",
        "smtp_port": 587,
        "smtp_security": "starttls",
        "smtp_username": "smtp-test-user",
        "smtp_password": SecretStr("smtp-test-secret"),
        "frontend_base_url": "http://127.0.0.1:5173",
    }.items():
        monkeypatch.setattr(settings, key, value)


def signup(client, email="delivery@example.com"):
    response = client.post(
        "/auth/signup",
        json={"email": email, "fullName": "Email tester", "password": "correct-horse"},
    )
    assert response.status_code == 201, response.text
    assert "token=" not in response.text
    return {"Authorization": "Bearer " + response.json()["accessToken"]}


def test_smtp_acceptance_requires_tls_then_auth_and_records_message_id(client):
    auth = signup(client)
    with patch("app.services.email_transport.smtplib.SMTP") as connect:
        smtp = connect.return_value
        smtp.send_message.return_value = {}
        assert deliver_one()
        assert [c[0] for c in smtp.method_calls] == [
            "ehlo",
            "starttls",
            "ehlo",
            "login",
            "send_message",
            "quit",
            "close",
        ]
        context = smtp.starttls.call_args.kwargs["context"]
        assert context.check_hostname and context.verify_mode == ssl.CERT_REQUIRED
        smtp.login.assert_called_once_with("smtp-test-user", "smtp-test-secret")
        mail = smtp.send_message.call_args.args[0]
        assert mail["From"] == "Workspace <verify@example.com>"
        assert mail["To"] == "delivery@example.com"
        assert mail["Date"] and "#/verify-email?token=" in mail.get_content()
        assert smtp.send_message.call_args.kwargs == {
            "from_addr": "verify@example.com",
            "to_addrs": ["delivery@example.com"],
        }
    with SessionLocal() as db:
        message = db.scalar(select(EmailOutbox))
        assert message.status == "sent" and message.provider_message_id == mail["Message-ID"]
        assert message.body == "" and message.last_error_code is None
    status = client.get("/auth/verification/status", headers=auth).json()
    assert status["deliveryProvider"] == "smtp" and status["status"] == "sent"
    assert "token=" not in json.dumps(status) and "smtp-test-secret" not in json.dumps(status)


@pytest.mark.parametrize(
    "failure,code,final",
    [
        (
            smtplib.SMTPAuthenticationError(535, b"SECRET"),
            "smtp_authentication_failed",
            True,
        ),
        (
            smtplib.SMTPAuthenticationError(454, b"SECRET"),
            "smtp_temporarily_unavailable",
            False,
        ),
        (
            smtplib.SMTPRecipientsRefused({"private@example.com": (550, b"SECRET")}),
            "smtp_recipient_rejected",
            True,
        ),
        (
            smtplib.SMTPRecipientsRefused({"private@example.com": (450, b"SECRET")}),
            "smtp_temporarily_unavailable",
            False,
        ),
        (smtplib.SMTPDataError(554, b"SECRET"), "smtp_message_rejected", True),
        (smtplib.SMTPDataError(451, b"SECRET"), "smtp_temporarily_unavailable", False),
        (ssl.SSLCertVerificationError("SECRET"), "smtp_tls_failed", True),
        (smtplib.SMTPNotSupportedError("SECRET"), "smtp_security_unsupported", True),
        (ConnectionRefusedError("SECRET"), "delivery_connection_failed", False),
    ],
)
def test_delivery_failures_are_safe_and_retry_only_when_recoverable(client, caplog, failure, code, final):
    auth = signup(client)
    with patch("app.email_worker.send_message", side_effect=failure):
        assert deliver_one()
    status = client.get("/auth/verification/status", headers=auth).json()
    assert status["status"] == ("failed" if final else "queued")
    assert status["deliveryError"] == code
    assert "SECRET" not in caplog.text and "private@example.com" not in caplog.text
    with SessionLocal() as db:
        message = db.scalar(select(EmailOutbox))
        assert bool(message.body) is not final
        assert message.provider_message_id is None
        assert message.attempts == 1
        assert message.available_at > utc_now()


def test_tls_failure_never_authenticates_or_sends(client):
    signup(client)
    with patch("app.services.email_transport.smtplib.SMTP") as connect:
        smtp = connect.return_value
        smtp.starttls.side_effect = smtplib.SMTPNotSupportedError("TLS unavailable")
        assert deliver_one()
        smtp.login.assert_not_called()
        smtp.send_message.assert_not_called()
        smtp.close.assert_called_once()


def test_recipient_refusal_return_value_is_not_success(client):
    auth = signup(client)
    with patch("app.services.email_transport.smtplib.SMTP") as connect:
        connect.return_value.send_message.return_value = {"delivery@example.com": (550, b"Rejected")}
        assert deliver_one()
    assert client.get("/auth/verification/status", headers=auth).json()["status"] == "failed"


def test_quit_failure_does_not_resend_accepted_mail(client):
    auth = signup(client)
    with patch("app.services.email_transport.smtplib.SMTP") as connect:
        connect.return_value.send_message.return_value = {}
        connect.return_value.quit.side_effect = smtplib.SMTPServerDisconnected()
        assert deliver_one()
    assert client.get("/auth/verification/status", headers=auth).json()["status"] == "sent"
    assert deliver_one() is False


@pytest.mark.parametrize("previous_provider", ["smtp-local", "ses", "unknown"])
def test_smtp_never_replays_other_transports(client, monkeypatch, previous_provider):
    monkeypatch.setattr(settings, "email_provider", previous_provider)
    auth = signup(client)
    monkeypatch.setattr(settings, "email_provider", "smtp")
    with patch("app.email_worker.send_message") as send:
        assert deliver_one() is False
        send.assert_not_called()
    status = client.get("/auth/verification/status", headers=auth).json()
    assert status["deliveryProvider"] == previous_provider
    assert status["currentProvider"] == "smtp" and status["status"] == "queued"


@pytest.mark.parametrize(
    "field,value",
    [
        ("email_from", ""),
        ("email_from", "Bad\r\nBcc: victim@example.com"),
        ("email_from", "sender@slaf.local"),
        ("smtp_host", ""),
        ("smtp_port", 0),
        ("smtp_security", "none"),
        ("smtp_username", ""),
        ("smtp_password", SecretStr("")),
        ("email_provider", "ses"),
    ],
)
def test_preflight_rejects_incomplete_or_unsafe_configuration(monkeypatch, field, value):
    monkeypatch.setattr(settings, field, value)
    with patch("app.services.email_transport.smtplib.SMTP") as connect:
        with pytest.raises(EmailConfigurationError):
            check_email()
        connect.assert_not_called()


def test_preflight_authenticates_without_sending_or_exporting_credentials():
    with patch("app.services.email_transport.smtplib.SMTP") as connect:
        result = check_email()
        connect.return_value.login.assert_called_once()
        connect.return_value.send_message.assert_not_called()
    assert result == {
        "provider": "smtp",
        "authentication": "passed",
        "inboxDelivery": "unverified",
    }
    assert "SMTP_PASSWORD" not in export_config() and "SMTP_USERNAME" not in export_config()
    assert "smtp-test-secret" not in repr(settings)


def test_preflight_cli_hides_provider_response(monkeypatch, capsys):
    monkeypatch.setattr(sys, "argv", ["email_preflight"])
    with patch(
        "app.email_preflight.check_email",
        side_effect=smtplib.SMTPAuthenticationError(535, b"SECRET"),
    ):
        with pytest.raises(SystemExit) as result:
            main()
    assert "smtp_authentication_failed" in str(result.value)
    assert "SECRET" not in str(result.value) + capsys.readouterr().out


def test_local_transport_cannot_reach_external_servers(monkeypatch):
    monkeypatch.setattr(settings, "email_provider", "smtp-local")
    with pytest.raises(EmailConfigurationError, match="loopback"):
        validate_email_config()
    monkeypatch.setattr(settings, "smtp_host", "127.0.0.1")
    with patch("app.services.email_transport.smtplib.SMTP") as connect:
        assert check_email()["externalDelivery"] is False
        connect.assert_not_called()


@pytest.fixture(scope="module")
def tls_files(tmp_path_factory):
    directory = tmp_path_factory.mktemp("smtp-tls")
    key, cert = directory / "key.pem", directory / "cert.pem"
    subprocess.run(
        [
            "openssl",
            "req",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-nodes",
            "-days",
            "1",
            "-keyout",
            str(key),
            "-out",
            str(cert),
            "-subj",
            "/CN=localhost",
            "-addext",
            "subjectAltName=DNS:localhost,IP:127.0.0.1",
        ],
        check=True,
        capture_output=True,
    )
    return key, cert


@pytest.mark.parametrize("security", ["starttls", "ssl"])
def test_real_authenticated_tls_delivery_survives_worker_restart(client, monkeypatch, tls_files, security):
    key, cert = tls_files
    server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    server_context.load_cert_chain(cert, key)
    accepted = queue.Queue()
    auth_events = queue.Queue()

    class Handler:
        attempts = 0

        async def handle_DATA(self, server, session, envelope):
            self.attempts += 1
            if self.attempts == 1:
                return "451 Try again later"
            accepted.put(envelope.content)
            return "250 Accepted"

    def authenticate(server, session, envelope, mechanism, credentials):
        success = isinstance(credentials, LoginPassword) and (
            credentials.login == b"smtp-test-user" and credentials.password == b"smtp-test-secret"
        )
        auth_events.put(success)
        return AuthResult(success=success, handled=False)

    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    tls_options = (
        {"tls_context": server_context, "require_starttls": True}
        if security == "starttls"
        else {"ssl_context": server_context, "auth_require_tls": False}
    )
    controller = Controller(
        Handler(), hostname="127.0.0.1", port=port, authenticator=authenticate, auth_required=True, **tls_options
    )
    controller.start()
    try:
        monkeypatch.setattr(settings, "smtp_host", "127.0.0.1")
        monkeypatch.setattr(settings, "smtp_port", port)
        monkeypatch.setattr(settings, "smtp_security", security)
        # Trust only the generated test certificate; production keeps system trust/hostname checks.
        trusted_context = ssl.create_default_context(cafile=str(cert))
        monkeypatch.setattr(
            "app.services.email_transport.ssl.create_default_context",
            lambda: trusted_context,
        )
        assert check_email()["authentication"] == "passed"
        assert auth_events.get(timeout=2) is True and accepted.empty()
        auth = signup(client)
        assert client.post("/workspaces", headers=auth, json={"name": "Blocked"}).status_code == 403
        assert deliver_one()
        assert client.get("/auth/verification/status", headers=auth).json()["status"] == "queued"
        with SessionLocal() as db:
            message = db.scalar(select(EmailOutbox))
            assert message.attempts == 1 and message.body
            message.available_at = utc_now() - timedelta(seconds=1)
            db.commit()
        # A fresh worker process reads the persisted queue and retries through real TLS/auth.
        env = os.environ.copy()
        env.update(export_config())
        env.update(
            {
                "SMTP_USERNAME": "smtp-test-user",
                "SMTP_PASSWORD": "smtp-test-secret",
                "EMAIL_PROVIDER": "smtp",
                "SSL_CERT_FILE": str(cert),
            }
        )
        result = subprocess.run(
            [sys.executable, "-m", "app.email_worker", "--once"],
            cwd=Path(__file__).resolve().parents[1],
            env=env,
            capture_output=True,
            text=True,
            timeout=30,
        )
        assert result.returncode == 0, result.stderr
        mail = BytesParser(policy=policy.default).parsebytes(accepted.get(timeout=3))
        assert mail["To"] == "delivery@example.com"
        token = re.search(r"token=([A-Za-z0-9_-]+)", mail.get_content()).group(1)
        assert "smtp-test-secret" not in result.stdout + result.stderr
        assert token not in result.stdout + result.stderr
        status = client.get("/auth/verification/status", headers=auth).json()
        assert status["status"] == "sent" and status["deliveryProvider"] == "smtp"
        with SessionLocal() as db:
            message = db.scalar(select(EmailOutbox))
            assert message.attempts == 2 and message.body == ""
        assert client.post("/auth/verify-email/" + token).status_code == 200
        assert client.post("/auth/verify-email/" + token).status_code == 409
        assert client.get("/me", headers=auth).json()["emailVerified"] is True
        assert client.post("/workspaces", headers=auth, json={"name": "Verified"}).status_code == 201
    finally:
        controller.stop()
