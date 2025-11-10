"""Entry point for the Tools Dashboard core API service."""

from fastapi import FastAPI

app = FastAPI(title="Tools Dashboard API", version="0.1.0")


@app.get("/health", tags=["system"], summary="Service health")
async def health() -> dict[str, str]:
    """Return a lightweight status response for uptime monitoring."""
    return {"status": "ok"}
