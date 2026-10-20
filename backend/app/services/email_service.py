"""Transactional outbox: messages are committed with their account/invitation."""

import secrets
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AppError
from app.core.security import hash_refresh_token, utc_now
from app.models.email import EmailOutbox, EmailVerificationToken, PasswordResetToken
from app.models.users import User


def queue_verification(db: Session, user: User) -> None:
    now = utc_now()
    previous = db.scalar(
        select(EmailVerificationToken)
        .where(EmailVerificationToken.user_id == user.id)
        .order_by(EmailVerificationToken.created_at.desc())
        .limit(1)
    )
    if previous and (now - previous.created_at).total_seconds() < settings.verification_resend_seconds:
        raise AppError("rate_limited", "Please wait a minute before requesting another email", 429)
    token = secrets.token_urlsafe(32)
    db.add(
        EmailVerificationToken(
            user_id=user.id,
            token_hash=hash_refresh_token(token),
            expires_at=now + timedelta(seconds=settings.verification_ttl),
        )
    )
    link = f"{settings.frontend_base_url.rstrip('/')}/#/verify-email?token={token}"
    db.add(
        EmailOutbox(
            delivery_provider=settings.email_provider,
            kind="verification",
            user_id=user.id,
            recipient=user.email,
            subject="Verify your email",
            body=f"Verify your email to set up your workspace:\n\n{link}\n\nThis link expires in 24 hours.",
        )
    )


def verify_email(db: Session, token: str) -> User:
    # Lock the user before the token, consistently with resend and invitation acceptance.
    token_hash = hash_refresh_token(token)
    user_id = db.scalar(select(EmailVerificationToken.user_id).where(EmailVerificationToken.token_hash == token_hash))
    if user_id is None:
        raise AppError("invalid_token", "This verification link is invalid", 400)
    user = db.scalar(select(User).where(User.id == user_id).with_for_update())
    record = db.scalar(
        select(EmailVerificationToken).where(EmailVerificationToken.token_hash == token_hash).with_for_update()
    )
    if user is None or record is None:
        raise AppError("invalid_token", "This verification link is invalid", 400)
    if record.used_at is not None:
        raise AppError("token_used", "This link has already been used. Sign in to continue.", 409)
    if record.expires_at <= utc_now():
        raise AppError(
            "token_expired",
            "This link has expired. Request another verification email.",
            410,
        )
    record.used_at = utc_now()
    user.email_verified = True
    db.commit()
    return user


def queue_password_reset(db: Session, user: User) -> None:
    """Queue a reset link unless one was just sent; callers respond identically either way."""
    now = utc_now()
    previous = db.scalar(
        select(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id)
        .order_by(PasswordResetToken.created_at.desc())
        .limit(1)
    )
    if previous and (now - previous.created_at).total_seconds() < settings.verification_resend_seconds:
        return
    token = secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_refresh_token(token),
            expires_at=now + timedelta(seconds=settings.password_reset_ttl),
        )
    )
    link = f"{settings.frontend_base_url.rstrip('/')}/#/reset-password?token={token}"
    if user.password_hash:
        intro = "Use this link to choose a new password:"
    else:
        intro = "This account signs in with Google. Use this link to add a password as another way to sign in:"
    db.add(
        EmailOutbox(
            delivery_provider=settings.email_provider,
            kind="password_reset",
            user_id=user.id,
            recipient=user.email,
            subject="Reset your password",
            body=f"{intro}\n\n{link}\n\nThis link expires in 1 hour. If you did not request it, ignore this email.",
        )
    )


def queue_password_changed(db: Session, user: User) -> None:
    db.add(
        EmailOutbox(
            delivery_provider=settings.email_provider,
            kind="password_changed",
            user_id=user.id,
            recipient=user.email,
            subject="Your password was changed",
            body=(
                "The password for your account was just changed and all signed-in sessions were ended.\n\n"
                "If you did not make this change, reset your password immediately."
            ),
        )
    )
