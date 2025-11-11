"""Authentication service entry point."""

from fastapi import FastAPI

from core.cassandra import init_cassandra, shutdown_cassandra
from core.database import close_engine, init_engine
from features.user_registration import router as user_registration_router

app = FastAPI(title="Tools Dashboard Auth", version="0.1.0")


@app.on_event("startup")
async def startup() -> None:
    await init_engine()
    init_cassandra()


@app.on_event("shutdown")
async def shutdown() -> None:
    await close_engine()
    shutdown_cassandra()


@app.get("/health", tags=["system"], summary="Service health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(user_registration_router)
