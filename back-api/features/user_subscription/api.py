"""API layer for user subscription feature."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Any

from .domain import (
    SubscriptionService,
    SubscribeRequest,
    SubscriptionPackageDTO,
    UserSubscriptionDTO,
)

router = APIRouter(prefix="/user-subscription", tags=["user-subscription"])


# Pydantic models for request/response validation
class SubscribeRequestModel(BaseModel):
    """Request model for subscribing to a package."""
    user_id: str = Field(..., description="User ID")
    package_slug: str = Field(..., description="Package slug (free, standard, premium, enterprise)")
    billing_cycle: str = Field(..., description="Billing cycle (monthly or yearly)")
    payment_method_id: str | None = Field(None, description="Payment method ID from payment provider")


class UpgradeRequestModel(BaseModel):
    """Request model for upgrading a subscription."""
    user_id: str = Field(..., description="User ID")
    new_package_slug: str = Field(..., description="New package slug")


class CancelRequestModel(BaseModel):
    """Request model for cancelling a subscription."""
    user_id: str = Field(..., description="User ID")


class PackageResponseModel(BaseModel):
    """Response model for subscription package."""
    id: str
    slug: str
    name: str
    description: str
    price_monthly: float
    price_yearly: float
    currency: str
    rate_limit_per_hour: int
    rate_limit_per_day: int
    display_order: int
    metadata: dict[str, Any]
    features: list[dict[str, Any]]


class UserSubscriptionResponseModel(BaseModel):
    """Response model for user subscription."""
    id: str
    user_id: str
    package_id: str
    package_slug: str
    package_name: str
    status: str
    billing_cycle: str
    current_period_start: str
    current_period_end: str
    rate_limit_per_hour: int
    rate_limit_per_day: int


def get_service() -> SubscriptionService:
    """
    Dependency that returns a SubscriptionService.

    TODO: In production, this should:
    - Get database pools from application state
    - Initialize repositories with proper connections
    - Return fully configured service
    """
    # This is a placeholder - actual implementation will be injected via main.py
    from .domain import SubscriptionService

    # Placeholder repositories (will be replaced with real ones)
    class MockRepo:
        async def find_all_active(self):
            return []
        async def find_by_slug(self, slug: str):
            return None
        async def find_active_by_user(self, user_id: str):
            return None
        async def create_subscription(self, **kwargs):
            return {}
        async def cancel_subscription(self, subscription_id: str):
            return None
        async def find_by_package(self, package_slug: str):
            return []

    mock_repo = MockRepo()
    return SubscriptionService(
        package_repo=mock_repo,
        user_subscription_repo=mock_repo,
        metadata_repo=mock_repo,
        features_repo=mock_repo,
    )


@router.get("/health", summary="Health check for subscription service")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "user-subscription"}


@router.get(
    "/packages",
    response_model=list[PackageResponseModel],
    summary="Get all subscription packages",
    description="Retrieve all available subscription packages with pricing, features, and metadata.",
)
async def get_all_packages(
    service: SubscriptionService = Depends(get_service),
) -> list[dict[str, Any]]:
    """Get all available subscription packages."""
    packages = await service.list_all_packages()

    return [
        {
            "id": pkg.id,
            "slug": pkg.slug,
            "name": pkg.name,
            "description": pkg.description,
            "price_monthly": float(pkg.price_monthly),
            "price_yearly": float(pkg.price_yearly),
            "currency": pkg.currency,
            "rate_limit_per_hour": pkg.rate_limit_per_hour,
            "rate_limit_per_day": pkg.rate_limit_per_day,
            "display_order": pkg.display_order,
            "metadata": pkg.metadata,
            "features": pkg.features,
        }
        for pkg in packages
    ]


@router.get(
    "/packages/{slug}",
    response_model=PackageResponseModel,
    summary="Get a specific subscription package",
    description="Retrieve a specific subscription package by slug with full details.",
)
async def get_package_by_slug(
    slug: str,
    service: SubscriptionService = Depends(get_service),
) -> dict[str, Any]:
    """Get a specific subscription package by slug."""
    package = await service.get_package_by_slug(slug)

    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Package '{slug}' not found",
        )

    return {
        "id": package.id,
        "slug": package.slug,
        "name": package.name,
        "description": package.description,
        "price_monthly": float(package.price_monthly),
        "price_yearly": float(package.price_yearly),
        "currency": package.currency,
        "rate_limit_per_hour": package.rate_limit_per_hour,
        "rate_limit_per_day": package.rate_limit_per_day,
        "display_order": package.display_order,
        "metadata": package.metadata,
        "features": package.features,
    }


@router.get(
    "/user/{user_id}",
    response_model=UserSubscriptionResponseModel | None,
    summary="Get user's current subscription",
    description="Retrieve the active subscription for a specific user.",
)
async def get_user_subscription(
    user_id: str,
    service: SubscriptionService = Depends(get_service),
) -> dict[str, Any] | None:
    """Get a user's current subscription."""
    subscription = await service.get_user_subscription(user_id)

    if not subscription:
        return None

    return {
        "id": subscription.id,
        "user_id": subscription.user_id,
        "package_id": subscription.package_id,
        "package_slug": subscription.package_slug,
        "package_name": subscription.package_name,
        "status": subscription.status,
        "billing_cycle": subscription.billing_cycle,
        "current_period_start": subscription.current_period_start.isoformat(),
        "current_period_end": subscription.current_period_end.isoformat(),
        "rate_limit_per_hour": subscription.rate_limit_per_hour,
        "rate_limit_per_day": subscription.rate_limit_per_day,
    }


@router.post(
    "/subscribe",
    summary="Subscribe to a package",
    description="Subscribe a user to a subscription package.",
    status_code=status.HTTP_201_CREATED,
)
async def subscribe(
    request: SubscribeRequestModel,
    service: SubscriptionService = Depends(get_service),
) -> dict[str, Any]:
    """Subscribe a user to a package."""
    domain_request = SubscribeRequest(
        user_id=request.user_id,
        package_slug=request.package_slug,
        billing_cycle=request.billing_cycle,
        payment_method_id=request.payment_method_id,
    )

    response = await service.subscribe_user(domain_request)

    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.message,
        )

    return {
        "success": response.success,
        "message": response.message,
        "subscription": response.subscription,
    }


@router.post(
    "/cancel",
    summary="Cancel subscription",
    description="Cancel a user's current subscription.",
)
async def cancel_subscription(
    request: CancelRequestModel,
    service: SubscriptionService = Depends(get_service),
) -> dict[str, Any]:
    """Cancel a user's subscription."""
    response = await service.cancel_subscription(request.user_id)

    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.message,
        )

    return {
        "success": response.success,
        "message": response.message,
        "subscription": response.subscription,
    }


@router.post(
    "/upgrade",
    summary="Upgrade subscription",
    description="Upgrade or downgrade a user's subscription to a different package.",
)
async def upgrade_subscription(
    request: UpgradeRequestModel,
    service: SubscriptionService = Depends(get_service),
) -> dict[str, Any]:
    """Upgrade or downgrade a user's subscription."""
    response = await service.upgrade_subscription(
        request.user_id, request.new_package_slug
    )

    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.message,
        )

    return {
        "success": response.success,
        "message": response.message,
        "subscription": response.subscription,
    }
