"""Check SMTP configuration/authentication without sending mail or printing credentials."""

import argparse
import json
from urllib.parse import urlsplit

from app.core.config import settings
from app.services.email_transport import (
    EmailConfigurationError,
    delivery_error_code,
    smtp_connection,
    validate_email_config,
)


def export_config() -> dict[str, str]:
    # Password and username are loaded directly from backend .env/shell by each service.
    return {
        "EMAIL_PROVIDER": settings.email_provider,
        "EMAIL_FROM": settings.email_from,
        "SMTP_HOST": settings.smtp_host,
        "SMTP_PORT": str(settings.smtp_port),
        "SMTP_SECURITY": settings.smtp_security,
    }


def check_email() -> dict[str, str | bool]:
    validate_email_config()
    base = urlsplit(settings.frontend_base_url)
    if (
        base.scheme not in ("http", "https")
        or not base.hostname
        or base.username
        or base.password
        or base.query
        or base.fragment
    ):
        raise EmailConfigurationError("Set FRONTEND_BASE_URL to the app URL used in verification links")
    if settings.email_provider == "smtp-local":
        # The local inbox is started after preflight by the launcher.
        return {"provider": "smtp-local", "externalDelivery": False}
    with smtp_connection():
        pass
    return {
        "provider": "smtp",
        "authentication": "passed",
        "inboxDelivery": "unverified",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--export-config", action="store_true")
    args = parser.parse_args()
    if args.export_config:
        print(json.dumps(export_config()))
        return
    try:
        result = check_email()
    except EmailConfigurationError as exc:
        raise SystemExit(str(exc)) from None
    except Exception as exc:
        # Provider text can contain recipient addresses, credentials, or message content.
        raise SystemExit(
            f"SMTP preflight failed ({delivery_error_code(exc)}). Check mail server settings and access."
        ) from None
    print(json.dumps(result))


if __name__ == "__main__":
    main()
