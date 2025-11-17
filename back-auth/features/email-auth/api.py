"""Email authentication routes."""

from __future__ import annotations

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_session, users
from services.subscription import ensure_user_subscription
from services.token_service import create_access_token, create_refresh_token

router = APIRouter(prefix="/email", tags=["email-auth"])


class LoginRequest(BaseModel):
    """Email login request body."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User information in login response."""

    id: int
    email: str
    role: str
    permissions: list[str]


class LoginResponse(BaseModel):
    """Email login response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/login", summary="Email login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> LoginResponse:
    """Authenticate user with email and password.

    Args:
        request: Login credentials (email and password)
        session: Database session

    Returns:
        LoginResponse containing access token, refresh token, and user info

    Raises:
        HTTPException 401: If credentials are invalid
        HTTPException 403: If email is not verified
    """
    # Find user by email
    result = await session.execute(
        select(users).where(users.c.email == request.email)
    )
    user = result.mappings().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Verify password
    if not user["password_hash"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    password_matches = bcrypt.checkpw(
        request.password.encode("utf-8"),
        user["password_hash"].encode("utf-8"),
    )

    if not password_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check if email is verified
    if not user["is_email_verified"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email before logging in.",
        )

    # Ensure user has a subscription (auto-create Free tier if needed)
    # Note: session is already managed by FastAPI dependency injection
    await ensure_user_subscription(session, user["id"])

    # Generate tokens
    access_token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        role=user["role"],
        permissions=user["permissions"],
    )

    refresh_token = create_refresh_token(user_id=user["id"])

    # Return response
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            role=user["role"],
            permissions=user["permissions"],
        ),
    )
