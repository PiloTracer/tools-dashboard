"""Test fixtures for back-auth.

Creates a minimal FastAPI test app with routers but patches out
database and external service dependencies.

NOTE: feature directories use hyphens (e.g. ``features/user-registration/``)
so modules MUST be loaded via ``importlib.import_module()``.
"""

from __future__ import annotations

import importlib
from contextlib import asynccontextmanager

import httpx
import pytest
from fastapi import FastAPI


@pytest.fixture
def app() -> FastAPI:
    """Return a FastAPI app with registered routers and mocked DB."""

    @asynccontextmanager
    async def noop_lifespan(_app: FastAPI):
        yield

    app = FastAPI(lifespan=noop_lifespan)

    # Register auth routers via importlib (handles hyphenated directory names)
    reg = importlib.import_module("features.user-registration.api")
    email = importlib.import_module("features.email-auth.api")

    app.include_router(reg.router)
    app.include_router(email.router)

    return app


@pytest.fixture
async def async_client(app: FastAPI) -> httpx.AsyncClient:
    """Async ASGI test client."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test"
    ) as client:
        yield client
