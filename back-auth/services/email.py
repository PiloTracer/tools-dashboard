"""Email delivery helpers."""

from __future__ import annotations

import logging
from email.message import EmailMessage

import aiosmtplib

from core.config import get_settings

logger = logging.getLogger(__name__)


async def send_verification_email(recipient: str, verification_url: str) -> None:
    settings = get_settings()
    if not settings.mail_host or not settings.mail_sender:
        logger.warning("Email delivery skipped: MAIL_HOST or MAIL_SENDER not configured.")
        logger.info("Verification link for %s: %s", recipient, verification_url)
        return

    message = EmailMessage()
    message["Subject"] = "Verify your Tools Dashboard account"
    message["From"] = settings.mail_sender
    message["To"] = recipient
    message.set_content(
        "Hi there,\n\n"
        "Thanks for registering with Tools Dashboard. Complete your signup by verifying your email:\n\n"
        f"{verification_url}\n\n"
        "If you didn't request this, you can ignore this message.\n"
    )
    message.add_alternative(
        "<p>Hi there,</p>"
        "<p>Thanks for registering with Tools Dashboard. Complete your signup by verifying your email:</p>"
        f'<p><a href="{verification_url}">{verification_url}</a></p>'
        "<p>If you didn&#39;t request this, you can ignore this message.</p>",
        subtype="html",
    )

    use_tls = settings.mail_use_tls and settings.mail_port in {465}
    start_tls = settings.mail_use_tls and settings.mail_port in {25, 587}

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.mail_host,
            port=settings.mail_port,
            username=settings.mail_username,
            password=settings.mail_password,
            use_tls=use_tls,
            start_tls=start_tls,
        )
    except Exception as exc:  # pylint: disable=broad-except
        logger.exception("Failed to send verification email to %s", recipient)
        raise RuntimeError("Unable to send verification email") from exc
