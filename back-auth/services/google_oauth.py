"""Google OAuth helper functions."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from authlib.integrations.httpx_client import AsyncOAuth2Client

from core.config import get_settings

logger = logging.getLogger(__name__)


async def exchange_code_for_tokens(code: str, code_verifier: str | None = None) -> Dict[str, Any]:
    settings = get_settings()
    if not settings.google_oauth_client_id or not settings.google_oauth_client_secret or not settings.google_oauth_redirect_uri:
        raise RuntimeError("Google OAuth not configured")

    async with AsyncOAuth2Client(
        client_id=settings.google_oauth_client_id,
        client_secret=settings.google_oauth_client_secret,
        redirect_uri=settings.google_oauth_redirect_uri,
        scope=settings.google_scopes_list(),
    ) as client:
        token = await client.fetch_token(
            settings.google_oauth_token_endpoint,
            code=code,
            code_verifier=code_verifier,
        )
        return token


async def fetch_userinfo(access_token: str) -> Dict[str, Any]:
    settings = get_settings()
    async with AsyncOAuth2Client() as client:
        resp = await client.get(
            settings.google_oauth_userinfo_endpoint,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()
