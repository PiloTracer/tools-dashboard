"""Tests for client-app roles (app_roles) in the OAuth token channel.

Covers SPEC .work/features/app-roles/20260811-SPEC.md §11 (back-auth cases):
issue-tokens claim, validate-token field with immediate revoke visibility,
no cross-app leakage, and fail-closed behaviour when the table is absent.
"""

from __future__ import annotations

import importlib
import logging
from typing import Any

import httpx
import jwt
import pytest
from fastapi import FastAPI

db = importlib.import_module("core.database")
api = importlib.import_module("features.auto-auth.api")
domain_mod = importlib.import_module("features.auto-auth.domain")

APP_A = "11111111-1111-1111-1111-111111111111"
APP_B = "22222222-2222-2222-2222-222222222222"


class FakeResult:
    def __init__(self, rows: list[tuple]) -> None:
        self._rows = rows

    def all(self) -> list[tuple]:
        return self._rows


class FakeSession:
    """Emulates the app_user_roles join over in-memory rows.

    rows: (app_id | None, user_id, role); clients: client_id -> app_id.
    """

    def __init__(
        self,
        rows: list[tuple[str | None, int, str]] | None = None,
        clients: dict[str, str] | None = None,
        error: Exception | None = None,
    ) -> None:
        self.rows = rows or []
        self.clients = clients or {}
        self.error = error

    async def execute(self, stmt: Any, params: dict[str, Any] | None = None) -> FakeResult:
        if self.error:
            raise self.error
        assert params is not None
        app_id = self.clients.get(params["client_id"])
        if app_id is None:  # unknown aud: no roles, no existence oracle (SPEC §8)
            return FakeResult([])
        return FakeResult(
            [
                (role,)
                for (row_app, row_user, role) in self.rows
                if row_user == params["user_id"]
                and (row_app is None or row_app == app_id)
            ]
        )


class FakeInfra:
    """In-memory OAuthInfrastructure (RSA keys + token store)."""

    def __init__(self) -> None:
        self.key: dict[str, Any] | None = None
        self.tokens: list[dict[str, Any]] = []

    async def get_active_rsa_key(self) -> dict[str, Any] | None:
        return self.key

    async def store_rsa_key(
        self,
        key_id: str,
        public_key: str,
        private_key: str,
        algorithm: str = "RS256",
    ) -> None:
        self.key = {
            "key_id": key_id,
            "public_key": public_key,
            "private_key": private_key,
            "algorithm": algorithm,
        }

    async def store_token(self, **kwargs: Any) -> None:
        self.tokens.append(kwargs)

    async def get_public_key_by_id(self, key_id: str) -> str | None:
        return self.key["public_key"] if self.key else None

    async def is_token_revoked(self, token_hash: str) -> bool:
        return False


class FakeValidateDomain:
    """Domain stub that validates any token to a fixed payload."""

    def __init__(self, payload: dict[str, Any]) -> None:
        self.payload = payload

    async def validate_access_token(self, token: str) -> dict[str, Any]:
        return self.payload


def _make_app(domain: Any, session: FakeSession) -> FastAPI:
    app = FastAPI()
    app.include_router(api.router)
    app.dependency_overrides[api.get_oauth_domain] = lambda: domain

    async def _session():
        yield session

    app.dependency_overrides[db.get_session] = _session
    return app


def _client(domain: Any, session: FakeSession) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=_make_app(domain, session)),
        base_url="http://test",
    )


def _decode(token: str, infra: FakeInfra) -> dict[str, Any]:
    return jwt.decode(
        token,
        infra.key["public_key"],
        algorithms=["RS256"],
        options={"verify_aud": False},
    )


async def _issue(client: httpx.AsyncClient, user_id: int, client_id: str) -> dict[str, Any]:
    resp = await client.post(
        "/internal/oauth/issue-tokens",
        json={
            "user_id": user_id,
            "client_id": client_id,
            "scope": ["profile"],
            "user_email": "user7@example.com",
            "user_name": "user7",
        },
    )
    assert resp.status_code == 200
    return resp.json()


