"""Google OAuth routes."""

from fastapi import APIRouter

router = APIRouter(prefix="/auth/google", tags=["google-auth"])


@router.get("/start", summary="Start Google OAuth flow")
async def start_google_oauth() -> dict[str, str]:
    return {"authorize_url": "https://accounts.google.com/o/oauth2/v2/auth"}
