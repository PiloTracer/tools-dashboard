"""Repository for user entities."""

from __future__ import annotations

from datetime import datetime
from typing import Any
import math


class UserRepository:
    """Repository for user account operations.

    This repository handles user account data stored in PostgreSQL,
    including RBAC (role-based access control) operations and admin user management.
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
                SELECT id, email, role, permissions, is_email_verified, status,
                       created_at, updated_at
                FROM users
                WHERE id = $1
                """,
                user_id,
            )
            return dict(row) if row else None

    # ========== ADMIN USER MANAGEMENT METHODS ==========

    async def list_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        role: str | None = None,
        status: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> dict[str, Any]:
        """List users with pagination, search, and filters.

        Args:
            page: Page number (1-indexed)
            page_size: Number of items per page (max 100)
            search: Search query (searches email)
            role: Filter by role
            status: Filter by status (Note: status field needs to be added to schema)
            sort_by: Field to sort by (email, created_at)
            sort_order: Sort order (asc, desc)

        Returns:
            Dict with users list, total count, page info
        """
        # Validate and sanitize inputs
        page = max(1, page)
        page_size = min(100, max(1, page_size))
        sort_order = "DESC" if sort_order.lower() == "desc" else "ASC"

        # Validate sort_by to prevent SQL injection
        allowed_sort_fields = ["email", "created_at", "updated_at", "role"]
        if sort_by not in allowed_sort_fields:
            sort_by = "created_at"

        # Build WHERE clause
        where_clauses = []
        params = []
        param_index = 1

        if search:
            where_clauses.append(f"email ILIKE ${param_index}")
            params.append(f"%{search}%")
            param_index += 1

        if role:
            where_clauses.append(f"role = ${param_index}")
            params.append(role)
            param_index += 1

        # Note: status field doesn't exist in current schema
        # This is a placeholder for future enhancement
        # if status:
        #     where_clauses.append(f"status = ${param_index}")
        #     params.append(status)
        #     param_index += 1

        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        async with self.pool.acquire() as conn:
            # Get total count
            count_query = f"SELECT COUNT(*) FROM users {where_sql}"
            total = await conn.fetchval(count_query, *params)

            # Calculate pagination
            offset = (page - 1) * page_size
            total_pages = math.ceil(total / page_size) if total > 0 else 0

            # Get users
            query = f"""
                SELECT id, email, role, permissions, is_email_verified, status,
                       created_at, updated_at
                FROM users
                {where_sql}
                ORDER BY {sort_by} {sort_order}
                LIMIT ${param_index} OFFSET ${param_index + 1}
            """
            params.extend([page_size, offset])

            rows = await conn.fetch(query, *params)
            users = [dict(row) for row in rows]

            return {
                "users": users,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
            }

    async def search_users(self, search_query: str, limit: int = 50) -> list[dict[str, Any]]:
        """Search users by email.

        Args:
            search_query: Search string
            limit: Maximum results to return

        Returns:
            List of matching users
        """
        limit = min(100, max(1, limit))

        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, email, role, permissions, is_email_verified, status,
                       created_at, updated_at
                FROM users
                WHERE email ILIKE $1
                ORDER BY email ASC
                LIMIT $2
                """,
                f"%{search_query}%",
                limit,
            )
            return [dict(row) for row in rows]

    async def get_user_by_id(self, user_id: int) -> dict[str, Any] | None:
        """Get user by ID.

        Args:
            user_id: User's unique identifier

        Returns:
            User dict or None if not found
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, email, role, permissions, is_email_verified, status,
                       created_at, updated_at
                FROM users
                WHERE id = $1
                """,
                user_id,
            )
            return dict(row) if row else None

    async def update_user(
        self,
        user_id: int,
        email: str | None = None,
    ) -> dict[str, Any] | None:
        """Update user information.

        Args:
            user_id: User's unique identifier
            email: New email address (if provided)

        Returns:
            Updated user dict or None if not found
        """
        async with self.pool.acquire() as conn:
            # Build dynamic update
            updates = []
            params = []
            param_index = 1

            if email is not None:
                updates.append(f"email = ${param_index}")
                params.append(email)
                param_index += 1

            if not updates:
                # No updates, just return current user
                return await self.get_user_by_id(user_id)

            # Always update updated_at
            updates.append(f"updated_at = ${param_index}")
            params.append(datetime.utcnow())
            param_index += 1

            # Add user_id as final param
            params.append(user_id)

            query = f"""
                UPDATE users
                SET {', '.join(updates)}
                WHERE id = ${param_index}
                RETURNING id, email, role, permissions, is_email_verified, status,
                          created_at, updated_at
            """

            row = await conn.fetchrow(query, *params)
            return dict(row) if row else None

    async def update_user_status(
        self,
        user_id: int,
        status: str,
    ) -> dict[str, Any] | None:
        """Update user status.

        Args:
            user_id: User's unique identifier
            status: New status (active, inactive, suspended)

        Returns:
            Updated user dict or None if not found
        """
        # Validate status
        valid_statuses = ["active", "inactive", "suspended"]
        if status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

        query = """
            UPDATE users
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        """

        result = await self.pool.fetchrow(query, status, user_id)

        if not result:
            return None

        return dict(result)

    async def update_user_role(
        self,
        user_id: int,
        role: str,
        permissions: list[str],
    ) -> dict[str, Any] | None:
        """Update user role and permissions.

        Args:
            user_id: User's unique identifier
            role: New role
            permissions: New permissions list

        Returns:
            Updated user dict or None if not found
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE users
                SET role = $1,
                    permissions = $2::jsonb,
                    updated_at = $3
                WHERE id = $4
                RETURNING id, email, role, permissions, is_email_verified, status,
                          created_at, updated_at
                """,
                role,
                permissions,
                datetime.utcnow(),
                user_id,
            )
            return dict(row) if row else None

    async def bulk_update_status(
        self,
        user_ids: list[int],
        status: str,
    ) -> int:
        """Update status for multiple users.

        Note: This is a placeholder. The users table doesn't currently have a status column.

        Args:
            user_ids: List of user IDs to update
            status: New status to apply

        Returns:
            Number of users updated
        """
        # TODO: Add status column to users table schema
        # For now, return 0
        return 0

    async def bulk_update_roles(
        self,
        user_ids: list[int],
        role: str,
        permissions: list[str],
    ) -> int:
        """Update role for multiple users.

        Args:
            user_ids: List of user IDs to update
            role: New role to apply
            permissions: New permissions to apply

        Returns:
            Number of users updated
        """
        if not user_ids:
            return 0

        async with self.pool.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE users
                SET role = $1,
                    permissions = $2::jsonb,
                    updated_at = $3
                WHERE id = ANY($4::int[])
                """,
                role,
                permissions,
                datetime.utcnow(),
                user_ids,
            )
            # Extract row count from result string like "UPDATE 5"
            return int(result.split()[-1]) if result else 0
