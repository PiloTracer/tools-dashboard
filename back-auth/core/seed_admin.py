"""Default admin user seeding."""

from __future__ import annotations

import logging
import os

import bcrypt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .database import users

logger = logging.getLogger(__name__)


def _read_admin_credentials() -> tuple[str, str]:
    """Load bootstrap admin email/password from the process environment."""
    email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.com").strip()
    password = (os.getenv("DEFAULT_ADMIN_PASSWORD") or "Admin123!ChangeMe").strip()
    return email, password


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _password_matches(stored_hash: str | None, password: str) -> bool:
    if not stored_hash or not password:
        return False
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            stored_hash.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


async def create_default_admin(session: AsyncSession) -> None:
    """Ensure the bootstrap admin user exists and matches DEFAULT_ADMIN_* env vars.

    Called during back-auth startup. ``DEFAULT_ADMIN_EMAIL`` and
    ``DEFAULT_ADMIN_PASSWORD`` are the source of truth:

    - Missing row → create admin with a bcrypt hash of the env password.
    - Existing admin with a different hash → update hash from env (e.g. after
      ``.env.prd`` change or a fresh Postgres volume from an old image).
    - Existing non-admin with the same email → promote only when
      ``SEED_ADMIN_PROMOTE_TO_ADMIN=1``.
    """
    admin_email, admin_password = _read_admin_credentials()

    if not admin_email:
        logger.error("DEFAULT_ADMIN_EMAIL is empty; cannot seed default admin")
        return

    if not admin_password:
        logger.error("DEFAULT_ADMIN_PASSWORD is empty; cannot seed default admin")
        return

    logger.info("Checking default admin user for %s", admin_email)

    result = await session.execute(
        select(users).where(users.c.email == admin_email)
    )
    row = result.mappings().first()

    if row:
        if row["role"] == "admin":
            if _password_matches(row["password_hash"], admin_password):
                logger.info("Default admin credentials already match env: %s", admin_email)
                return

            password_hash = _hash_password(admin_password)
            await session.execute(
                update(users)
                .where(users.c.email == admin_email)
                .values(
                    password_hash=password_hash,
                    is_email_verified=True,
                )
            )
            await session.commit()
            logger.warning(
                "Default admin password for %s did not match DEFAULT_ADMIN_PASSWORD; "
                "updated hash from env on startup.",
                admin_email,
            )
            return

        promote = os.getenv("SEED_ADMIN_PROMOTE_TO_ADMIN", "0").strip().lower() in (
            "1",
            "true",
            "yes",
        )
        if promote:
            password_hash = _hash_password(admin_password)
            await session.execute(
                update(users)
                .where(users.c.email == admin_email)
                .values(
                    role="admin",
                    permissions=["*"],
                    is_email_verified=True,
                    password_hash=password_hash,
                )
            )
            await session.commit()
            logger.warning(
                "Promoted %s to admin and set password from DEFAULT_ADMIN_PASSWORD "
                "(SEED_ADMIN_PROMOTE_TO_ADMIN). Rotate password after first login.",
                admin_email,
            )
            return

        logger.warning(
            "User %s exists with role %r; default admin seed skipped. "
            "Use matching credentials, set SEED_ADMIN_PROMOTE_TO_ADMIN=1 in dev, "
            "or change DEFAULT_ADMIN_EMAIL.",
            admin_email,
            row["role"],
        )
        return

    password_hash = _hash_password(admin_password)

    await session.execute(
        users.insert().values(
            email=admin_email,
            password_hash=password_hash,
            role="admin",
            permissions=["*"],
            is_email_verified=True,
        )
    )
    await session.commit()

    logger.info("Default admin user created: %s", admin_email)
    logger.warning(
        "Default admin user created for %s from DEFAULT_ADMIN_* env vars. "
        "Change DEFAULT_ADMIN_PASSWORD after first login if this is production.",
        admin_email,
    )
