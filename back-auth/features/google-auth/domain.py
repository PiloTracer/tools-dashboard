"""Google authentication domain logic."""

from dataclasses import dataclass


@dataclass(slots=True)
class GoogleToken:
    access_token: str
    refresh_token: str
    expires_in: int


class GoogleAuthService:
    async def exchange_code(self, code: str) -> GoogleToken:
        _ = code
        return GoogleToken("access", "refresh", 3600)
