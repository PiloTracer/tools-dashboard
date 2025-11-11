"""Database repository for user registration flows."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Mapping, Optional

from passlib.context import CryptContext
from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import email_verification_tokens, touch_user_updated_at, users, user_identities

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def get_user_by_email(session: AsyncSession, email: str) -> Optional[Mapping[str, Any]]:
    result = await session.execute(select(users).where(users.c.email == email))
    return result.mappings().first()


async def get_user_by_id(session: AsyncSession, user_id: int) -> Optional[Mapping[str, Any]]:
    result = await session.execute(select(users).where(users.c.id == user_id))
    return result.mappings().first()


async def create_user(session: AsyncSession, email: str, password: str | None = None) -> Mapping[str, Any]:
    password_hash = pwd_context.hash(password) if password else None
    result = await session.execute(
        insert(users)
        .values(email=email, password_hash=password_hash)
        .returning(users)
    )
    return result.mappings().one()


async def update_password(session: AsyncSession, user_id: int, password: str) -> None:
    password_hash = pwd_context.hash(password)
    await session.execute(
        update(users)
        .where(users.c.id == user_id)
        .values(password_hash=password_hash)
    )
    await touch_user_updated_at(session, user_id)


async def mark_email_verified(session: AsyncSession, user_id: int) -> None:
    await session.execute(
        update(users)
        .where(users.c.id == user_id)
        .values(is_email_verified=True, updated_at=datetime.now(timezone.utc))
    )
    await session.execute(delete(email_verification_tokens).where(email_verification_tokens.c.user_id == user_id))


async def upsert_identity(
    session: AsyncSession,
    user_id: int,
    provider: str,
    provider_account_id: str,
    access_token: str | None,
    refresh_token: str | None,
    raw_profile: dict[str, Any] | None,
) -> None:
    existing = await session.execute(
        select(user_identities.c.id).where(
            user_identities.c.provider == provider,
            user_identities.c.provider_account_id == provider_account_id,
        )
    )
    row = existing.first()
    if row:
        await session.execute(
            update(user_identities)
            .where(user_identities.c.id == row.id)
            .values(
                user_id=user_id,
                access_token=access_token,
                refresh_token=refresh_token,
                raw_profile=raw_profile,
            )
        )
    else:
        await session.execute(
            insert(user_identities).values(
                user_id=user_id,
                provider=provider,
                provider_account_id=provider_account_id,
                access_token=access_token,
                refresh_token=refresh_token,
                raw_profile=raw_profile,
            )
        )


async def create_verification_token(session: AsyncSession, user_id: int, token: str, expires_at: datetime) -> None:
    await session.execute(
        insert(email_verification_tokens).values(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
        )
    )


async def find_verification_token(session: AsyncSession, token: str) -> Optional[Mapping[str, Any]]:
    result = await session.execute(
        select(email_verification_tokens).where(email_verification_tokens.c.token == token)
    )
    return result.mappings().first()


async def delete_verification_token(session: AsyncSession, token: str) -> None:
    await session.execute(delete(email_verification_tokens).where(email_verification_tokens.c.token == token))


async def verify_password(hash_value: str | None, password: str) -> bool:
    if not hash_value or not password:
        return False
    return pwd_context.verify(password, hash_value)
