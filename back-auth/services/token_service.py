"""JWT token generation and validation service."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from jose import jwt


def get_jwt_config() -> dict[str, str]:
    """Get JWT configuration from environment variables."""
    return {
        "secret_key": os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production"),
        "algorithm": os.getenv("JWT_ALGORITHM", "HS256"),
    }


def create_access_token(
    user_id: int,
    email: str,
    role: str,
    permissions: list[str],
    expires_delta: timedelta | None = None,
) -> str:
    """Create a JWT access token.

    Args:
        user_id: User's unique identifier
        email: User's email address
        role: User's role (admin, customer, etc.)
        permissions: List of user permissions
        expires_delta: Token expiration time (default: 15 minutes)

    Returns:
        Encoded JWT token string
    """
    config = get_jwt_config()

    if expires_delta is None:
        expires_delta = timedelta(minutes=15)

    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "permissions": permissions,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }

    encoded_jwt = jwt.encode(to_encode, config["secret_key"], algorithm=config["algorithm"])
    return encoded_jwt


def create_refresh_token(
    user_id: int,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a JWT refresh token.

    Args:
        user_id: User's unique identifier
        expires_delta: Token expiration time (default: 7 days)

    Returns:
        Encoded JWT token string
    """
    config = get_jwt_config()

    if expires_delta is None:
        expires_delta = timedelta(days=7)

    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }

    encoded_jwt = jwt.encode(to_encode, config["secret_key"], algorithm=config["algorithm"])
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token.

    Args:
        token: JWT token string

    Returns:
        Decoded token payload

    Raises:
        jose.JWTError: If token is invalid or expired
    """
    config = get_jwt_config()
    payload = jwt.decode(token, config["secret_key"], algorithms=[config["algorithm"]])
    return payload
