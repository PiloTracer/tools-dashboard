"""
App Library Feature - Shared Data Models

This module defines Pydantic models for application library management,
access control, user preferences, and usage analytics.
"""

from datetime import datetime, date
from typing import Dict, List, Optional, Any, Set
from pydantic import BaseModel, Field, HttpUrl, validator, UUID4
from enum import Enum


# ============================================================================
# Enums
# ============================================================================

class AccessMode(str, Enum):
    """Access control modes for applications"""
    ALL_USERS = "all_users"
    ALL_EXCEPT = "all_except"
    ONLY_SPECIFIED = "only_specified"
    SUBSCRIPTION_BASED = "subscription_based"


class SubscriptionTier(str, Enum):
    """Subscription tiers for access control"""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"


class AuditEventType(str, Enum):
    """Audit log event types"""
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    ACTIVATED = "activated"
    DEACTIVATED = "deactivated"
    SECRET_REGENERATED = "secret_regenerated"
    ACCESS_MODIFIED = "access_modified"
    REDIRECT_URI_ADDED = "redirect_uri_added"
    REDIRECT_URI_REMOVED = "redirect_uri_removed"
    SCOPE_ADDED = "scope_added"
    SCOPE_REMOVED = "scope_removed"


# ============================================================================
# Application Models
# ============================================================================

class AppCreate(BaseModel):
    """Request model for creating an application"""
    client_name: str = Field(..., min_length=3, max_length=100, description="Application name")
    description: Optional[str] = Field(None, max_length=2000, description="Application description")
    logo_url: Optional[str] = Field(None, max_length=500, description="Application logo URL")
    dev_url: str = Field(..., max_length=500, description="Development environment URL")
    prod_url: Optional[str] = Field(None, max_length=500, description="Production environment URL")
    redirect_uris: List[str] = Field(..., min_items=1, description="Allowed OAuth redirect URIs")
    allowed_scopes: List[str] = Field(
        default=["profile", "email"],
        description="OAuth scopes this app can request"
    )
    is_active: bool = Field(default=False, description="Whether app is active")

    @validator('redirect_uris')
    def validate_redirect_uris(cls, v):
        """Validate redirect URIs are valid URLs"""
        for uri in v:
            if not uri.startswith(('http://', 'https://')):
                raise ValueError(f"Invalid redirect URI: {uri}")
        return v

    @validator('dev_url', 'prod_url')
    def validate_urls(cls, v):
        """Validate URLs are valid"""
        if v and not v.startswith(('http://', 'https://')):
            raise ValueError(f"Invalid URL: {v}")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "client_name": "E-Card Generator",
                "description": "Create stunning personalized cards with QR codes",
                "logo_url": "https://cdn.example.com/logos/ecards.png",
                "dev_url": "http://localhost:7300",
                "prod_url": "https://ecards.epicstudio.com",
                "redirect_uris": [
                    "http://localhost:7300/oauth/complete",
                    "https://ecards.epicstudio.com/oauth/complete"
                ],
                "allowed_scopes": ["profile", "email", "subscription"],
                "is_active": True
            }
        }


class AppUpdate(BaseModel):
    """Request model for updating an application"""
    client_name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    logo_url: Optional[str] = Field(None, max_length=500)
    dev_url: Optional[str] = Field(None, max_length=500)
    prod_url: Optional[str] = Field(None, max_length=500)
    redirect_uris: Optional[List[str]] = None
    allowed_scopes: Optional[List[str]] = None
    is_active: Optional[bool] = None

    @validator('redirect_uris')
    def validate_redirect_uris(cls, v):
        """Validate redirect URIs are valid URLs"""
        if v:
            for uri in v:
                if not uri.startswith(('http://', 'https://')):
                    raise ValueError(f"Invalid redirect URI: {uri}")
        return v


class App(BaseModel):
    """Application model (response)"""
    id: UUID4
    client_id: str
    client_name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    dev_url: Optional[str] = None
    prod_url: Optional[str] = None
    redirect_uris: List[str]
    allowed_scopes: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class AppWithSecret(App):
    """Application model with client secret (only shown once on creation)"""
    client_secret: str = Field(..., description="Client secret (plain text, only shown once)")


class AppSummary(BaseModel):
    """Lightweight app model for list views"""
    id: UUID4
    client_id: str
    client_name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


# ============================================================================
# Access Control Models
# ============================================================================

