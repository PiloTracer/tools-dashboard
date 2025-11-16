"""Repository for app-library entities."""

from typing import Any
from datetime import datetime
import uuid
import bcrypt


class AppRepository:
    """Repository for managing applications (OAuth clients)."""

    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def find_all_active(self, include_deleted: bool = False) -> list[dict[str, Any]]:
        """Retrieve all active applications.

        Args:
            include_deleted: Include soft-deleted apps

        Returns:
            List of active applications
        """
        deleted_clause = "" if include_deleted else "AND deleted_at IS NULL"

        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                f"""
                SELECT id, client_id, client_name, description, logo_url,
                       dev_url, prod_url, redirect_uris, allowed_scopes,
                       is_active, created_at, updated_at, deleted_at, created_by
                FROM oauth_clients
                WHERE 1=1 {deleted_clause}
                ORDER BY client_name ASC
                """
            )
            return [dict(row) for row in rows]

    async def find_by_id(self, app_id: str) -> dict[str, Any] | None:
        """Retrieve an application by ID.

        Args:
            app_id: Application UUID

        Returns:
            Application data or None
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, client_id, client_name, description, logo_url,
                       dev_url, prod_url, redirect_uris, allowed_scopes,
                       is_active, created_at, updated_at, deleted_at, created_by
                FROM oauth_clients
                WHERE id = $1
                """,
                uuid.UUID(app_id)
            )
            return dict(row) if row else None

    async def find_by_client_id(self, client_id: str) -> dict[str, Any] | None:
        """Retrieve an application by client_id.

        Args:
            client_id: OAuth client ID

        Returns:
            Application data or None
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, client_id, client_name, description, logo_url,
                       dev_url, prod_url, redirect_uris, allowed_scopes,
                       is_active, created_at, updated_at, deleted_at, created_by
                FROM oauth_clients
                WHERE client_id = $1
                """,
                client_id
            )
            return dict(row) if row else None

    async def create(
        self,
        client_id: str,
        client_secret: str,
        client_name: str,
        description: str | None,
        logo_url: str | None,
        dev_url: str | None,
        prod_url: str | None,
        redirect_uris: list[str],
        allowed_scopes: list[str],
        is_active: bool,
        created_by: int | None,
    ) -> dict[str, Any]:
        """Create a new application.

        Args:
            client_id: Unique OAuth client ID
            client_secret: Plain text client secret (will be hashed)
            client_name: Application name
            description: Application description
            logo_url: Logo URL
            dev_url: Development URL
            prod_url: Production URL
            redirect_uris: List of allowed redirect URIs
            allowed_scopes: List of allowed scopes
            is_active: Whether app is active
            created_by: User ID who created the app

        Returns:
            Created application data (without secret)
        """
        # Hash the client secret with bcrypt
        secret_hash = bcrypt.hashpw(client_secret.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')

        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO oauth_clients
                    (client_id, client_secret_hash, client_name, description, logo_url,
                     dev_url, prod_url, redirect_uris, allowed_scopes, is_active, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id, client_id, client_name, description, logo_url,
                          dev_url, prod_url, redirect_uris, allowed_scopes,
                          is_active, created_at, updated_at, deleted_at, created_by
                """,
                client_id, secret_hash, client_name, description, logo_url,
                dev_url, prod_url, redirect_uris, allowed_scopes, is_active, created_by
            )
            return dict(row) if row else {}

    async def update(
        self,
        app_id: str,
        client_name: str | None = None,
        description: str | None = None,
        logo_url: str | None = None,
        dev_url: str | None = None,
        prod_url: str | None = None,
        redirect_uris: list[str] | None = None,
        allowed_scopes: list[str] | None = None,
        is_active: bool | None = None,
    ) -> dict[str, Any] | None:
        """Update an application.

        Args:
            app_id: Application UUID
            client_name: New client name (optional)
            description: New description (optional)
            logo_url: New logo URL (optional)
            dev_url: New dev URL (optional)
            prod_url: New prod URL (optional)
            redirect_uris: New redirect URIs (optional)
            allowed_scopes: New allowed scopes (optional)
            is_active: New active status (optional)

        Returns:
            Updated application data or None
        """
        # Build dynamic UPDATE statement
        updates = []
        params = [uuid.UUID(app_id)]
        param_idx = 2

        if client_name is not None:
            updates.append(f"client_name = ${param_idx}")
            params.append(client_name)
            param_idx += 1

        if description is not None:
            updates.append(f"description = ${param_idx}")
            params.append(description)
            param_idx += 1

        if logo_url is not None:
            updates.append(f"logo_url = ${param_idx}")
            params.append(logo_url)
            param_idx += 1

        if dev_url is not None:
            updates.append(f"dev_url = ${param_idx}")
            params.append(dev_url)
            param_idx += 1

        if prod_url is not None:
            updates.append(f"prod_url = ${param_idx}")
            params.append(prod_url)
            param_idx += 1

        if redirect_uris is not None:
            updates.append(f"redirect_uris = ${param_idx}")
            params.append(redirect_uris)
            param_idx += 1

        if allowed_scopes is not None:
            updates.append(f"allowed_scopes = ${param_idx}")
            params.append(allowed_scopes)
            param_idx += 1

        if is_active is not None:
            updates.append(f"is_active = ${param_idx}")
            params.append(is_active)
            param_idx += 1

        if not updates:
            # No updates provided
            return await self.find_by_id(app_id)

        updates.append(f"updated_at = NOW()")
        update_clause = ", ".join(updates)

        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                UPDATE oauth_clients
                SET {update_clause}
                WHERE id = $1
                RETURNING id, client_id, client_name, description, logo_url,
                          dev_url, prod_url, redirect_uris, allowed_scopes,
                          is_active, created_at, updated_at, deleted_at, created_by
                """,
                *params
            )
            return dict(row) if row else None

    async def delete(self, app_id: str) -> dict[str, Any] | None:
        """Soft delete an application.

        Args:
            app_id: Application UUID

        Returns:
            Deleted application data or None
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE oauth_clients
                SET deleted_at = NOW(),
                    is_active = false,
                    updated_at = NOW()
                WHERE id = $1 AND deleted_at IS NULL
                RETURNING id, client_id, client_name, description, logo_url,
                          dev_url, prod_url, redirect_uris, allowed_scopes,
                          is_active, created_at, updated_at, deleted_at, created_by
                """,
                uuid.UUID(app_id)
            )
            return dict(row) if row else None

    async def regenerate_secret(self, app_id: str, new_secret: str) -> bool:
        """Regenerate client secret for an application.

        Args:
            app_id: Application UUID
            new_secret: New plain text secret (will be hashed)

        Returns:
            True if successful, False otherwise
        """
        secret_hash = bcrypt.hashpw(new_secret.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')

        async with self.pool.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE oauth_clients
                SET client_secret_hash = $1,
                    updated_at = NOW()
                WHERE id = $2
                """,
                secret_hash, uuid.UUID(app_id)
            )
            return result == "UPDATE 1"


class AccessRuleRepository:
    """Repository for managing access control rules."""

    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def find_by_app_id(self, app_id: str) -> dict[str, Any] | None:
        """Retrieve access rule for an application.

        Args:
            app_id: Application UUID

        Returns:
            Access rule data or None
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, app_id, mode, user_ids, subscription_tiers,
                       created_at, updated_at, created_by
                FROM app_access_rules
                WHERE app_id = $1
                """,
                uuid.UUID(app_id)
            )
            return dict(row) if row else None

    async def create_or_update(
        self,
        app_id: str,
        mode: str,
        user_ids: list[int] | None = None,
        subscription_tiers: list[str] | None = None,
        created_by: int | None = None,
    ) -> dict[str, Any]:
        """Create or update access rule for an application.

        Args:
            app_id: Application UUID
            mode: Access mode (all_users, all_except, only_specified, subscription_based)
            user_ids: List of user IDs for all_except or only_specified modes
            subscription_tiers: List of subscription tiers for subscription_based mode
            created_by: User ID who created/updated the rule

        Returns:
            Created/updated access rule data
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO app_access_rules (app_id, mode, user_ids, subscription_tiers, created_by)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (app_id) DO UPDATE
                SET mode = EXCLUDED.mode,
                    user_ids = EXCLUDED.user_ids,
                    subscription_tiers = EXCLUDED.subscription_tiers,
                    updated_at = NOW()
                RETURNING id, app_id, mode, user_ids, subscription_tiers,
                          created_at, updated_at, created_by
                """,
                uuid.UUID(app_id), mode, user_ids or [], subscription_tiers or [], created_by
            )
            return dict(row) if row else {}

    async def delete(self, app_id: str) -> bool:
        """Delete access rule for an application.

        Args:
            app_id: Application UUID

        Returns:
            True if deleted, False otherwise
        """
        async with self.pool.acquire() as conn:
            result = await conn.execute(
                """
                DELETE FROM app_access_rules
                WHERE app_id = $1
                """,
                uuid.UUID(app_id)
            )
            return result == "DELETE 1"


class UserPreferenceRepository:
    """Repository for managing user app preferences."""

    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def find_by_user(self, user_id: int) -> list[dict[str, Any]]:
        """Retrieve all app preferences for a user.

        Args:
            user_id: User ID

        Returns:
            List of user preferences
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, user_id, app_client_id, is_favorite,
                       last_launched_at, launch_count, created_at, updated_at
                FROM user_app_preferences
                WHERE user_id = $1
                ORDER BY last_launched_at DESC NULLS LAST
                """,
                user_id
            )
            return [dict(row) for row in rows]

    async def find_favorites(self, user_id: int) -> list[dict[str, Any]]:
        """Retrieve user's favorite apps.

        Args:
            user_id: User ID

        Returns:
            List of favorite app preferences
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, user_id, app_client_id, is_favorite,
                       last_launched_at, launch_count, created_at, updated_at
                FROM user_app_preferences
                WHERE user_id = $1 AND is_favorite = true
                ORDER BY last_launched_at DESC NULLS LAST
                """,
                user_id
            )
            return [dict(row) for row in rows]

    async def find_recent(self, user_id: int, limit: int = 5) -> list[dict[str, Any]]:
        """Retrieve user's recently used apps.

        Args:
            user_id: User ID
            limit: Maximum number of recent apps to return

        Returns:
            List of recently used app preferences
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, user_id, app_client_id, is_favorite,
                       last_launched_at, launch_count, created_at, updated_at
                FROM user_app_preferences
                WHERE user_id = $1 AND last_launched_at IS NOT NULL
                ORDER BY last_launched_at DESC
                LIMIT $2
                """,
                user_id, limit
            )
            return [dict(row) for row in rows]

    async def toggle_favorite(self, user_id: int, app_client_id: str) -> dict[str, Any]:
        """Toggle favorite status for an app.

        Args:
            user_id: User ID
            app_client_id: Application client ID

        Returns:
            Updated preference data
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO user_app_preferences (user_id, app_client_id, is_favorite)
                VALUES ($1, $2, true)
                ON CONFLICT (user_id, app_client_id) DO UPDATE
                SET is_favorite = NOT user_app_preferences.is_favorite,
                    updated_at = NOW()
                RETURNING id, user_id, app_client_id, is_favorite,
                          last_launched_at, launch_count, created_at, updated_at
                """,
                user_id, app_client_id
            )
            return dict(row) if row else {}

    async def record_launch(self, user_id: int, app_client_id: str) -> dict[str, Any]:
        """Record an app launch.

        Args:
            user_id: User ID
            app_client_id: Application client ID

        Returns:
            Updated preference data
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO user_app_preferences (user_id, app_client_id, last_launched_at, launch_count)
                VALUES ($1, $2, NOW(), 1)
                ON CONFLICT (user_id, app_client_id) DO UPDATE
                SET last_launched_at = NOW(),
                    launch_count = user_app_preferences.launch_count + 1,
                    updated_at = NOW()
                RETURNING id, user_id, app_client_id, is_favorite,
                          last_launched_at, launch_count, created_at, updated_at
                """,
                user_id, app_client_id
            )
            return dict(row) if row else {}


class AuditLogRepository:
    """Repository for managing audit logs."""

    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def create(
        self,
        app_id: str | None,
        event_type: str,
        performed_by: int | None,
        changes: dict[str, Any] | None = None,
        snapshot: dict[str, Any] | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        """Create an audit log entry.

        Args:
            app_id: Application UUID (optional)
            event_type: Type of event
            performed_by: User ID who performed the action
            changes: Changes made (JSON)
            snapshot: Snapshot of data (JSON)
            ip_address: IP address
            user_agent: User agent string

        Returns:
            Created audit log entry
        """
        app_uuid = uuid.UUID(app_id) if app_id else None

        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO app_audit_log
                    (app_id, event_type, performed_by, changes, snapshot, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, app_id, event_type, performed_by, changes, snapshot,
                          created_at, ip_address, user_agent
                """,
                app_uuid, event_type, performed_by, changes, snapshot, ip_address, user_agent
            )
            return dict(row) if row else {}

    async def find_by_app(self, app_id: str, limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
        """Retrieve audit logs for an application.

        Args:
            app_id: Application UUID
            limit: Maximum number of logs to return
            offset: Offset for pagination

        Returns:
            List of audit log entries
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, app_id, event_type, performed_by, changes, snapshot,
                       created_at, ip_address, user_agent
                FROM app_audit_log
                WHERE app_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                """,
                uuid.UUID(app_id), limit, offset
            )
            return [dict(row) for row in rows]

    async def count_by_app(self, app_id: str) -> int:
        """Count audit logs for an application.

        Args:
            app_id: Application UUID

        Returns:
            Total count of audit logs
        """
        async with self.pool.acquire() as conn:
            count = await conn.fetchval(
                """
                SELECT COUNT(*)
                FROM app_audit_log
                WHERE app_id = $1
                """,
                uuid.UUID(app_id)
            )
            return count or 0
