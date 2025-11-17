"""Subscription package seeding for default Free tier."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def seed_subscription_packages(session: AsyncSession) -> None:
    """Ensure default subscription packages exist in the database.

    This function creates the Free subscription package if it doesn't exist.
    The Free package is essential for the authentication flow as all users
    must be subscribed to at least the Free tier.

    Package Details:
    - slug: 'free'
    - name: 'Free'
    - price: $0.00 (monthly and yearly)
    - rate_limit_per_hour: 100 requests
    - rate_limit_per_day: 1000 requests
    """
    logger.info("Seeding subscription packages...")

    # Check if subscription_packages table exists
    result = await session.execute(
        text(
            "SELECT EXISTS ("
            "  SELECT FROM information_schema.tables "
            "  WHERE table_schema = 'public' "
            "  AND table_name = 'subscription_packages'"
            ")"
        )
    )
    table_exists = result.scalar()

    if not table_exists:
        logger.warning("subscription_packages table does not exist yet. Skipping seed.")
        return

    # Check if Free package already exists
    result = await session.execute(
        text("SELECT id FROM subscription_packages WHERE slug = 'free'")
    )
    existing_free = result.first()

    if existing_free:
        logger.info("Free subscription package already exists")
        return

    # Create Free subscription package
    await session.execute(
        text(
            """
            INSERT INTO subscription_packages
                (slug, name, description, price_monthly, price_yearly,
                 currency, rate_limit_per_hour, rate_limit_per_day,
                 is_active, display_order)
            VALUES
                (:slug, :name, :description, :price_monthly, :price_yearly,
                 :currency, :rate_limit_per_hour, :rate_limit_per_day,
                 :is_active, :display_order)
            """
        ),
        {
            "slug": "free",
            "name": "Free",
            "description": "Free tier with basic features and rate limits. Perfect for getting started.",
            "price_monthly": Decimal("0.00"),
            "price_yearly": Decimal("0.00"),
            "currency": "USD",
            "rate_limit_per_hour": 100,
            "rate_limit_per_day": 1000,
            "is_active": True,
            "display_order": 0,
        }
    )
    await session.commit()

    logger.info("✅ Free subscription package created successfully")


async def ensure_user_has_subscription(session: AsyncSession, user_id: int) -> bool:
    """Ensure a user has an active subscription, creating Free tier if needed.

    Args:
        session: Active database session
        user_id: User ID to check/create subscription for

    Returns:
        True if user now has subscription (existing or newly created)
        False if subscription creation failed
    """
    # Check if user already has an active subscription
    result = await session.execute(
        text(
            "SELECT id FROM user_subscriptions "
            "WHERE user_id = :user_id AND status = 'active'"
        ),
        {"user_id": user_id}
    )
    existing_subscription = result.first()

    if existing_subscription:
        logger.debug(f"User {user_id} already has active subscription")
        return True

    # Get Free package
    result = await session.execute(
        text("SELECT id FROM subscription_packages WHERE slug = 'free'")
    )
    free_package = result.first()

    if not free_package:
        logger.error("Free subscription package not found! Cannot create subscription.")
        return False

    package_id = free_package[0]

    # Cancel any existing subscriptions (safety check)
    await session.execute(
        text(
            "UPDATE user_subscriptions "
            "SET status = 'cancelled', cancelled_at = NOW() "
            "WHERE user_id = :user_id AND status = 'active'"
        ),
        {"user_id": user_id}
    )

    # Create Free subscription (no end date - perpetual free)
    current_period_end = datetime.now(timezone.utc) + timedelta(days=365 * 100)  # 100 years

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
    await session.commit()

    logger.info(f"✅ Created Free subscription for user {user_id}")
    return True
