"""Configuration utilities for the authentication service."""

from __future__ import annotations

import logging
import re
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_GOOGLE_USERINFO_EMAIL = "https://www.googleapis.com/auth/userinfo.email"
_GOOGLE_USERINFO_PROFILE = "https://www.googleapis.com/auth/userinfo.profile"
_DEFAULT_GOOGLE_SCOPES: tuple[str, ...] = ("openid", _GOOGLE_USERINFO_EMAIL, _GOOGLE_USERINFO_PROFILE)


def _tokenize_google_scopes(raw: str) -> list[str]:
    """Split env value on whitespace and commas; strip quotes from each token."""
    tokens: list[str] = []
    for chunk in re.split(r"[\s,]+", raw.strip()):
        t = chunk.strip().strip('"').strip("'")
        if t:
            tokens.append(t)
    return tokens


def _normalize_google_scope_token(token: str) -> str | None:
    """Map env tokens to Google-supported scope strings; reject prose or accidental .env pastes."""
    t = token.strip().strip('"').strip("'")
    if not t:
        return None
    low = t.lower()
    if low == "openid":
        return "openid"
    if low == "email" or t == _GOOGLE_USERINFO_EMAIL:
        return _GOOGLE_USERINFO_EMAIL
    if low == "profile" or t == _GOOGLE_USERINFO_PROFILE:
        return _GOOGLE_USERINFO_PROFILE
    if t.startswith("https://www.googleapis.com/auth/userinfo."):
        if "userinfo.email" in t:
            return _GOOGLE_USERINFO_EMAIL
        if "userinfo.profile" in t:
            return _GOOGLE_USERINFO_PROFILE
    return None


class Settings(BaseSettings):
    # Env comes from the process environment (Docker Compose reads repo-root .env / .env.prd — do not rely on cwd).
    model_config = SettingsConfigDict(extra="ignore", env_file_encoding="utf-8")

    database_url: str = "postgresql+asyncpg://user:pass@postgresql:5432/main_db"
    redis_url: str | None = None

    registration_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 7

    # Email delivery
    mail_host: str | None = None
    mail_port: int = 587
    mail_username: str | None = None
    mail_password: str | None = None
    mail_sender: str | None = None
    mail_use_tls: bool = True

    public_app_base_url: str = "https://dev.aiepic.app/app"
    verification_path: str = "/features/user-registration/verify"

    # Google OAuth
    google_oauth_client_id: str | None = None
    google_oauth_client_secret: str | None = None
    google_oauth_redirect_uri: str | None = None
    # Space- or comma-separated; only openid + Google userinfo scopes are forwarded (see google_scopes_list).
    google_oauth_scopes: str = "openid email profile"
    google_oauth_auth_endpoint: str = "https://accounts.google.com/o/oauth2/v2/auth"
    google_oauth_token_endpoint: str = "https://oauth2.googleapis.com/token"
    google_oauth_userinfo_endpoint: str = "https://openidconnect.googleapis.com/v1/userinfo"
    google_oauth_allowed_domains: str | None = None
    google_oauth_button_text: str = "Continue with Google"

    registration_csrf_cookie_secure: bool = True
    registration_csrf_cookie_samesite: str = "Lax"
    registration_csrf_cookie_max_age: int = 900
    registration_csrf_cookie_domain: str | None = None
    registration_password_min_length: int = 12

    cassandra_contact_points: str | None = None
    cassandra_port: int = 9042
    cassandra_keyspace: str = "tools_dashboard"

    session_cookie_name: str = "td_session"
    session_cookie_secure: bool = True
    session_cookie_samesite: str = "Lax"
    session_cookie_max_age: int = 60 * 60 * 24 * 7
    session_cookie_domain: str | None = None

    def build_verification_url(self, token: str) -> str:
        base = self.public_app_base_url.rstrip("/")
        path = self.verification_path.lstrip("/")
        return f"{base}/{path}?token={token}"

    def google_scopes_list(self) -> list[str]:
        raw = (self.google_oauth_scopes or "").strip()
        if not raw:
            return list(_DEFAULT_GOOGLE_SCOPES)
        tokens = _tokenize_google_scopes(raw)
        seen: set[str] = set()
        ordered: list[str] = []
        dropped = 0
        for tok in tokens:
            norm = _normalize_google_scope_token(tok)
            if norm is None:
                dropped += 1
                continue
            if norm not in seen:
                seen.add(norm)
                ordered.append(norm)
        if not ordered:
            if dropped:
                logger.warning(
                    "GOOGLE_OAUTH_SCOPES had no valid tokens (%d ignored); using default sign-in scopes "
                    "(openid, email, profile or full https://www.googleapis.com/auth/userinfo.* URLs).",
                    dropped,
                )
            return list(_DEFAULT_GOOGLE_SCOPES)
        if dropped:
            logger.warning(
                "Ignored %d invalid GOOGLE_OAUTH_SCOPES token(s); use openid, email, profile, "
                "or full https://www.googleapis.com/auth/userinfo.* URLs (space- or comma-separated).",
                dropped,
            )
        if "openid" not in seen:
            ordered.insert(0, "openid")
            seen.add("openid")
        return ordered


@lru_cache
def get_settings() -> Settings:
    return Settings()
