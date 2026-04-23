"""Default admin user seeding."""

from __future__ import annotations

import logging
import os

import bcrypt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .database import users

logger = logging.getLogger(__name__)


async def create_default_admin(session: AsyncSession) -> None:
    """Create default admin user if it doesn't exist.

    This function should be called during application startup to ensure
    there is always at least one admin user available to access the system.

    The admin credentials are read from environment variables:
    - DEFAULT_ADMIN_EMAIL: Admin email address (default: admin@example.com)
    - DEFAULT_ADMIN_PASSWORD: Admin password (default: Admin123!ChangeMe)

    Security Notes:
    - Password is hashed using bcrypt with default cost factor (12+)
    - Admin is created with role='admin' and permissions=['*'] (all permissions)
    - Email is marked as verified (is_email_verified=True)
    - A warning is logged to change the default password
    """
    admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.com")
    admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin123!ChangeMe")

    logger.info("Checking for default admin user...")

    result = await session.execute(
        select(users).where(users.c.email == admin_email)
    )
    row = result.mappings().first()

    if row:
        if row["role"] == "admin":
            logger.info("Admin user already exists: %s", admin_email)
            return
        promote = os.getenv("SEED_ADMIN_PROMOTE_TO_ADMIN", "0").strip().lower() in (
            "1",
            "true",
            "yes",
        )
        if promote:
            await session.execute(
                update(users)
                .where(users.c.email == admin_email)
                .values(role="admin", permissions=["*"], is_email_verified=True)
            )
            await session.commit()
            logger.warning(
                "Promoted %s to admin (SEED_ADMIN_PROMOTE_TO_ADMIN). Rotate password in production.",
                admin_email,
            )
            return
        logger.warning(
            "User %s exists with role %r; default admin seed skipped. "
            "Use matching credentials, set SEED_ADMIN_PROMOTE_TO_ADMIN=1 in dev, or change DEFAULT_ADMIN_EMAIL.",
            admin_email,
            row["role"],
        )
        return

    # Hash password using bcrypt
    password_hash = bcrypt.hashpw(admin_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    # Create admin user
    await session.execute(
        users.insert().values(
            email=admin_email,
            password_hash=password_hash,
            role="admin",
            permissions=["*"],  # All permissions
            is_email_verified=True,  # Admin is pre-verified
        )
    )
    await session.commit()

    logger.info(f"✅ Default admin user created: {admin_email}")
    logger.warning(
        f"⚠️  SECURITY WARNING: Default admin user created with email '{admin_email}'. "
        "Please change the password immediately after first login!"
    )
