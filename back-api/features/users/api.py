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

class UserInfoResponse(BaseModel):
    """User information response."""
    id: str
    username: str
    email: str


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

    # Validate token using auto-auth domain
    import importlib
    auto_auth_domain_module = importlib.import_module("features.auto-auth.domain")
    auto_auth_infra_module = importlib.import_module("features.auto-auth.infrastructure")

    OAuthDomain = auto_auth_domain_module.OAuthDomain
    OAuthInfrastructure = auto_auth_infra_module.OAuthInfrastructure

    # Get OAuth domain to validate token
    oauth_infra = OAuthInfrastructure(db_manager.cassandra_session)
    oauth_domain = OAuthDomain(oauth_infra)

    # Validate access token
    payload = await oauth_domain.validate_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user_id from token (it's stored as string in JWT)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload - missing user ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Convert user_id to integer (our users table uses integer IDs)
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload - invalid user ID format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from PostgreSQL
    query = """
    SELECT id, email, full_name
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

    # Return user information
    return UserInfoResponse(
        id=str(user_row["id"]),
        username=user_row["email"].split("@")[0],  # Use email prefix as username
        email=user_row["email"],
    )