class AccessRuleCreate(BaseModel):
    """Request model for creating access control rules"""
    mode: AccessMode = Field(default=AccessMode.ALL_USERS, description="Access control mode")
    user_ids: List[int] = Field(default=[], description="User IDs for all_except or only_specified modes")
    subscription_tiers: List[SubscriptionTier] = Field(
        default=[],
        description="Subscription tiers for subscription_based mode"
    )

    @validator('user_ids')
    def validate_user_ids_for_mode(cls, v, values):
        """Validate user_ids is provided when mode requires it"""
        mode = values.get('mode')
        if mode in [AccessMode.ALL_EXCEPT, AccessMode.ONLY_SPECIFIED] and not v:
            raise ValueError(f"user_ids required for mode: {mode}")
        return v

    @validator('subscription_tiers')
    def validate_tiers_for_mode(cls, v, values):
        """Validate subscription_tiers is provided when mode requires it"""
        mode = values.get('mode')
        if mode == AccessMode.SUBSCRIPTION_BASED and not v:
            raise ValueError("subscription_tiers required for subscription_based mode")
        return v


class AccessRuleUpdate(BaseModel):
    """Request model for updating access control rules"""
    mode: Optional[AccessMode] = None
    user_ids: Optional[List[int]] = None
    subscription_tiers: Optional[List[SubscriptionTier]] = None


class AccessRule(BaseModel):
    """Access control rule model (response)"""
    id: UUID4
    app_id: UUID4
    mode: AccessMode
    user_ids: List[int]
    subscription_tiers: List[str]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


# ============================================================================
# User Preference Models
# ============================================================================

class UserPreferenceUpdate(BaseModel):
    """Request model for updating user preferences"""
    is_favorite: Optional[bool] = None


class UserPreference(BaseModel):
    """User app preference model (response)"""
    id: UUID4
    user_id: int
    app_client_id: str
    is_favorite: bool
    last_launched_at: Optional[datetime] = None
    launch_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AppWithPreference(AppSummary):
    """App model with user preference data"""
    is_favorite: bool = False
    last_launched_at: Optional[datetime] = None
    launch_count: int = 0


# ============================================================================
# Usage Analytics Models
# ============================================================================

class LaunchEventCreate(BaseModel):
    """Request model for recording a launch event"""
    app_client_id: str
    user_id: UUID4
    redirect_uri: str
    scopes: Set[str]
    authorization_code: Optional[str] = None
    success: bool
    error_code: Optional[str] = None
    error_description: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class DailyStats(BaseModel):
    """Daily statistics model"""
    app_client_id: str
    stat_date: date
    total_launches: int
    unique_users_count: int
    successful_launches: int
    failed_launches: int
    computed_at: datetime

    class Config:
        from_attributes = True


class UsageStats(BaseModel):
    """Aggregated usage statistics"""
    app_id: UUID4
    app_name: str
    total_users: int = 0
    total_launches: int = 0
    daily_stats: List[DailyStats] = []


# ============================================================================
# Audit Log Models
# ============================================================================

class AuditLogCreate(BaseModel):
    """Request model for creating audit log entry"""
    app_id: Optional[UUID4] = None
    event_type: AuditEventType
    performed_by: Optional[int] = None
    changes: Optional[Dict[str, Any]] = None
    snapshot: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class AuditLog(BaseModel):
    """Audit log entry model (response)"""
    id: UUID4
    app_id: Optional[UUID4] = None
    event_type: AuditEventType
    performed_by: Optional[int] = None
    changes: Optional[Dict[str, Any]] = None
    snapshot: Optional[Dict[str, Any]] = None
    created_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================================
# API Response Models
# ============================================================================

class AppListResponse(BaseModel):
    """Response model for app list endpoint"""
    apps: List[AppWithPreference]
    total: int
    favorites: List[AppWithPreference] = []
    recently_used: List[AppWithPreference] = []


class AppDetailResponse(BaseModel):
    """Response model for app detail endpoint"""
    app: App
    access_rule: Optional[AccessRule] = None
    user_preference: Optional[UserPreference] = None
    usage_stats: Optional[UsageStats] = None


class SecretRegenerateResponse(BaseModel):
    """Response model for secret regeneration"""
    client_id: str
    client_secret: str
    message: str = "Client secret regenerated successfully. Save this secret securely - it won't be shown again."


# ============================================================================
# Helper Functions
# ============================================================================

def mask_secret(secret: str) -> str:
    """Mask a secret for display (show first 8 chars + ***)"""
    if len(secret) <= 8:
        return "***"
    return f"{secret[:8]}***"
