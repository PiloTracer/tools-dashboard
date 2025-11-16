"""
App Library Feature - Shared Contracts

This package provides shared data models and contracts for the app-library feature.

Usage:
    from shared.contracts.app_library import (
        App, AppCreate, AppUpdate,
        AccessRule, AccessMode,
        UserPreference, UsageStats
    )
"""

from .models import (
    # Enums
    AccessMode,
    SubscriptionTier,
    AuditEventType,

    # Application Models
    App,
    AppCreate,
    AppUpdate,
    AppWithSecret,
    AppSummary,
    AppWithPreference,

    # Access Control Models
    AccessRule,
    AccessRuleCreate,
    AccessRuleUpdate,

    # User Preference Models
    UserPreference,
    UserPreferenceUpdate,

    # Usage Analytics Models
    LaunchEventCreate,
    DailyStats,
    UsageStats,

    # Audit Log Models
    AuditLog,
    AuditLogCreate,

    # API Response Models
    AppListResponse,
    AppDetailResponse,
    SecretRegenerateResponse,

    # Helper Functions
    mask_secret,
)

__all__ = [
    # Enums
    "AccessMode",
    "SubscriptionTier",
    "AuditEventType",

    # Application Models
    "App",
    "AppCreate",
    "AppUpdate",
    "AppWithSecret",
    "AppSummary",
    "AppWithPreference",

    # Access Control Models
    "AccessRule",
    "AccessRuleCreate",
    "AccessRuleUpdate",

    # User Preference Models
    "UserPreference",
    "UserPreferenceUpdate",

    # Usage Analytics Models
    "LaunchEventCreate",
    "DailyStats",
    "UsageStats",

    # Audit Log Models
    "AuditLog",
    "AuditLogCreate",

    # API Response Models
    "AppListResponse",
    "AppDetailResponse",
    "SecretRegenerateResponse",

    # Helper Functions
    "mask_secret",
]

__version__ = "1.0.0"
