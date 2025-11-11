"""User registration configuration endpoints."""

from __future__ import annotations

import os
import secrets
import urllib.parse
from typing import Any, Dict, Optional

from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse

CSRF_COOKIE_NAME = "registration_csrf"
DEFAULT_PASSWORD_MIN_LENGTH = 12
DEFAULT_GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
DEFAULT_GOOGLE_SCOPES = "openid email profile"

router = APIRouter(prefix="/user-registration", tags=["user-registration"])


def _is_truthy(value: Optional[str]) -> bool:
    return bool(value) and value.lower() not in {"0", "false", "no"}


def _build_google_authorize_url() -> Optional[str]:
    explicit_url = os.getenv("GOOGLE_OAUTH_AUTHORIZE_URL")
    if explicit_url:
        return explicit_url

    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI")

    if not client_id or not redirect_uri:
        return None

    scopes = os.getenv("GOOGLE_OAUTH_SCOPES", DEFAULT_GOOGLE_SCOPES).split()
    auth_endpoint = os.getenv("GOOGLE_OAUTH_AUTH_ENDPOINT", DEFAULT_GOOGLE_AUTH_ENDPOINT)

    query: Dict[str, Any] = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "prompt": "consent",
    }

    allowed_domains = os.getenv("GOOGLE_OAUTH_ALLOWED_DOMAINS")
    if allowed_domains:
        query["hd"] = allowed_domains

    return f"{auth_endpoint}?{urllib.parse.urlencode(query, quote_via=urllib.parse.quote)}"


def _get_password_min_length() -> int:
    raw_value = os.getenv("EMAIL_PASSWORD_MIN_LENGTH")
    if not raw_value:
        return DEFAULT_PASSWORD_MIN_LENGTH
    try:
        parsed = int(raw_value)
        return parsed if parsed >= 8 else DEFAULT_PASSWORD_MIN_LENGTH
    except ValueError:
        return DEFAULT_PASSWORD_MIN_LENGTH


def _should_mark_cookie_secure() -> bool:
    env_value = os.getenv("REGISTRATION_CSRF_COOKIE_SECURE")
    return _is_truthy(env_value) if env_value is not None else True


@router.get("/config", summary="User registration frontend configuration")
async def get_registration_config(response: Response) -> JSONResponse:
    csrf_token = secrets.token_urlsafe(32)
    google_authorize_url = _build_google_authorize_url()

    payload = {
        "csrfToken": csrf_token,
        "providers": {
            "google": {
                "authorizeUrl": google_authorize_url,
                "buttonText": os.getenv("GOOGLE_OAUTH_BUTTON_TEXT", "Continue with Google"),
            }
        }
        if google_authorize_url
        else {},
        "email": {"passwordPolicy": {"minLength": _get_password_min_length()}},
    }

    response = JSONResponse(content=payload)

    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=True,
        secure=_should_mark_cookie_secure(),
        samesite=os.getenv("REGISTRATION_CSRF_COOKIE_SAMESITE", "Lax"),
        max_age=int(os.getenv("REGISTRATION_CSRF_COOKIE_MAX_AGE", "900")),
        path="/",
    )

    return response
