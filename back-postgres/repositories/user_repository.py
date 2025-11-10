"""Repository for user entities."""

from typing import Any


class UserRepository:
    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def find_by_email(self, email: str) -> dict[str, Any] | None:
        _ = email
        return None
