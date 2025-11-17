"""
Users API - OAuth Resource Server Endpoints
Provides user information to authorized OAuth clients.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status, Header, Depends
from pydantic import BaseModel
from typing import Optional
import sys
from pathlib import Path

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from database import db_manager

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

    # Validate token by calling back-auth's internal endpoint
    import httpx

    BACK_AUTH_URL = "http://back-auth:8001"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BACK_AUTH_URL}/internal/oauth/validate-token",
                json={"token": token},
                timeout=10.0,
            )
    except Exception as e:
        print(f"ERROR: Failed to call validate-token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate token: {str(e)}",
        )

    print(f"DEBUG: Validation response status: {response.status_code}")
    print(f"DEBUG: Validation response body: {response.text}")

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    validation_result = response.json()
    print(f"DEBUG: Validation result: {validation_result}")

    if not validation_result.get("valid"):
        print(f"DEBUG: Token not valid. Error: {validation_result.get('error')}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=validation_result.get("error", "Invalid or expired access token"),
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user_id from validation result (it's a UUID string)
    user_id_uuid_str = validation_result.get("user_id")
    print(f"DEBUG: user_id_uuid_str = {user_id_uuid_str}")

    if not user_id_uuid_str:
        print("DEBUG: Missing user_id in validation result")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload - missing user ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user_id from JWT token directly (without library)
    # JWT format: header.payload.signature (base64url encoded)
    import base64
    import json

    try:
        print("DEBUG: Starting JWT decode")
        # Split JWT and get payload (second part)
        parts = token.split('.')
        print(f"DEBUG: JWT parts count: {len(parts)}")

        if len(parts) != 3:
            raise ValueError("Invalid JWT format")

        # Decode payload (add padding if needed)
        payload_b64 = parts[1]
        print(f"DEBUG: Payload base64 length: {len(payload_b64)}")

        # Add padding for base64 decoding
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        print(f"DEBUG: After padding: {len(payload_b64)}")

        # Decode base64 and parse JSON
        payload_json = base64.urlsafe_b64decode(payload_b64)
        print(f"DEBUG: Decoded payload JSON: {payload_json[:100]}")

        payload = json.loads(payload_json)
        print(f"DEBUG: Parsed payload: {payload}")

        # Extract user_id (stored as string in "sub" claim)
        user_id = int(payload["sub"])
        print(f"DEBUG: Extracted user_id: {user_id}")
    except Exception as e:
        print(f"DEBUG: JWT decode failed: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token payload: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from PostgreSQL
    query = """
    SELECT id, email, created_at, updated_at
    FROM users
    WHERE id = $1
    """

    try:
        user_row = await db_manager.pg_pool.fetchrow(query, user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}",
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
        SELECT
            s.package_slug as tier,
            s.status,
            s.created_at as subscription_started,
            s.expires_at as reset_date,
            f.cards_per_month,
            f.current_usage,
            f.llm_credits
        FROM subscriptions s
        LEFT JOIN financial f ON f.user_id = s.user_id
        WHERE s.user_id = $1 AND s.status = 'active'
        ORDER BY s.created_at DESC
        LIMIT 1
        """

        sub_row = await db_manager.pg_pool.fetchrow(sub_query, user_id)

        if sub_row:
            subscription_data = SubscriptionInfo(
                tier=sub_row["tier"] or "free",
                status=sub_row["status"] or "active",
                cardsPerMonth=sub_row["cards_per_month"] or 100,
                currentUsage=sub_row["current_usage"] or 0,
                llmCredits=sub_row["llm_credits"] or 50,
                resetDate=sub_row["reset_date"].isoformat() if sub_row["reset_date"] else "",
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
        print(f"Warning: Could not fetch subscription data for user {user_id}: {e}")
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
