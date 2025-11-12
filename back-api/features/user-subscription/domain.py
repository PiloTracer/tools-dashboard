"""Domain layer for user subscription feature."""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from decimal import Decimal


@dataclass(slots=True)
class SubscriptionPackageDTO:
    """Data transfer object for subscription package with metadata."""
    id: str
    slug: str
    name: str
    description: str
    price_monthly: Decimal
    price_yearly: Decimal
    currency: str
    rate_limit_per_hour: int
    rate_limit_per_day: int
    is_active: bool
    display_order: int
    metadata: dict[str, Any]
    features: list[dict[str, Any]]


@dataclass(slots=True)
class UserSubscriptionDTO:
    """Data transfer object for user subscription."""
    id: str
    user_id: str
    package_id: str
    package_slug: str
    package_name: str
    status: str
    billing_cycle: str
    current_period_start: datetime
    current_period_end: datetime
    rate_limit_per_hour: int
    rate_limit_per_day: int


@dataclass(slots=True)
class SubscribeRequest:
    """Request to subscribe a user to a package."""
    user_id: str
    package_slug: str
    billing_cycle: str  # 'monthly' or 'yearly'
    payment_method_id: str | None = None


@dataclass(slots=True)
class SubscriptionResponse:
    """Response for subscription operations."""
    success: bool
    message: str
    subscription: dict[str, Any] | None = None


