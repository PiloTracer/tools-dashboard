"""
User Status Feature - API Router
Defines the HTTP endpoints for user status management
"""

import os
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from .domain import UserStatusService

router = APIRouter(prefix="/user-status", tags=["user-status"])

# Backend auth service URL (aligned with app-library pattern)
_AUTH_SERVICE_URL = os.environ.get(
    "AUTH_SERVICE_URL", "http://back-auth:8001"
).rstrip("/")


class NavigationUpdateRequest(BaseModel):
    """Request model for navigation updates."""

    current_location: str
    next_location: Optional[str] = None


def get_service() -> UserStatusService:
    """Dependency that returns the user status service."""
    return UserStatusService()


async def get_current_user(request: Request) -> tuple[Optional[str], Optional[str]]:
    """
    Resolve the signed-in user from the browser session cookie.

    Forwards the ``Cookie`` header to ``back-auth/user-registration/status`` and
    extracts the user id + email.  Unauthenticated / unverified sessions return
    ``(None, None)`` so callers can produce the appropriate anonymous response.
    """
    cookie = request.headers.get("cookie") or ""
    if not cookie:
        return None, None

    url = f"{_AUTH_SERVICE_URL}/user-registration/status"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"Cookie": cookie}, timeout=10.0)
    except (httpx.RequestError, httpx.TimeoutException):
        return None, None

    if resp.status_code != 200:
        return None, None

    data = resp.json()
    st = data.get("status")
    if st != "verified":
        return None, None

    user_id = data.get("userId")
    email = data.get("email") or ""
    if user_id is None:
        return None, None

    return str(user_id), email


@router.get("/", summary="Get user status")
async def get_user_status(
    user_info: tuple[Optional[str], Optional[str]] = Depends(get_current_user),
    service: UserStatusService = Depends(get_service),
) -> dict:
    """
    Get current user authentication status and metadata.

    Returns user information including:
    - Authentication state
    - User metadata (if authenticated)
    - Navigation state
    - Timestamp
    """
    user_id, email = user_info
    status = await service.get_user_status(user_id, email)
    return status.to_dict()


@router.post("/navigation", summary="Update navigation state")
async def update_navigation(
    request: NavigationUpdateRequest,
    user_info: tuple[Optional[str], Optional[str]] = Depends(get_current_user),
    service: UserStatusService = Depends(get_service),
) -> dict:
    """
    Update user navigation state.

    Used to track current location and intended destination
    for post-login redirects.
    """
    user_id, email = user_info

    if not user_id:
        return {"success": False, "error": "Not authenticated"}

    navigation = await service.update_navigation(
        user_id=user_id,
        current_location=request.current_location,
        next_location=request.next_location,
    )

    return {
        "success": True,
        "navigation": {
            "currentLocation": navigation.current_location,
            "nextLocation": navigation.next_location,
            "previousLocation": navigation.previous_location,
        },
    }


@router.delete("/navigation", summary="Clear navigation state")
async def clear_navigation(
    user_info: tuple[Optional[str], Optional[str]] = Depends(get_current_user),
    service: UserStatusService = Depends(get_service),
) -> dict:
    """Clear user navigation state after successful redirect."""
    user_id, email = user_info

    if not user_id:
        return {"success": False, "error": "Not authenticated"}

    await service.clear_navigation(user_id)
    return {"success": True}


@router.get("/health", summary="Health check")
async def health_check() -> dict[str, str]:
    """Report that the feature-specific router is reachable."""
    return {"status": "ok"}
