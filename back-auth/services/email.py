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
        f"""Hi there,

Thanks for registering with Tools Dashboard. Complete your signup by verifying your email:

{verification_url}

If you didn’t request this, you can ignore this message.

"""
    )

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.mail_host,
            port=settings.mail_port,
            username=settings.mail_username,
            password=settings.mail_password,
            use_tls=settings.mail_use_tls,
        )
    except Exception as exc:
        logger.exception("Failed to send verification email to %s", recipient)
        raise RuntimeError("Unable to send verification email") from exc
