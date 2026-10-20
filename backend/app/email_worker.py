"""Run separately: python -m app.email_worker. No email or tokens are logged."""

import argparse
import logging
import smtplib
import time
from datetime import timedelta
from email.message import EmailMessage
from email.utils import formatdate

from sqlalchemy import select

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.security import utc_now
from app.models.email import EmailOutbox
from app.services.email_transport import (
    delivery_error_code,
    smtp_connection,
    validate_email_config,
)

logger = logging.getLogger(__name__)


def send_message(message: EmailOutbox) -> str:
    sender = validate_email_config()
    mail = EmailMessage()
    mail["From"] = settings.email_from
    mail["To"] = message.recipient
    mail["Subject"] = message.subject
    mail["Date"] = formatdate(localtime=False)
    mail["Message-ID"] = f"<{message.id}@{sender.rsplit('@', 1)[1]}>"
    mail.set_content(message.body)
    with smtp_connection() as smtp:
        refused = smtp.send_message(mail, from_addr=sender, to_addrs=[message.recipient])
        if refused:
            raise smtplib.SMTPRecipientsRefused(refused)
    # This is our message identifier, not a provider delivery receipt.
    return str(mail["Message-ID"])


def deliver_one() -> bool:
    with SessionLocal() as db:
        message = db.scalar(
            select(EmailOutbox)
            .where(
                EmailOutbox.status == "queued",
                EmailOutbox.available_at <= utc_now(),
                EmailOutbox.delivery_provider == settings.email_provider,
            )
            .order_by(EmailOutbox.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if message is None:
            return False
        message.attempts += 1
        try:
            message_id = send_message(message)
        except Exception as exc:
            # Keep the failure truthful without persisting provider errors containing PII/secrets.
            message.last_error_code = delivery_error_code(exc)
            permanent = message.last_error_code in {
                "email_not_configured",
                "smtp_tls_failed",
                "smtp_security_unsupported",
                "smtp_authentication_failed",
                "smtp_recipient_rejected",
                "smtp_message_rejected",
            }
            message.status = "failed" if permanent or message.attempts >= 5 else "queued"
            logger.warning(
                "Email attempt failed: provider=%s code=%s attempt=%s",
                message.delivery_provider,
                message.last_error_code,
                message.attempts,
            )
            message.available_at = utc_now() + timedelta(seconds=min(300, 15 * 2**message.attempts))
            if message.status == "failed":
                message.body = ""
        else:
            message.status = "sent"
            message.provider_message_id = message_id
            message.last_error_code = None
            message.sent_at = utc_now()
            message.body = ""  # Drop the delivery copy of the verification secret.
        db.commit()
    return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    while True:
        worked = deliver_one()
        if args.once:
            return
        if not worked:
            time.sleep(1)


if __name__ == "__main__":
    main()
