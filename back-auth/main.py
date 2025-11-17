"""Authentication service entry point."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

from fastapi import FastAPI

from core.cassandra import init_cassandra, shutdown_cassandra
from core.database import close_engine, get_session, init_engine
from core.seed_admin import create_default_admin
from core.seed_subscriptions import seed_subscription_packages


def _load_user_registration_router():
    """Load the user-registration feature package despite the hyphenated directory name."""
    feature_dir = Path(__file__).resolve().parent / "features" / "user-registration" / "__init__.py"
    module_name = "features.user_registration"

    spec = importlib.util.spec_from_file_location(module_name, feature_dir)
    if spec is None or spec.loader is None:
        raise ImportError("Unable to load user-registration feature module")

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module.router


def _load_email_auth_router():
    """Load the email-auth feature package despite the hyphenated directory name."""
    feature_dir = Path(__file__).resolve().parent / "features" / "email-auth" / "__init__.py"
    module_name = "features.email_auth"

    spec = importlib.util.spec_from_file_location(module_name, feature_dir)
    if spec is None or spec.loader is None:
        raise ImportError("Unable to load email-auth feature module")

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module.router


def _load_user_management_router():
    """Load the user-management feature package despite the hyphenated directory name."""
    feature_dir = Path(__file__).resolve().parent / "features" / "user-management" / "__init__.py"
    module_name = "features.user_management"

    spec = importlib.util.spec_from_file_location(module_name, feature_dir)
    if spec is None or spec.loader is None:
        raise ImportError("Unable to load user-management feature module")

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module.router


def _load_auto_auth_router():
    """Load the auto-auth feature package despite the hyphenated directory name."""
    feature_dir = Path(__file__).resolve().parent / "features" / "auto-auth" / "__init__.py"
    module_name = "features.auto_auth"

    spec = importlib.util.spec_from_file_location(module_name, feature_dir)
    if spec is None or spec.loader is None:
        raise ImportError("Unable to load auto-auth feature module")

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module.router


user_registration_router = _load_user_registration_router()
email_auth_router = _load_email_auth_router()
user_management_router = _load_user_management_router()
auto_auth_router = _load_auto_auth_router()

app = FastAPI(title="Tools Dashboard Auth", version="0.1.0")


@app.on_event("startup")
async def startup() -> None:
    await init_engine()
    init_cassandra()

    # Create default admin user if it doesn't exist
    async for session in get_session():
        await create_default_admin(session)
        break

    # Seed subscription packages (Free tier)
    async for session in get_session():
        await seed_subscription_packages(session)
        break


@app.on_event("shutdown")
async def shutdown() -> None:
    await close_engine()
    shutdown_cassandra()


@app.get("/health", tags=["system"], summary="Service health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(user_registration_router)
app.include_router(email_auth_router)
app.include_router(user_management_router)
app.include_router(auto_auth_router)
