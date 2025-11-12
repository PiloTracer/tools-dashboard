"""Entry point for the Tools Dashboard core API service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import feature routers
from features.user_subscription.api import router as user_subscription_router

app = FastAPI(title="Tools Dashboard API", version="0.1.0")

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


@app.get("/health", tags=["system"], summary="Service health")
async def health() -> dict[str, str]:
    """Return a lightweight status response for uptime monitoring."""
    return {"status": "ok"}
