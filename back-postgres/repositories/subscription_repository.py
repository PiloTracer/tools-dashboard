"""Repository for subscription entities."""

from typing import Any


class SubscriptionRepository:
    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def list_active(self, user_id: str) -> list[dict[str, Any]]:
        _ = user_id
        return []
