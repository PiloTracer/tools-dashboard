"""Infrastructure layer for user subscription feature."""

from typing import Protocol, Any


class PaymentService(Protocol):
    """Protocol for payment processing service."""

    async def process_payment(
        self, user_id: str, amount: float, currency: str, payment_method_id: str
    ) -> dict[str, Any]:
        """Process a payment transaction."""
        ...

    async def create_customer(self, user_id: str, email: str) -> dict[str, Any]:
        """Create a customer in the payment system."""
        ...


class NotificationService(Protocol):
    """Protocol for notification service."""

    async def send_subscription_confirmation(
        self, user_id: str, email: str, package_name: str
    ) -> None:
        """Send subscription confirmation notification."""
        ...

    async def send_cancellation_notice(
        self, user_id: str, email: str, package_name: str
    ) -> None:
        """Send subscription cancellation notice."""
        ...


class AnalyticsService(Protocol):
    """Protocol for analytics/tracking service."""

    async def track_subscription_event(
        self, event_type: str, user_id: str, package_slug: str, metadata: dict[str, Any]
    ) -> None:
        """Track subscription-related events."""
        ...


class InfrastructureRegistry:
    """Expose integration points consumed by the domain layer."""

    def __init__(
        self,
        payment_service: PaymentService | None = None,
        notification_service: NotificationService | None = None,
        analytics_service: AnalyticsService | None = None,
    ) -> None:
        self.payment_service = payment_service
        self.notification_service = notification_service
        self.analytics_service = analytics_service

    async def process_subscription_payment(
        self, user_id: str, amount: float, currency: str, payment_method_id: str
    ) -> dict[str, Any]:
        """Process payment for a subscription."""
        if self.payment_service:
            return await self.payment_service.process_payment(
                user_id, amount, currency, payment_method_id
            )
        # Mock response if no payment service is configured
        return {
            "status": "succeeded",
            "transaction_id": "mock_txn_123",
            "message": "Payment processed successfully (mock)",
        }

    async def notify_subscription_created(
        self, user_id: str, email: str, package_name: str
    ) -> None:
        """Notify user about subscription creation."""
        if self.notification_service:
            await self.notification_service.send_subscription_confirmation(
                user_id, email, package_name
            )

    async def notify_subscription_cancelled(
        self, user_id: str, email: str, package_name: str
    ) -> None:
        """Notify user about subscription cancellation."""
        if self.notification_service:
            await self.notification_service.send_cancellation_notice(
                user_id, email, package_name
            )

    async def track_event(
        self, event_type: str, user_id: str, package_slug: str, metadata: dict[str, Any]
    ) -> None:
        """Track subscription events for analytics."""
        if self.analytics_service:
            await self.analytics_service.track_subscription_event(
                event_type, user_id, package_slug, metadata
            )
