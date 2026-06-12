"""Smoke tests — verify every HTTP service is alive from the host.

Uses ``localhost`` + mapped ports so these run directly on the host
without needing Docker service-name resolution.
"""

import os

import httpx
import pytest

# Host-mapped ports from docker-compose.dev.yml
API_PORT = os.environ.get("TEST_API_PORT", "8100")
AUTH_PORT = os.environ.get("TEST_AUTH_PORT", "8101")
NGINX_PORT = os.environ.get("TEST_NGINX_PORT", "8082")


@pytest.mark.asyncio
async def test_back_api_health() -> None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://localhost:{API_PORT}/health", timeout=10.0)
    assert resp.status_code == 200
    assert resp.json().get("status") == "ok"


@pytest.mark.asyncio
async def test_back_auth_health() -> None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://localhost:{AUTH_PORT}/health", timeout=10.0)
    assert resp.status_code == 200
    assert resp.json().get("status") == "ok"


@pytest.mark.asyncio
async def test_nginx_reachable() -> None:
    """Nginx proxies to Remix — just assert it responds (any status)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://localhost:{NGINX_PORT}", timeout=10.0)
    # Nginx returns 301 → /app/ or 200 depending on config
    assert resp.status_code in (200, 301, 302, 404, 502)


@pytest.mark.asyncio
async def test_public_api_requires_auth() -> None:
    """Public app library returns 401/403 without a session cookie."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"http://localhost:{API_PORT}/api/app-library/oauth-clients",
            timeout=10.0,
        )
    assert resp.status_code in (401, 403)
