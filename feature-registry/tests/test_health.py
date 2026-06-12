"""Health endpoint tests for feature-registry."""

import httpx
import pytest


@pytest.mark.asyncio
async def test_health_returns_ok() -> None:
    """GET /health should return 200 with status=ok."""
    async with httpx.AsyncClient() as client:
        resp = await client.get("http://feature-registry:8003/health", timeout=10.0)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok"
