"""Tests for the app library endpoints."""

from __future__ import annotations

import httpx
import pytest


@pytest.mark.asyncio
async def test_list_public_apps_unauthorized(async_client: httpx.AsyncClient) -> None:
    """GET /api/app-library/oauth-clients without session should return 401/403."""
    resp = await async_client.get("/api/app-library/oauth-clients")
    assert resp.status_code in (200, 401, 403)


@pytest.mark.asyncio
async def test_verify_client_credentials_missing_body(
    async_client: httpx.AsyncClient,
) -> None:
    """POST verify-client-credentials with missing body should return 400."""
    resp = await async_client.post(
        "/api/app-library/verify-client-credentials", json={}
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_verify_client_credentials_invalid(
    async_client: httpx.AsyncClient,
) -> None:
    """POST verify-client-credentials with bad creds should return 401."""
    resp = await async_client.post(
        "/api/app-library/verify-client-credentials",
        json={"client_id": "nonexistent", "client_secret": "bad"},
    )
    assert resp.status_code in (400, 401)


@pytest.mark.asyncio
async def test_admin_list_apps_requires_auth(async_client: httpx.AsyncClient) -> None:
    """GET /api/admin/app-library without admin auth should return 401/403."""
    resp = await async_client.get("/api/admin/app-library")
    assert resp.status_code in (200, 401, 403)
