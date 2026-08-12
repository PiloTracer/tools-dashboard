"""Repository for client-app role assignments (app_user_roles).

One shared write path for both scopes (R14): ``appsuper`` rows carry an
``app_id``; ``appglobal`` rows have ``app_id NULL``. Uniqueness is enforced by
the partial unique indexes from migration 014.
"""

from __future__ import annotations

import uuid
from typing import Any


class AppUserRoleRepository:
    """Repository for managing client-app role assignments."""

    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def user_exists(self, user_id: int) -> bool:
        """Check whether a registered user exists."""
        async with self.pool.acquire() as conn:
            return bool(
                await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)",
                    user_id,
                )
            )

    async def grant(
        self,
        app_id: str | None,
        user_id: int,
        role: str,
        granted_by: int | None,
    ) -> tuple[dict[str, Any], bool]:
        """Grant a role, idempotently.

        Args:
            app_id: Application UUID, or None for all-apps (appglobal) rows
            user_id: User ID receiving the role
            role: Client-app role string
            granted_by: Platform admin user ID performing the grant

        Returns:
            Tuple of (assignment row, created) — ``created`` is False when the
            assignment already existed (duplicate grant is a no-op).
        """
        app_uuid = uuid.UUID(app_id) if app_id else None
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO app_user_roles (app_id, user_id, role, granted_by)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT DO NOTHING
                RETURNING id, app_id, user_id, role, granted_by, created_at
                """,
                app_uuid, user_id, role, granted_by,
            )
            if row is not None:
                return dict(row), True
            row = await conn.fetchrow(
                """
                SELECT id, app_id, user_id, role, granted_by, created_at
                FROM app_user_roles
                WHERE user_id = $1 AND role = $2 AND app_id IS NOT DISTINCT FROM $3
                """,
                user_id, role, app_uuid,
            )
            return (dict(row) if row else {}), False

    async def revoke(self, app_id: str | None, user_id: int, role: str) -> bool:
        """Revoke a role, idempotently.

        Returns:
            True when a row was actually deleted, False when the assignment
            did not exist (double revoke is a silent no-op).
        """
        app_uuid = uuid.UUID(app_id) if app_id else None
        async with self.pool.acquire() as conn:
            result = await conn.execute(
                """
                DELETE FROM app_user_roles
                WHERE user_id = $1 AND role = $2 AND app_id IS NOT DISTINCT FROM $3
                """,
                user_id, role, app_uuid,
            )
            return result == "DELETE 1"

    async def list_effective_for_app(self, app_id: str) -> list[dict[str, Any]]:
        """List effective role holders for an app.

        Returns per-app (appsuper) assignees plus all all-apps (appglobal)
        holders; each row carries its ``role`` so callers can mark scope.
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT r.id, r.app_id, r.user_id, r.role, r.granted_by, r.created_at,
                       u.email
                FROM app_user_roles r
                JOIN users u ON u.id = r.user_id
                WHERE r.app_id = $1 OR r.app_id IS NULL
                ORDER BY r.created_at DESC
                """,
                uuid.UUID(app_id),
            )
            return [dict(row) for row in rows]

    async def list_for_user(self, user_id: int) -> list[dict[str, Any]]:
        """List all role assignments of a user (both roles, with app names)."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT r.id, r.app_id, r.user_id, r.role, r.granted_by, r.created_at,
                       c.client_id AS app_client_id, c.client_name AS app_name
                FROM app_user_roles r
                LEFT JOIN oauth_clients c ON c.id = r.app_id
                WHERE r.user_id = $1
                ORDER BY r.created_at DESC
                """,
                user_id,
            )
            return [dict(row) for row in rows]
