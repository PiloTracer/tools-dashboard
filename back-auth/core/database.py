"""Database utilities for back-auth."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import AsyncIterator

from sqlalchemy import (
    Boolean,
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
    insert,
    select,
    update,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from .config import get_settings

metadata = MetaData()

users = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("email", String(320), nullable=False, unique=True),
    Column("password_hash", String(255), nullable=True),
    Column("is_email_verified", Boolean, nullable=False, server_default="false"),
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

_engine: AsyncEngine | None = None
SessionFactory: async_sessionmaker[AsyncSession] | None = None


async def init_engine() -> AsyncEngine:
    global _engine, SessionFactory
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(settings.database_url, future=True)
        async with _engine.begin() as conn:
            await conn.run_sync(metadata.create_all)
        SessionFactory = async_sessionmaker(_engine, expire_on_commit=False)
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
