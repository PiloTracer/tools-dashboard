"""Repository for user entities."""

from __future__ import annotations

from datetime import datetime
from typing import Any


class UserRepository:
    """Repository for user account operations.

    This repository handles user account data stored in PostgreSQL,
    including RBAC (role-based access control) operations.
    """

    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def find_by_email(self, email: str) -> dict[str, Any] | None:
        """Find user by email address.

        Args:
            email: User's email address

        Returns:
            User dict with basic fields, or None if not found
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, email, created_at, updated_at
                FROM users
                WHERE email = $1
                """,
                email,
            )
            return dict(row) if row else None

    async def find_by_email_with_auth(self, email: str) -> dict[str, Any] | None:
        """Find user by email with authentication fields.

        Args:
            email: User's email address

        Returns:
            User dict including password_hash, role, permissions, and verification status,
            or None if not found
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, email, password_hash, role, permissions,
                       is_email_verified, created_at, updated_at
                FROM users
                WHERE email = $1
                """,
                email,
            )
            return dict(row) if row else None

    async def create_user(
        self,
        email: str,
        password_hash: str,
        role: str = "customer",
        permissions: list[str] | None = None,
    ) -> dict[str, Any]:
        """Create a new user account.

        Args:
            email: User's email address
            password_hash: Bcrypt hashed password
            role: User role (default: 'customer')
            permissions: List of permissions (default: [])

        Returns:
            Created user dict with id, email, role, permissions

        Raises:
            Exception: If user with email already exists
        """
        if permissions is None:
            permissions = []

        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO users (email, password_hash, role, permissions, is_email_verified)
                VALUES ($1, $2, $3, $4::jsonb, false)
                RETURNING id, email, role, permissions, created_at, updated_at
                """,
                email,
                password_hash,
                role,
                permissions,
            )
            return dict(row)

    async def update_role(
        self,
        user_id: int,
        role: str,
        permissions: list[str],
    ) -> None:
        """Update user's role and permissions.

        Args:
            user_id: User's unique identifier
            role: New role to assign
            permissions: New permissions list

        Raises:
            Exception: If user not found
        """
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE users
                SET role = $1,
                    permissions = $2::jsonb,
                    updated_at = $3
                WHERE id = $4
                """,
                role,
                permissions,
                datetime.utcnow(),
                user_id,
            )

    async def get_user_with_role(self, user_id: int) -> dict[str, Any] | None:
        """Get user with role and permissions.

        Args:
            user_id: User's unique identifier

        Returns:
            User dict including role and permissions, or None if not found
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, email, role, permissions, is_email_verified,
                       created_at, updated_at
                FROM users
                WHERE id = $1
                """,
                user_id,
            )
            return dict(row) if row else None
