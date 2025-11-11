"""Authentication service helpers."""

from __future__ import annotations

import base64
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.database import create_session


def generate_token(length: int = 32) -> str:
    return base64.urlsafe_b64encode(os.urandom(length)).decode("utf-8").rstrip("=")


async def create_user_session(session: AsyncSession, user_id: int) -> tuple[str, datetime]:
    settings = get_settings()
    token = generate_token(24)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.session_cookie_max_age)
    await create_session(session, user_id, token, expires_at)
    return token, expires_at
