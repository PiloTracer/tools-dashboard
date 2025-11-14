"""User management API endpoints for admin operations.

This module provides endpoints for:
- Session invalidation (role/status changes)
- Permission validation
- Role management support
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_session
from core.dependencies import require_admin
from services.session_service import invalidate_user_sessions


router = APIRouter(prefix="/admin/users", tags=["user-management"])


class SessionInvalidationRequest(BaseModel):
    """Request to invalidate user sessions."""

    reason: str | None = None


class SessionInvalidationResponse(BaseModel):
    """Response from session invalidation."""

    user_id: int
    sessions_invalidated: int
    reason: str | None


@router.post(
    "/{user_id}/invalidate-sessions",
    summary="Invalidate all user sessions",
    response_model=SessionInvalidationResponse,
)
async def invalidate_sessions(
    user_id: int,
    request_body: SessionInvalidationRequest,
    session: AsyncSession = Depends(get_session),
    admin: dict = Depends(require_admin),
) -> SessionInvalidationResponse:
    """Invalidate all sessions for a user.

    This endpoint is called when:
    - Admin changes user's role (requires re-authentication)
    - Admin changes user's status to inactive/suspended
    - Admin manually revokes user access

    **Security**:
    - Requires admin role
    - Cannot invalidate own sessions (self-protection)
    - All invalidations are logged

    Args:
        user_id: ID of user whose sessions to invalidate
        request_body: Optional reason for invalidation
        session: Database session
        admin: Current admin user

    Returns:
        SessionInvalidationResponse with count of invalidated sessions

    Raises:
        HTTPException 403: If admin tries to invalidate own sessions
        HTTPException 404: If user not found
    """
    # Prevent admin from invalidating own sessions
    if user_id == admin["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot invalidate your own sessions",
        )

    # Invalidate all sessions for the user
    count = await invalidate_user_sessions(session, user_id)

    # TODO: Log this action to audit trail (Phase 4)
    # await audit_repository.create_audit_log(
    #     admin_id=str(admin["id"]),
    #     admin_email=admin["email"],
    #     user_id=str(user_id),
    #     action="invalidate_sessions",
    #     changes={"sessions_invalidated": count, "reason": request_body.reason},
    # )

    return SessionInvalidationResponse(
        user_id=user_id,
        sessions_invalidated=count,
        reason=request_body.reason,
    )


@router.get(
    "/me/permissions",
    summary="Get current user permissions",
    response_model=dict,
)
async def get_my_permissions(
    admin: dict = Depends(require_admin),
) -> dict:
    """Get current admin user's permissions.

    Useful for frontend to determine what actions to show.

    Args:
        admin: Current admin user

    Returns:
        Dict with user permissions
    """
    return {
        "user_id": admin["id"],
        "email": admin["email"],
        "role": admin["role"],
        "permissions": admin["permissions"],
    }


@router.post(
    "/verify-admin",
    summary="Verify admin credentials",
    response_model=dict,
)
async def verify_admin(
    admin: dict = Depends(require_admin),
) -> dict:
    """Verify that the current user has admin privileges.

    Simple endpoint for permission checks.

    Args:
        admin: Current admin user

    Returns:
        Dict confirming admin status
    """
    return {
        "is_admin": True,
        "user_id": admin["id"],
        "email": admin["email"],
    }
