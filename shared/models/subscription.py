"""Shared subscription models."""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass(slots=True)
class SubscriptionPackage:
    """Represents a subscription package/plan definition."""
    id: str
    slug: str  # free, standard, premium, enterprise
    name: str
    description: str
    price_monthly: Decimal
    price_yearly: Decimal
    currency: str
    rate_limit_per_hour: int
    rate_limit_per_day: int
    is_active: bool
    display_order: int
    created_at: datetime
    updated_at: datetime


@dataclass(slots=True)
class Subscription:
    """Represents a user's active subscription."""
    id: str
    user_id: str
    package_id: str
    package_slug: str
    status: str  # active, cancelled, expired, trial
    billing_cycle: str  # monthly, yearly
    current_period_start: datetime
    current_period_end: datetime
    created_at: datetime
    updated_at: datetime


@dataclass(slots=True)
class SubscriptionMetadata:
    """Represents additional metadata for a subscription package stored in Cassandra."""
    package_slug: str
    metadata_key: str
    metadata_value: str
    metadata_type: str  # feature, tool, description, benefit
    display_order: int
