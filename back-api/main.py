"""Entry point for the Tools Dashboard core API service."""

import importlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import db_manager
from repositories import UserRepository, UserExtRepository, AuditRepository


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for database connections."""
    # Startup
    print("🚀 Starting back-api service...")
    await db_manager.connect_postgresql()
    db_manager.connect_cassandra()

    # Initialize repositories and inject into app state
    user_repo = UserRepository(db_manager.pg_pool)
    user_ext_repo = UserExtRepository(db_manager.cassandra_session)
    audit_repo = AuditRepository(db_manager.cassandra_session)

    # Store in app state for dependency injection
    app.state.user_repo = user_repo
    app.state.user_ext_repo = user_ext_repo
    app.state.audit_repo = audit_repo

    print("✅ Repositories initialized and ready")

    yield

    # Shutdown
    print("🛑 Shutting down back-api service...")
    await db_manager.disconnect()


# Import feature routers with hyphenated names using importlib
user_subscription_module = importlib.import_module("features.user-subscription.api")
user_subscription_router = user_subscription_module.router

user_status_module = importlib.import_module("features.user-status.api")
user_status_router = user_status_module.router

user_management_module = importlib.import_module("features.user-management.api")
user_management_router = user_management_module.router

app = FastAPI(title="Tools Dashboard API", version="0.1.0", lifespan=lifespan)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register feature routers
app.include_router(user_subscription_router)
app.include_router(user_status_router)
app.include_router(user_management_router)


@app.get("/health", tags=["system"], summary="Service health")
async def health() -> dict[str, str]:
    """Return a lightweight status response for uptime monitoring."""
    return {"status": "ok"}
