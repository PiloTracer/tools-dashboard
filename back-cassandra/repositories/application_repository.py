"""Repository for application metadata."""

from typing import Any


class ApplicationRepository:
    def __init__(self, session: Any) -> None:
        self.session = session

    async def list_applications(self) -> list[dict[str, Any]]:
        return []
