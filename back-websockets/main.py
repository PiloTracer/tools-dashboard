"""WebSocket service entry point."""

from fastapi import FastAPI

app = FastAPI(title="Tools Dashboard WebSockets", version="0.1.0")


@app.get("/health", tags=["system"], summary="Service health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
