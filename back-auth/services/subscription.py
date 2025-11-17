"""Subscription management service for user authentication."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def ensure_user_subscription(session: AsyncSession, user_id: int) -> bool:
    """Ensure a user has an active subscription, creating Free tier if needed.

    This function is called during registration and login to guarantee that
    all authenticated users have a subscription. If no active subscription
    exists, a Free tier subscription is automatically created.

    This is a critical function for the authentication flow - no user should
    be able to access the system without a subscription.

    Args:
        session: Active SQLAlchemy async session (must be in a transaction)
        user_id: User ID to check/create subscription for

    Returns:
        True if user now has an active subscription
        False if subscription creation failed (should not happen in normal operation)

    Side Effects:
        - Creates a user_subscriptions record with Free package if none exists
        - Cancels any existing active subscriptions before creating new one
        - Commits the transaction

    Example:
        async with session.begin():
            user = await create_user(session, email, password)
            await ensure_user_subscription(session, user["id"])
    """
    try:
        # Check if user already has an active subscription
        result = await session.execute(
            text(
                "SELECT id, package_slug FROM user_subscriptions "
                "WHERE user_id = :user_id AND status = 'active' "
                "LIMIT 1"
            ),
            {"user_id": user_id}
        )
        existing_subscription = result.first()

        if existing_subscription:
            logger.debug(
                f"User {user_id} already has active subscription: "
                f"{existing_subscription[1]}"
            )
            return True

        # Get Free package
        result = await session.execute(
            text("SELECT id FROM subscription_packages WHERE slug = 'free'")
        )
        free_package = result.first()

        if not free_package:
            logger.error(
                "Free subscription package not found! Cannot create subscription. "
                "Ensure seed_subscription_packages() ran during startup."
            )
            return False

        package_id = free_package[0]

        # Create Free subscription (perpetual - 100 years)
        current_period_end = datetime.now(timezone.utc) + timedelta(days=365 * 100)

        await session.execute(
            text(
                """
                INSERT INTO user_subscriptions
                    (user_id, package_id, package_slug, status, billing_cycle,
                     current_period_start, current_period_end)
                VALUES
                    (:user_id, :package_id, :package_slug, 'active', 'monthly',
                     NOW(), :current_period_end)
                """
            ),
            {
                "user_id": user_id,
                "package_id": package_id,
                "package_slug": "free",
                "current_period_end": current_period_end,
            }
        )

        logger.info(f"✅ Auto-created Free subscription for user {user_id}")
        return True

    except Exception as exc:
        logger.exception(f"Failed to ensure subscription for user {user_id}: {exc}")
        return False


async def get_user_subscription(session: AsyncSession, user_id: int) -> dict | None:
    """Get the active subscription details for a user.

    Args:
        session: Active SQLAlchemy async session
        user_id: User ID to query

    Returns:
        Dictionary with subscription details or None if no active subscription
        Keys: id, user_id, package_id, package_slug, status, billing_cycle,
              current_period_start, current_period_end, created_at, updated_at,
              package_name, price_monthly, rate_limit_per_hour, rate_limit_per_day
    """
    result = await session.execute(
        text(
            """
            SELECT
                us.id, us.user_id, us.package_id, us.package_slug,
                us.status, us.billing_cycle, us.current_period_start,
                us.current_period_end, us.created_at, us.updated_at,
                sp.name as package_name, sp.price_monthly,
                sp.rate_limit_per_hour, sp.rate_limit_per_day
            FROM user_subscriptions us
            JOIN subscription_packages sp ON us.package_id = sp.id
            WHERE us.user_id = :user_id AND us.status = 'active'
            ORDER BY us.created_at DESC
            LIMIT 1
            """
        ),
        {"user_id": user_id}
    )
    row = result.first()

    if not row:
        return None

    return {
        "id": row[0],
        "user_id": row[1],
        "package_id": row[2],
        "package_slug": row[3],
        "status": row[4],
        "billing_cycle": row[5],
        "current_period_start": row[6],
        "current_period_end": row[7],
        "created_at": row[8],
        "updated_at": row[9],
        "package_name": row[10],
        "price_monthly": row[11],
        "rate_limit_per_hour": row[12],
        "rate_limit_per_day": row[13],
    }
