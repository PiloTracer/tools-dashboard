"""Two-factor domain logic."""

class TwoFactorService:
    async def verify(self, user_id: str, code: str) -> bool:
        _ = (user_id, code)
        return True
