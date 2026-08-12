"""Database utilities for back-auth."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import AsyncIterator

import asyncio
import logging

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    delete,
    insert,
    select,
    update,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from .config import get_settings

metadata = MetaData()

logger = logging.getLogger(__name__)

users = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("email", String(320), nullable=False, unique=True),
    Column("password_hash", String(255), nullable=True),
    Column("is_email_verified", Boolean, nullable=False, server_default=text("false")),
    Column("role", String(50), nullable=False, server_default=text("'customer'")),
    Column("permissions", JSONB, nullable=False, server_default=text("'[]'::jsonb")),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

user_identities = Table(
    "user_identities",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("provider", String(50), nullable=False),
    Column("provider_account_id", String(255), nullable=False),
    Column("access_token", Text, nullable=True),
    Column("refresh_token", Text, nullable=True),
    Column("raw_profile", JSONB, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    UniqueConstraint("provider", "provider_account_id", name="uq_provider_account"),
)

email_verification_tokens = Table(
    "email_verification_tokens",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("token", String(255), nullable=False, unique=True),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

sessions = Table(
    "sessions",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("session_token", String(255), nullable=False, unique=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("expires_at", DateTime(timezone=True), nullable=False),
)

Index("ix_email_verification_tokens_token", email_verification_tokens.c.token)
Index("ix_users_role", users.c.role)

# Mirror of migration back-postgres/schema/014_app_user_roles.sql (R18.2):
# startup metadata.create_all self-heals this table when the migration runner
# has not applied it yet. The app_id FK to oauth_clients is applied by the
# migration (oauth_clients is not part of this metadata); both channels
# converge to the same shape.
app_user_roles = Table(
    "app_user_roles",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")),
    Column("app_id", UUID(as_uuid=True), nullable=True),  # NULL = appglobal (all-apps)
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("role", String(50), nullable=False),
    Column("granted_by", Integer, ForeignKey("users.id"), nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=text("NOW()")),
    CheckConstraint("role IN ('appsuper', 'appglobal')", name="valid_app_role"),
    CheckConstraint(
        "(role = 'appsuper' AND app_id IS NOT NULL) OR (role = 'appglobal' AND app_id IS NULL)",
        name="valid_role_scope",
    ),
    Index("idx_app_user_roles_user", "user_id"),
    Index("idx_app_user_roles_app", "app_id"),
)


async def get_app_roles_for_user_client(
    session: AsyncSession,
    user_id: int,
    client_id: str | None,
) -> list[str]:
    """Return the client-app role strings a user holds for one OAuth client.

    A row scoped to the client's app yields ``appsuper``; a row with
    ``app_id IS NULL`` yields ``appglobal`` (applies to every app). Unknown
    ``client_id`` yields no roles (no app-existence oracle). Fail-closed
    (R20): any lookup error (e.g. table not yet created) returns ``[]`` with
    a warning instead of raising.
    """
    if not client_id:
        return []
    try:
        result = await session.execute(
            text(
                """
                SELECT r.role
                FROM app_user_roles r
                JOIN oauth_clients c ON c.client_id = :client_id
                WHERE r.user_id = :user_id
                  AND (r.app_id IS NULL OR r.app_id = c.id)
                """
            ),
            {"user_id": user_id, "client_id": client_id},
        )
        roles: list[str] = []
        for row in result.all():
            role = row[0]
            if role not in roles:
                roles.append(role)
        return roles
    except Exception as exc:  # noqa: BLE001 - fail-closed per SPEC R20: never break auth on lookup errors
        logger.warning(
            "app_user_roles lookup failed; returning no roles (fail-closed): %s",
            type(exc).__name__,
        )
        return []

_engine: AsyncEngine | None = None
SessionFactory: async_sessionmaker[AsyncSession] | None = None


async def init_engine() -> AsyncEngine:
    global _engine, SessionFactory
    if _engine is None:
        settings = get_settings()
        attempt = 0
        delay = 1
        last_error: Exception | None = None
        while attempt < 10:
            try:
                engine = create_async_engine(settings.database_url, future=True)
                async with engine.begin() as conn:
                    await conn.run_sync(metadata.create_all)
                _engine = engine
                SessionFactory = async_sessionmaker(_engine, expire_on_commit=False)
                break
            except Exception as exc:
                last_error = exc
                logger.warning("Database initialization attempt %s failed: %s", attempt + 1, exc)
                attempt += 1
                await asyncio.sleep(delay)
                delay = min(delay * 2, 10)
        if _engine is None:
            assert last_error is not None
            raise last_error
    return _engine


async def get_session() -> AsyncIterator[AsyncSession]:
    if SessionFactory is None:
        await init_engine()
    assert SessionFactory is not None
    async with SessionFactory() as session:
        yield session


async def touch_user_updated_at(session: AsyncSession, user_id: int) -> None:
    await session.execute(
        update(users)
        .where(users.c.id == user_id)
        .values(updated_at=datetime.now(timezone.utc))
    )


async def create_session(session: AsyncSession, user_id: int, token: str, expires_at: datetime) -> None:
    await session.execute(
        insert(sessions).values(user_id=user_id, session_token=token, expires_at=expires_at)
    )


async def delete_session(session: AsyncSession, token: str) -> None:
    await session.execute(delete(sessions).where(sessions.c.session_token == token))


async def find_user_by_session(session: AsyncSession, token: str):
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(users).join(sessions, users.c.id == sessions.c.user_id).where(
            sessions.c.session_token == token,
            sessions.c.expires_at > now,
        )
    )
    return result.mappings().first()


async def close_engine() -> None:
    if _engine:
        await _engine.dispose()


def init_sync() -> None:
    asyncio.run(init_engine())
