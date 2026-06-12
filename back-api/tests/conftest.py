"""Test fixtures for back-api.

Uses httpx ``ASGITransport`` to talk to the FastAPI app directly,
with mocked database and auth service dependencies so tests run
without a running Docker stack.

NOTE: feature directories use hyphens (e.g. ``features/app-library/``)
so modules MUST be loaded via ``importlib.import_module()`` — the same
pattern ``main.py`` uses.
"""

from __future__ import annotations

import importlib
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from fastapi import FastAPI


@pytest.fixture
def app() -> FastAPI:
    """Return a FastAPI app wired with mock dependencies."""

    @asynccontextmanager
    async def noop_lifespan(_app: FastAPI):
        yield

    app = FastAPI(lifespan=noop_lifespan)

    # Import routers via importlib (matches main.py pattern for hyphenated dirs)
    user_sub = importlib.import_module("features.user-subscription.api")
    user_status = importlib.import_module("features.user-status.api")
    user_mgmt = importlib.import_module("features.user-management.api")
    auto_auth = importlib.import_module("features.auto-auth.api")
    app_lib = importlib.import_module("features.app-library.api")
    users = importlib.import_module("features.users.api")

    app.include_router(user_sub.router)
    app.include_router(user_status.router)
    app.include_router(user_mgmt.router)
    app.include_router(auto_auth.router)
    app.include_router(app_lib.public_router)
    app.include_router(app_lib.admin_router)
    app.include_router(app_lib.integrations_router)
    app.include_router(users.router)

    # Inject mock repositories into app state
    app.state.user_repo = AsyncMock()
    app.state.user_ext_repo = MagicMock()
    app.state.audit_repo = MagicMock()
    app.state.app_repo = AsyncMock()
    app.state.access_rule_repo = AsyncMock()
    app.state.user_pref_repo = AsyncMock()
    app.state.audit_log_repo = MagicMock()
    app.state.storage_key_repo = AsyncMock()

    return app


@pytest.fixture
async def async_client(app: FastAPI) -> httpx.AsyncClient:
    """Async ASGI test client."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test"
    ) as client:
        yield client
