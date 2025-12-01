"""Feature registry entry point."""

from fastapi import FastAPI

app = FastAPI(title="Feature Registry", version="0.1.0")


@app.get("/health", tags=["system"], summary="Service health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
