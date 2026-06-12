"""Smoke tests — verify every HTTP service is alive and responding.

Each test makes a single ``GET /health`` (or equivalent) call and asserts
a 200 status.  These are meant to be fast (seconds) and are the first thing
to run when verifying the stack.
"""

import httpx
import pytest


@pytest.mark.asyncio
async def test_back_api_health(api_url: str) -> None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{api_url}/health", timeout=10.0)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok"


@pytest.mark.asyncio
async def test_back_auth_health(auth_url: str) -> None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{auth_url}/health", timeout=10.0)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok"


@pytest.mark.asyncio
async def test_back_websockets_health(websockets_url: str) -> None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{websockets_url}/health", timeout=10.0)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok"


@pytest.mark.asyncio
async def test_feature_registry_health(registry_url: str) -> None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{registry_url}/health", timeout=10.0)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok"


@pytest.mark.asyncio
async def test_nginx_reachable(nginx_url: str) -> None:
    """Nginx doesn't have a /health endpoint — just assert it responds."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(nginx_url, timeout=10.0)
    # Nginx returns 301 (redirect to /app/) or 200 depending on config
    assert resp.status_code in (200, 301, 302)


@pytest.mark.asyncio
async def test_back_api_public_app_library_unauthorized(api_url: str) -> None:
    """Public app library endpoints return 401 when no session cookie is sent."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{api_url}/api/app-library/oauth-clients", timeout=10.0
        )
    assert resp.status_code in (401, 403)
