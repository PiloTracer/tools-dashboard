"""Shared fixtures for integration smoke tests.

Base URLs default to Docker Compose service names so these tests work
when run **inside** the Docker network (e.g. from a temporary test
container or via ``docker compose exec`` on any service).

Override any URL with environment variables:

    API_URL=http://localhost:8000 pytest tests/
    AUTH_URL=http://localhost:8001 pytest tests/
"""

import os

import pytest


@pytest.fixture(scope="session")
def api_url() -> str:
    return os.environ.get("API_URL", "http://back-api:8000")


@pytest.fixture(scope="session")
def auth_url() -> str:
    return os.environ.get("AUTH_URL", "http://back-auth:8001")


@pytest.fixture(scope="session")
def websockets_url() -> str:
    return os.environ.get("WEBSOCKETS_URL", "http://back-websockets:8010")


@pytest.fixture(scope="session")
def registry_url() -> str:
    return os.environ.get("REGISTRY_URL", "http://feature-registry:8005")


@pytest.fixture(scope="session")
def nginx_url() -> str:
    return os.environ.get("NGINX_URL", "http://nginx-proxy:80")
