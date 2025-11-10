"""Two-factor authentication routes."""

from fastapi import APIRouter

router = APIRouter(prefix="/auth/two-factor", tags=["two-factor"])


@router.post("/challenge", summary="Issue TOTP challenge")
async def challenge() -> dict[str, str]:
    return {"status": "challenge-sent"}
