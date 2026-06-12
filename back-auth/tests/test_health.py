"""Health endpoint tests for back-auth."""

import httpx
import pytest


@pytest.mark.asyncio
async def test_health_returns_ok(async_client: httpx.AsyncClient) -> None:
    """GET /health should return 200 with status=ok."""
    resp = await async_client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok"
