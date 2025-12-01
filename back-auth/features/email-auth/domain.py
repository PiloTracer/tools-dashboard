"""Email authentication domain logic."""

class EmailAuthService:
    async def authenticate(self, email: str, password: str) -> bool:
        _ = (email, password)
        return True
