"""Repository for subscription entities."""

from typing import Any
from datetime import datetime
from decimal import Decimal
import uuid


class SubscriptionPackageRepository:
    """Repository for managing subscription packages."""

    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def find_all_active(self) -> list[dict[str, Any]]:
        """Retrieve all active subscription packages ordered by display_order."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, slug, name, description, price_monthly, price_yearly,
                       currency, rate_limit_per_hour, rate_limit_per_day,
                       is_active, display_order, created_at, updated_at
                FROM subscription_packages
                WHERE is_active = TRUE
                ORDER BY display_order ASC
                """
            )
            return [dict(row) for row in rows]

    async def find_by_slug(self, slug: str) -> dict[str, Any] | None:
        """Retrieve a subscription package by its slug."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, slug, name, description, price_monthly, price_yearly,
                       currency, rate_limit_per_hour, rate_limit_per_day,
                       is_active, display_order, created_at, updated_at
                FROM subscription_packages
                WHERE slug = $1
                """,
                slug
            )
            return dict(row) if row else None

    async def find_by_id(self, package_id: str) -> dict[str, Any] | None:
        """Retrieve a subscription package by its ID."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, slug, name, description, price_monthly, price_yearly,
                       currency, rate_limit_per_hour, rate_limit_per_day,
                       is_active, display_order, created_at, updated_at
                FROM subscription_packages
                WHERE id = $1
                """,
                package_id
            )
            return dict(row) if row else None

    async def upsert_package(
        self,
        slug: str,
        name: str,
        description: str,
        price_monthly: Decimal,
        price_yearly: Decimal,
        currency: str,
        rate_limit_per_hour: int,
        rate_limit_per_day: int,
        display_order: int,
        is_active: bool = True,
    ) -> dict[str, Any]:
        """Insert or update a subscription package."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO subscription_packages
                    (slug, name, description, price_monthly, price_yearly,
                     currency, rate_limit_per_hour, rate_limit_per_day,
                     is_active, display_order)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (slug)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    price_monthly = EXCLUDED.price_monthly,
                    price_yearly = EXCLUDED.price_yearly,
                    currency = EXCLUDED.currency,
                    rate_limit_per_hour = EXCLUDED.rate_limit_per_hour,
                    rate_limit_per_day = EXCLUDED.rate_limit_per_day,
                    is_active = EXCLUDED.is_active,
                    display_order = EXCLUDED.display_order,
                    updated_at = NOW()
                RETURNING id, slug, name, description, price_monthly, price_yearly,
                          currency, rate_limit_per_hour, rate_limit_per_day,
                          is_active, display_order, created_at, updated_at
                """,
                slug, name, description, price_monthly, price_yearly, currency,
                rate_limit_per_hour, rate_limit_per_day, is_active, display_order
            )
            return dict(row)


class UserSubscriptionRepository:
    """Repository for managing user subscriptions."""

    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def find_active_by_user(self, user_id: str) -> dict[str, Any] | None:
        """Retrieve the active subscription for a user."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT us.id, us.user_id, us.package_id, us.package_slug,
                       us.status, us.billing_cycle, us.current_period_start,
                       us.current_period_end, us.cancelled_at, us.created_at,
                       us.updated_at,
                       sp.name as package_name, sp.price_monthly, sp.price_yearly,
                       sp.rate_limit_per_hour, sp.rate_limit_per_day
                FROM user_subscriptions us
                JOIN subscription_packages sp ON us.package_id = sp.id
                WHERE us.user_id = $1 AND us.status = 'active'
                ORDER BY us.created_at DESC
                LIMIT 1
                """,
                user_id
            )
            return dict(row) if row else None

    async def find_all_by_user(self, user_id: str) -> list[dict[str, Any]]:
        """Retrieve all subscriptions for a user (including history)."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT us.id, us.user_id, us.package_id, us.package_slug,
                       us.status, us.billing_cycle, us.current_period_start,
                       us.current_period_end, us.cancelled_at, us.created_at,
                       us.updated_at,
                       sp.name as package_name
                FROM user_subscriptions us
                JOIN subscription_packages sp ON us.package_id = sp.id
                WHERE us.user_id = $1
                ORDER BY us.created_at DESC
                """,
                user_id
            )
            return [dict(row) for row in rows]

    async def create_subscription(
        self,
        user_id: str,
        package_id: str,
        package_slug: str,
        billing_cycle: str,
        current_period_end: datetime,
    ) -> dict[str, Any]:
        """Create a new subscription for a user."""
        async with self.pool.acquire() as conn:
            # First, cancel any existing active subscriptions
            await conn.execute(
                """
                UPDATE user_subscriptions
                SET status = 'cancelled', cancelled_at = NOW()
                WHERE user_id = $1 AND status = 'active'
                """,
                user_id
            )

            # Create new subscription
            row = await conn.fetchrow(
                """
                INSERT INTO user_subscriptions
                    (user_id, package_id, package_slug, status, billing_cycle,
                     current_period_start, current_period_end)
                VALUES ($1, $2, $3, 'active', $4, NOW(), $5)
                RETURNING id, user_id, package_id, package_slug, status,
                          billing_cycle, current_period_start, current_period_end,
                          cancelled_at, created_at, updated_at
                """,
                user_id, package_id, package_slug, billing_cycle, current_period_end
            )
            return dict(row)

    async def cancel_subscription(self, subscription_id: str) -> dict[str, Any] | None:
        """Cancel a subscription."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE user_subscriptions
                SET status = 'cancelled', cancelled_at = NOW()
                WHERE id = $1
                RETURNING id, user_id, package_id, package_slug, status,
                          billing_cycle, current_period_start, current_period_end,
                          cancelled_at, created_at, updated_at
                """,
                subscription_id
            )
            return dict(row) if row else None

    async def update_subscription_status(
        self, subscription_id: str, status: str
    ) -> dict[str, Any] | None:
        """Update the status of a subscription."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE user_subscriptions
                SET status = $2
                WHERE id = $1
                RETURNING id, user_id, package_id, package_slug, status,
                          billing_cycle, current_period_start, current_period_end,
                          cancelled_at, created_at, updated_at
                """,
                subscription_id, status
            )
            return dict(row) if row else None


class SubscriptionHistoryRepository:
    """Repository for subscription history and audit trail."""

    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def create_history_entry(
        self,
        user_id: str,
        subscription_id: str,
        package_id: str,
        action: str,
        previous_status: str | None = None,
        new_status: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Create a history entry for a subscription event."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO subscription_history
                    (user_id, subscription_id, package_id, action,
                     previous_status, new_status, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, user_id, subscription_id, package_id, action,
                          previous_status, new_status, metadata, created_at
                """,
                user_id, subscription_id, package_id, action,
                previous_status, new_status, metadata
            )
            return dict(row)

    async def find_by_user(self, user_id: str, limit: int = 50) -> list[dict[str, Any]]:
        """Retrieve subscription history for a user."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, user_id, subscription_id, package_id, action,
                       previous_status, new_status, metadata, created_at
                FROM subscription_history
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                """,
                user_id, limit
            )
            return [dict(row) for row in rows]


# Legacy repository for backward compatibility
class SubscriptionRepository:
    """Legacy repository - maintained for backward compatibility."""

    def __init__(self, pool: Any) -> None:
        self.pool = pool
        self.user_subscription_repo = UserSubscriptionRepository(pool)

    async def list_active(self, user_id: str) -> list[dict[str, Any]]:
        """Legacy method - returns active subscription as a list."""
        active = await self.user_subscription_repo.find_active_by_user(user_id)
        return [active] if active else []