@pytest.mark.asyncio
async def test_issue_tokens_embeds_app_roles_claim() -> None:
    """issue-tokens embeds held roles verbatim for the token's client only (R10/R12/R15)."""
    infra = FakeInfra()
    domain = domain_mod.OAuthDomain(infra)
    session = FakeSession(
        rows=[
            (APP_A, 7, "appsuper"),
            (None, 7, "appglobal"),
            (APP_B, 7, "appsuper"),  # other app: must not leak into client_a tokens
        ],
        clients={"client_a": APP_A, "client_b": APP_B},
    )

    # Both rows -> both roles, verbatim
    body = await _issue(_client(domain, session), 7, "client_a")
    assert sorted(_decode(body["access_token"], infra)["app_roles"]) == [
        "appglobal",
        "appsuper",
    ]

    # appsuper grant on that client only
    session.rows = [(APP_A, 7, "appsuper"), (APP_B, 7, "appsuper")]
    body = await _issue(_client(domain, session), 7, "client_a")
    assert _decode(body["access_token"], infra)["app_roles"] == ["appsuper"]

    # appglobal applies on any client, with no implied appsuper (R12)
    session.rows = [(None, 7, "appglobal")]
    body = await _issue(_client(domain, session), 7, "client_b")
    assert _decode(body["access_token"], infra)["app_roles"] == ["appglobal"]


@pytest.mark.asyncio
async def test_validate_token_returns_roles_and_reflects_revoke_immediately() -> None:
    """validate-token reports effective assignments and reflects revoke without re-issue (R9)."""
    domain = FakeValidateDomain({"sub": "7", "aud": "client_a", "scope": "profile email"})
    session = FakeSession(
        rows=[(APP_A, 7, "appsuper"), (None, 7, "appglobal")],
        clients={"client_a": APP_A},
    )
    client = _client(domain, session)

    resp = await client.post("/internal/oauth/validate-token", json={"token": "t"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["valid"] is True
    assert sorted(body["app_roles"]) == ["appglobal", "appsuper"]

    # Revoke appsuper: next call reflects it with no token re-issue
    session.rows = [(None, 7, "appglobal")]
    body = (await client.post("/internal/oauth/validate-token", json={"token": "t"})).json()
    assert body["app_roles"] == ["appglobal"]

    # Revoke appglobal too: empty
    session.rows = []
    body = (await client.post("/internal/oauth/validate-token", json={"token": "t"})).json()
    assert body["valid"] is True
    assert body["app_roles"] == []


@pytest.mark.asyncio
async def test_no_cross_app_leakage_and_unknown_aud() -> None:
    """Roles for other apps never leak; unknown aud yields [] (R11, SPEC §8)."""
    domain = FakeValidateDomain({"sub": "7", "aud": "client_a", "scope": "profile"})
    session = FakeSession(
        rows=[(APP_B, 7, "appsuper")],
        clients={"client_a": APP_A, "client_b": APP_B},
    )
    client = _client(domain, session)

    body = (await client.post("/internal/oauth/validate-token", json={"token": "t"})).json()
    assert body["app_roles"] == []

    domain.payload["aud"] = "client_b"
    body = (await client.post("/internal/oauth/validate-token", json={"token": "t"})).json()
    assert body["app_roles"] == ["appsuper"]

    domain.payload["aud"] = "unknown_client"
    body = (await client.post("/internal/oauth/validate-token", json={"token": "t"})).json()
    assert body["valid"] is True
    assert body["app_roles"] == []


@pytest.mark.asyncio
async def test_missing_table_fails_closed(caplog: pytest.LogCaptureFixture) -> None:
    """Absent app_user_roles table -> app_roles [] + warning, never an exception (R20)."""
    session = FakeSession(error=Exception("undefined_table: app_user_roles"))

    domain = FakeValidateDomain({"sub": "7", "aud": "client_a", "scope": "profile"})
    client = _client(domain, session)
    with caplog.at_level(logging.WARNING, logger="core.database"):
        resp = await client.post("/internal/oauth/validate-token", json={"token": "t"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["valid"] is True
    assert body["app_roles"] == []
    assert any("app_user_roles" in r.message for r in caplog.records)

    # issue-tokens also stays up and emits an empty claim
    infra = FakeInfra()
    issuing_domain = domain_mod.OAuthDomain(infra)
    caplog.clear()
    with caplog.at_level(logging.WARNING, logger="core.database"):
        body = await _issue(_client(issuing_domain, session), 7, "client_a")
    assert _decode(body["access_token"], infra)["app_roles"] == []
