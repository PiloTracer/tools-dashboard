"""
User Status Feature - API Router
Defines the HTTP endpoints for user status management
"""

from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from .domain import UserStatusService

router = APIRouter(prefix="/user-status", tags=["user-status"])


class NavigationUpdateRequest(BaseModel):
    """Request model for navigation updates."""

    current_location: str
    next_location: Optional[str] = None


def get_service() -> UserStatusService:
    """Dependency that returns the user status service."""
    return UserStatusService()


def get_current_user(request: Request) -> tuple[Optional[str], Optional[str]]:
    """
    Extract current user information from request.

    This is a placeholder - in production, this would validate JWT tokens,
    check session cookies, etc.

    Returns:
        Tuple of (user_id, email) or (None, None) if not authenticated
    """
    # TODO: Implement actual authentication check
    # For now, return None to indicate anonymous user
    # This will be replaced with actual session/token validation
    return None, None


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
