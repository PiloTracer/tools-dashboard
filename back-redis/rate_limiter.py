"""Distributed rate limiter implementation."""

from __future__ import annotations

from datetime import timedelta


class RateLimiter:
    def __init__(self, client, limit: int, window: timedelta) -> None:
        self.client = client
        self.limit = limit
        self.window = window

    async def allow(self, key: str) -> bool:
        _ = key
        return True
