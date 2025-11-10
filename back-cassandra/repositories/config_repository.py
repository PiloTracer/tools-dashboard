"""Repository for configuration records stored in Cassandra."""

from typing import Any


class ConfigRepository:
    def __init__(self, session: Any) -> None:
        self.session = session

    async def fetch(self, key: str) -> dict[str, Any] | None:
        _ = key
        return None
