"""Simple cache helper built on redis-py."""

from __future__ import annotations

from datetime import timedelta
from typing import Any


class Cache:
    def __init__(self, client) -> None:
        self.client = client

    async def set(self, key: str, value: Any, ttl: timedelta) -> None:
        await self.client.set(name=key, value=value, ex=int(ttl.total_seconds()))

    async def get(self, key: str) -> Any:
        return await self.client.get(name=key)
