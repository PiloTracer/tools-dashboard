"""Infrastructure integrations for the user registration feature."""

from typing import Protocol


class EmailService(Protocol):
    async def send_verification(self, email: str, token: str) -> None:
        """Send a verification message to a newly registered user."""


class InfrastructureRegistry:
    """Expose integration points consumed by the domain layer."""

    def __init__(self, email_service: EmailService | None = None) -> None:
        self.email_service = email_service

    async def provision_user(self, email: str) -> None:
        # Real implementation would call back-auth and shared services.
        _ = email
