"""Extended user data repository for Cassandra."""

from typing import Any


class UserExtRepository:
    def __init__(self, session: Any) -> None:
        self.session = session

    async def upsert(self, user_id: str, payload: dict[str, Any]) -> None:
        _ = (user_id, payload)
