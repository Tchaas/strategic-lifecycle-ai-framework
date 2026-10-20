"""Backend SMTP connection shared by delivery and the no-send startup check."""

import smtplib
import ssl
from collections.abc import Iterator
from contextlib import contextmanager
from email.headerregistry import Address
from email.utils import parseaddr

from app.core.config import settings


class EmailConfigurationError(RuntimeError):
    pass


def validate_email_config() -> str:
    if settings.email_provider not in ("smtp", "smtp-local"):
        raise EmailConfigurationError("EMAIL_PROVIDER must be smtp or smtp-local; request fresh mail after switching")
    try:
        if not settings.email_from or "\r" in settings.email_from or "\n" in settings.email_from:
            raise ValueError
        sender = parseaddr(settings.email_from)[1]
        address = Address(addr_spec=sender)
        if not address.username or not address.domain:
            raise ValueError
    except ValueError:
        raise EmailConfigurationError("Set EMAIL_FROM to your authorized sender address in backend/.env") from None
    if not settings.smtp_host or any(char.isspace() for char in settings.smtp_host):
        raise EmailConfigurationError("Set SMTP_HOST to your outgoing mail server in backend/.env")
    if not 1 <= settings.smtp_port <= 65535:
        raise EmailConfigurationError("SMTP_PORT must be between 1 and 65535")
    if settings.email_provider == "smtp-local":
        if settings.smtp_host not in ("localhost", "127.0.0.1", "::1"):
            raise EmailConfigurationError("Local SMTP requires a loopback host")
    else:
        if address.domain.endswith((".local", ".test")):
            raise EmailConfigurationError("Set EMAIL_FROM to your authorized external sender address")
        if settings.smtp_security not in ("starttls", "ssl"):
            raise EmailConfigurationError("SMTP_SECURITY must be starttls or ssl; unencrypted delivery is disabled")
        if not settings.smtp_username or not settings.smtp_password.get_secret_value():
            raise EmailConfigurationError("Set SMTP_USERNAME and SMTP_PASSWORD in backend configuration")
    return sender


@contextmanager
def smtp_connection() -> Iterator[smtplib.SMTP]:
    validate_email_config()
    local = settings.email_provider == "smtp-local"
    smtp: smtplib.SMTP
    if not local and settings.smtp_security == "ssl":
        smtp = smtplib.SMTP_SSL(
            settings.smtp_host,
            settings.smtp_port,
            timeout=15,
            context=ssl.create_default_context(),
        )
    else:
        smtp = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)
    try:
        if not local:
            smtp.ehlo()
            if settings.smtp_security == "starttls":
                smtp.starttls(context=ssl.create_default_context())
                smtp.ehlo()
            # Never authenticate before TLS, or send external mail without authentication.
            smtp.login(settings.smtp_username, settings.smtp_password.get_secret_value())
        yield smtp
    finally:
        # A failed QUIT must not turn an already accepted message into a failed send.
        try:
            smtp.quit()
        except (OSError, smtplib.SMTPException):
            pass
        finally:
            smtp.close()


def delivery_error_code(exc: Exception) -> str:
    if isinstance(exc, EmailConfigurationError):
        return "email_not_configured"
    if isinstance(exc, ssl.SSLError):
        return "smtp_tls_failed"
    if isinstance(exc, smtplib.SMTPNotSupportedError):
        return "smtp_security_unsupported"
    if isinstance(exc, smtplib.SMTPAuthenticationError):
        return "smtp_authentication_failed" if exc.smtp_code >= 500 else "smtp_temporarily_unavailable"
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        permanent = bool(exc.recipients) and all(code >= 500 for code, _ in exc.recipients.values())
        return "smtp_recipient_rejected" if permanent else "smtp_temporarily_unavailable"
    if isinstance(exc, smtplib.SMTPResponseException):
        return "smtp_message_rejected" if exc.smtp_code >= 500 else "smtp_temporarily_unavailable"
    if isinstance(exc, OSError | smtplib.SMTPException):
        return "delivery_connection_failed"
    return "delivery_failed"
