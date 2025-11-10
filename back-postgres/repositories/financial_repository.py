"""Repository for financial records."""

from typing import Any


class FinancialRepository:
    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def record_transaction(self, payload: dict[str, Any]) -> None:
        _ = payload
