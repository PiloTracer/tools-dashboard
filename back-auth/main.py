"""Authentication service entry point."""

from fastapi import FastAPI

from features.user_registration import router as user_registration_router

app = FastAPI(title="Tools Dashboard Auth", version="0.1.0")


@app.get("/health", tags=["system"], summary="Service health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(user_registration_router)
