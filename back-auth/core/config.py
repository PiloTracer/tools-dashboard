"""Configuration utilities for the authentication service."""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", env_file=".env", env_file_encoding="utf-8")

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

    public_app_base_url: str = "http://epicdev.com/app"
    verification_path: str = "/features/user-registration/verify"

    # Google OAuth
    google_oauth_client_id: str | None = None
    google_oauth_client_secret: str | None = None
    google_oauth_redirect_uri: str | None = None
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
    cassandra_keyspace: str = "auth_events"

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
        return [scope.strip() for scope in self.google_oauth_scopes.split() if scope.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
