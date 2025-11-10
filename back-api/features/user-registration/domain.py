"""Domain models and orchestrators for user registration."""

from dataclasses import dataclass


@dataclass(slots=True)
class RegistrationRequest:
    email: str
    password: str


class RegistrationService:
    """Coordinates the user registration workflow."""

    async def register(self, request: RegistrationRequest) -> dict[str, str]:
        # Replace with actual registration logic wired through infrastructure.
        return {"email": request.email, "status": "pending-verification"}
