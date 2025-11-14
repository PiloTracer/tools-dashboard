"""Infrastructure layer for user management feature.

This module defines service clients and protocols for external integrations:
- back-auth service (session invalidation)
- Email notification service (future)
- Analytics service (future)
"""

from typing import Protocol, Any
import httpx


class AuthServiceClient(Protocol):
    """Protocol for back-auth service client."""

    async def invalidate_user_sessions(
        self, user_id: int, reason: str | None = None
    ) -> dict[str, Any]:
        """Invalidate all sessions for a user."""
        ...

    async def verify_admin(self, token: str) -> dict[str, Any]:
        """Verify admin credentials."""
        ...


class HttpAuthServiceClient:
    """HTTP client for back-auth service."""

    def __init__(self, base_url: str = "http://back-auth:8101"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=10.0)

    async def invalidate_user_sessions(
        self, user_id: int, reason: str | None = None
    ) -> dict[str, Any]:
        """Invalidate all sessions for a user via back-auth API.

        Args:
            user_id: User ID whose sessions to invalidate
            reason: Reason for invalidation (optional)

        Returns:
            Response from back-auth with invalidation count

        Raises:
            httpx.HTTPError: If request fails
        """
        url = f"{self.base_url}/admin/users/{user_id}/invalidate-sessions"
        payload = {"reason": reason} if reason else {}

        response = await self.client.post(url, json=payload)
        response.raise_for_status()
        return response.json()

    async def verify_admin(self, token: str) -> dict[str, Any]:
        """Verify admin credentials via back-auth API.

        Args:
            token: JWT token to verify

        Returns:
            Admin user info if valid

        Raises:
            httpx.HTTPError: If token is invalid
        """
        url = f"{self.base_url}/admin/users/verify-admin"
        headers = {"Authorization": f"Bearer {token}"}

        response = await self.client.post(url, headers=headers)
        response.raise_for_status()
        return response.json()

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


class EmailNotificationService(Protocol):
    """Protocol for email notification service."""

    async def send_role_change_notification(
        self, user_email: str, old_role: str, new_role: str
    ) -> None:
        """Notify user about role change."""
        ...

    async def send_status_change_notification(
        self, user_email: str, new_status: str
    ) -> None:
        """Notify user about status change."""
        ...


class AnalyticsService(Protocol):
    """Protocol for analytics/tracking service."""

    async def track_admin_action(
        self, admin_id: str, action: str, metadata: dict[str, Any]
    ) -> None:
        """Track admin actions for analytics."""
        ...


class InfrastructureRegistry:
    """Registry of external service integrations."""

    def __init__(
        self,
        auth_service: AuthServiceClient | None = None,
        email_service: EmailNotificationService | None = None,
        analytics_service: AnalyticsService | None = None,
    ) -> None:
        self.auth_service = auth_service or HttpAuthServiceClient()
        self.email_service = email_service
        self.analytics_service = analytics_service

    async def invalidate_sessions(
        self, user_id: int, reason: str | None = None
    ) -> dict[str, Any]:
        """Invalidate user sessions via back-auth."""
        return await self.auth_service.invalidate_user_sessions(user_id, reason)

    async def notify_role_change(
        self, user_email: str, old_role: str, new_role: str
    ) -> None:
        """Send role change notification email."""
        if self.email_service:
            await self.email_service.send_role_change_notification(
                user_email, old_role, new_role
            )

    async def notify_status_change(
        self, user_email: str, new_status: str
    ) -> None:
        """Send status change notification email."""
        if self.email_service:
            await self.email_service.send_status_change_notification(
                user_email, new_status
            )

    async def track_action(
        self, admin_id: str, action: str, metadata: dict[str, Any]
    ) -> None:
        """Track admin action for analytics."""
        if self.analytics_service:
            await self.analytics_service.track_admin_action(admin_id, action, metadata)
