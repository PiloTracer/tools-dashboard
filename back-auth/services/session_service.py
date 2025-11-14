"""Session management service for user-management feature."""

from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import sessions


async def invalidate_user_sessions(session: AsyncSession, user_id: int) -> int:
    """Invalidate all sessions for a specific user.

    This is called when:
    - User role is changed (requires re-authentication with new permissions)
    - User status is changed to inactive or suspended
    - Admin manually invalidates user sessions

    Args:
        session: Database session
        user_id: User's unique identifier

    Returns:
        Number of sessions invalidated
    """
    result = await session.execute(
        delete(sessions).where(sessions.c.user_id == user_id)
    )
    await session.commit()

    # Return number of rows deleted
    return result.rowcount if result.rowcount else 0


async def invalidate_session_by_token(session: AsyncSession, session_token: str) -> bool:
    """Invalidate a specific session by token.

    Args:
        session: Database session
        session_token: Session token to invalidate

    Returns:
        True if session was found and invalidated, False otherwise
    """
    result = await session.execute(
        delete(sessions).where(sessions.c.session_token == session_token)
    )
    await session.commit()

    return bool(result.rowcount and result.rowcount > 0)
