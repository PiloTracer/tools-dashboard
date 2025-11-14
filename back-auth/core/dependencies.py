"""FastAPI dependencies for authentication and authorization."""

from __future__ import annotations

from fastapi import Depends, HTTPException, Header, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_session, users
from services.token_service import decode_token
from jose import JWTError, ExpiredSignatureError


async def get_current_user(
    authorization: str = Header(None),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get current authenticated user from JWT token.

    Args:
        authorization: Authorization header with Bearer token
        session: Database session

    Returns:
        User dict with id, email, role, permissions

    Raises:
        HTTPException 401: If token is missing, invalid, or expired
        HTTPException 404: If user not found
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.replace("Bearer ", "")

    try:
        payload = decode_token(token)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user_id from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # Fetch user from database
    result = await session.execute(
        select(users).where(users.c.id == int(user_id))
    )
    user = result.mappings().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "permissions": user["permissions"],
    }


async def require_admin(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Require current user to have admin role.

    Args:
        current_user: Current authenticated user

    Returns:
        User dict if user is admin

    Raises:
        HTTPException 403: If user is not admin
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    return current_user


async def require_permission(
    permission: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Require current user to have specific permission.

    Args:
        permission: Required permission (e.g., 'users.write')
        current_user: Current authenticated user

    Returns:
        User dict if user has permission

    Raises:
        HTTPException 403: If user lacks required permission
    """
    user_permissions = current_user.get("permissions", [])

    # Check for wildcard permission or specific permission
    if "*" not in user_permissions and permission not in user_permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission '{permission}' required",
        )

    return current_user