class SubscriptionService:
    """Coordinates subscription business logic."""

    def __init__(
        self,
        package_repo: Any,
        user_subscription_repo: Any,
        metadata_repo: Any,
        features_repo: Any,
    ) -> None:
        self.package_repo = package_repo
        self.user_subscription_repo = user_subscription_repo
        self.metadata_repo = metadata_repo
        self.features_repo = features_repo

    async def list_all_packages(self) -> list[SubscriptionPackageDTO]:
        """Retrieve all active subscription packages with metadata and features."""
        # Get packages from PostgreSQL
        packages = await self.package_repo.find_all_active()

        result = []
        for package in packages:
            # Get metadata from Cassandra
            metadata_list = await self.metadata_repo.find_by_package(package["slug"])
            metadata = {
                item["metadata_key"]: item["metadata_value"]
                for item in metadata_list
            }

            # Get features from Cassandra
            features = await self.features_repo.find_by_package(package["slug"])
            features = sorted(features, key=lambda x: x["display_order"])

            # Build DTO
            dto = SubscriptionPackageDTO(
                id=str(package["id"]),
                slug=package["slug"],
                name=package["name"],
                description=package["description"],
                price_monthly=package["price_monthly"],
                price_yearly=package["price_yearly"],
                currency=package["currency"],
                rate_limit_per_hour=package["rate_limit_per_hour"],
                rate_limit_per_day=package["rate_limit_per_day"],
                is_active=package["is_active"],
                display_order=package["display_order"],
                metadata=metadata,
                features=[
                    {
                        "id": f["feature_id"],
                        "name": f["feature_name"],
                        "description": f["feature_description"],
                        "included": f["is_included"],
                        "icon": f.get("icon", ""),
                        "category": f.get("category", "general"),
                    }
                    for f in features
                ],
            )
            result.append(dto)

        return result

    async def get_package_by_slug(self, slug: str) -> SubscriptionPackageDTO | None:
        """Retrieve a specific subscription package by slug with full metadata."""
        # Get package from PostgreSQL
        package = await self.package_repo.find_by_slug(slug)
        if not package:
            return None

        # Get metadata from Cassandra
        metadata_list = await self.metadata_repo.find_by_package(slug)
        metadata = {
            item["metadata_key"]: item["metadata_value"]
            for item in metadata_list
        }

        # Get features from Cassandra
        features = await self.features_repo.find_by_package(slug)
        features = sorted(features, key=lambda x: x["display_order"])

        return SubscriptionPackageDTO(
            id=str(package["id"]),
            slug=package["slug"],
            name=package["name"],
            description=package["description"],
            price_monthly=package["price_monthly"],
            price_yearly=package["price_yearly"],
            currency=package["currency"],
            rate_limit_per_hour=package["rate_limit_per_hour"],
            rate_limit_per_day=package["rate_limit_per_day"],
            is_active=package["is_active"],
            display_order=package["display_order"],
            metadata=metadata,
            features=[
                {
                    "id": f["feature_id"],
                    "name": f["feature_name"],
                    "description": f["feature_description"],
                    "included": f["is_included"],
                    "icon": f.get("icon", ""),
                    "category": f.get("category", "general"),
                }
                for f in features
            ],
        )

    async def get_user_subscription(self, user_id: str) -> UserSubscriptionDTO | None:
        """Retrieve the active subscription for a user."""
        subscription = await self.user_subscription_repo.find_active_by_user(user_id)
        if not subscription:
            return None

        return UserSubscriptionDTO(
            id=str(subscription["id"]),
            user_id=str(subscription["user_id"]),
            package_id=str(subscription["package_id"]),
            package_slug=subscription["package_slug"],
            package_name=subscription["package_name"],
            status=subscription["status"],
            billing_cycle=subscription["billing_cycle"],
            current_period_start=subscription["current_period_start"],
            current_period_end=subscription["current_period_end"],
            rate_limit_per_hour=subscription["rate_limit_per_hour"],
            rate_limit_per_day=subscription["rate_limit_per_day"],
        )

    async def subscribe_user(
        self, request: SubscribeRequest
    ) -> SubscriptionResponse:
        """Subscribe a user to a package."""
        # Validate package exists
        package = await self.package_repo.find_by_slug(request.package_slug)
        if not package:
            return SubscriptionResponse(
                success=False,
                message=f"Package '{request.package_slug}' not found",
            )

        # Calculate period end based on billing cycle
        if request.billing_cycle == "monthly":
            period_end = datetime.utcnow() + timedelta(days=30)
        elif request.billing_cycle == "yearly":
            period_end = datetime.utcnow() + timedelta(days=365)
        else:
            return SubscriptionResponse(
                success=False,
                message=f"Invalid billing cycle: {request.billing_cycle}",
            )

        # TODO: Process payment with payment_method_id via infrastructure layer

        # Create subscription
        subscription = await self.user_subscription_repo.create_subscription(
            user_id=request.user_id,
            package_id=str(package["id"]),
            package_slug=package["slug"],
            billing_cycle=request.billing_cycle,
            current_period_end=period_end,
        )

        return SubscriptionResponse(
            success=True,
            message="Subscription created successfully",
            subscription={
                "id": str(subscription["id"]),
                "package_slug": subscription["package_slug"],
                "status": subscription["status"],
                "billing_cycle": subscription["billing_cycle"],
                "current_period_end": subscription["current_period_end"].isoformat(),
            },
        )

    async def cancel_subscription(
        self, user_id: str
    ) -> SubscriptionResponse:
        """Cancel a user's active subscription."""
        # Find active subscription
        subscription = await self.user_subscription_repo.find_active_by_user(user_id)
        if not subscription:
            return SubscriptionResponse(
                success=False,
                message="No active subscription found",
            )

        # Cancel subscription
        cancelled = await self.user_subscription_repo.cancel_subscription(
            str(subscription["id"])
        )

        if cancelled:
            return SubscriptionResponse(
                success=True,
                message="Subscription cancelled successfully",
                subscription={
                    "id": str(cancelled["id"]),
                    "status": cancelled["status"],
                    "cancelled_at": cancelled["cancelled_at"].isoformat() if cancelled.get("cancelled_at") else None,
                },
            )

        return SubscriptionResponse(
            success=False,
            message="Failed to cancel subscription",
        )

    async def upgrade_subscription(
        self, user_id: str, new_package_slug: str
    ) -> SubscriptionResponse:
        """Upgrade or downgrade a user's subscription to a new package."""
        # Find active subscription
        current_subscription = await self.user_subscription_repo.find_active_by_user(user_id)
        if not current_subscription:
            return SubscriptionResponse(
                success=False,
                message="No active subscription found",
            )

        # Validate new package exists
        new_package = await self.package_repo.find_by_slug(new_package_slug)
        if not new_package:
            return SubscriptionResponse(
                success=False,
                message=f"Package '{new_package_slug}' not found",
            )

        # Use the same billing cycle and period end
        billing_cycle = current_subscription["billing_cycle"]
        period_end = current_subscription["current_period_end"]

        # Cancel current subscription and create new one
        await self.user_subscription_repo.cancel_subscription(
            str(current_subscription["id"])
        )

        new_subscription = await self.user_subscription_repo.create_subscription(
            user_id=user_id,
            package_id=str(new_package["id"]),
            package_slug=new_package["slug"],
            billing_cycle=billing_cycle,
            current_period_end=period_end,
        )

        return SubscriptionResponse(
            success=True,
            message="Subscription upgraded successfully",
            subscription={
                "id": str(new_subscription["id"]),
                "package_slug": new_subscription["package_slug"],
                "status": new_subscription["status"],
                "billing_cycle": new_subscription["billing_cycle"],
            },
        )
