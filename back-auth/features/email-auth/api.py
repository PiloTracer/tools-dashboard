"""Email authentication routes."""

from fastapi import APIRouter

router = APIRouter(prefix="/auth/email", tags=["email-auth"])


@router.post("/login", summary="Email login")
async def login() -> dict[str, str]:
    return {"status": "pending"}
