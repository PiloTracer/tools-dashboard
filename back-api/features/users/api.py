"""
Users API - OAuth Resource Server Endpoints
Provides user information to authorized OAuth clients.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Header
from pydantic import BaseModel

from database import db_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


# ============================================================================
# Response Models
# ============================================================================

class SubscriptionInfo(BaseModel):
    """Subscription information."""
    tier: str
    status: str
    cardsPerMonth: int
    currentUsage: int
    llmCredits: int
    resetDate: str


class UserInfoResponse(BaseModel):
    """User information response."""
    id: str
    username: str
    email: str
    display_name: str
    subscription: SubscriptionInfo | None = None
    createdAt: str
    updatedAt: str


# ============================================================================
# API Endpoints
# ============================================================================

@router.get(
    "/me",
    response_model=UserInfoResponse,
    summary="Get current user information",
    description="Get user information from validated OAuth access token",
)
async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> UserInfoResponse:
    """Get current user information from OAuth access token.

    This endpoint validates the Bearer token and returns user information.
    External OAuth clients use this endpoint to get authenticated user details.

    Args:
        authorization: Authorization header with Bearer token

    Returns:
        User information (id, username, email)

    Raises:
        HTTPException 401: If token is missing or invalid
        HTTPException 404: If user not found
    """
    # Validate Authorization header
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract Bearer token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]

    # Validate token by calling back-auth's internal OAuth endpoint
    import httpx

    AUTH_SVC = "http://back-auth:8001"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{AUTH_SVC}/internal/oauth/validate-token",
                json={"token": token},
                timeout=10.0,
            )
    except httpx.RequestError as exc:
        logger.error("Token validation call failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    validation_result = response.json()

    if not validation_result.get("valid"):
        logger.warning("Token rejected by back-auth: %s", validation_result.get("error", "unknown"))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=validation_result.get("error", "Invalid or expired access token"),
            headers={"WWW-Authenticate": "Bearer"},
        )

    # The validate-token endpoint already returns the resolved user_id —
    # no need to manually decode the JWT payload.
    user_id = validation_result.get("user_id")

    if not user_id:
        logger.warning("validate-token response missing user_id")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload — missing user ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from PostgreSQL
    query = """
    SELECT id, email, created_at, updated_at
    FROM users
    WHERE id = $1
    """

    try:
        user_row = await db_manager.pg_pool.fetchrow(query, int(user_id))
    except Exception as e:
        logger.error("DB error fetching user %s", user_id, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error",
        )

    if not user_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Fetch subscription data (loose coupling - optional)
    subscription_data = None
    try:
        sub_query = """
        SELECT tier, status, renewed_at
        FROM subscriptions
        WHERE user_id = $1 AND status = 'active'
        ORDER BY renewed_at DESC NULLS LAST
        LIMIT 1
        """

        sub_row = await db_manager.pg_pool.fetchrow(sub_query, user_id)

        if sub_row:
            from datetime import datetime, timedelta
            # Calculate reset date (30 days from renewed_at or now)
            reset_date = sub_row["renewed_at"] or datetime.utcnow()
            reset_date = (reset_date + timedelta(days=30)).isoformat() + "Z"

            # Map tier to usage limits
            tier_limits = {
                "free": {"cards": 100, "credits": 50},
                "standard": {"cards": 500, "credits": 200},
                "premium": {"cards": 2000, "credits": 1000},
                "enterprise": {"cards": 10000, "credits": 5000},
            }
            limits = tier_limits.get(sub_row["tier"], tier_limits["free"])

            subscription_data = SubscriptionInfo(
                tier=sub_row["tier"] or "free",
                status=sub_row["status"] or "active",
                cardsPerMonth=limits["cards"],
                currentUsage=0,  # TODO: Track actual usage
                llmCredits=limits["credits"],
                resetDate=reset_date,
            )
        else:
            # Default free subscription if none exists
            from datetime import datetime, timedelta
            reset_date = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"
            subscription_data = SubscriptionInfo(
                tier="free",
                status="active",
                cardsPerMonth=100,
                currentUsage=0,
                llmCredits=50,
                resetDate=reset_date,
            )
    except Exception as e:
        # Log error but don't fail the request (loose coupling)
        logger.warning("Could not fetch subscription data for user %s: %s", user_id, e)
        # Provide default subscription
        from datetime import datetime, timedelta
        reset_date = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"
        subscription_data = SubscriptionInfo(
            tier="free",
            status="active",
            cardsPerMonth=100,
            currentUsage=0,
            llmCredits=50,
            resetDate=reset_date,
        )

    # Return complete user information
    return UserInfoResponse(
        id=str(user_row["id"]),
        username=user_row["email"].split("@")[0],  # Use email prefix as username
        email=user_row["email"],
        display_name=user_row["email"].split("@")[0],  # Use email prefix as display name
        subscription=subscription_data,
        createdAt=user_row["created_at"].isoformat() + "Z",
        updatedAt=user_row["updated_at"].isoformat() + "Z",
    )
