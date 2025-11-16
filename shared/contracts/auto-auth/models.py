"""
Auto-Auth Feature - Shared Data Models

This module defines Pydantic models for OAuth 2.0 and external application integration.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, EmailStr, validator
from enum import Enum


class OAuthGrantType(str, Enum):
    """OAuth 2.0 grant types supported"""
    AUTHORIZATION_CODE = "authorization_code"
    REFRESH_TOKEN = "refresh_token"


class OAuthTokenType(str, Enum):
    """OAuth token types"""
    ACCESS = "access"
    REFRESH = "refresh"


class OAuthResponseType(str, Enum):
    """OAuth response types"""
    CODE = "code"


class OAuthScope(str, Enum):
    """OAuth scopes supported"""
    PROFILE = "profile"
    EMAIL = "email"
    SUBSCRIPTION = "subscription"
    ADMIN = "admin"


# ============================================================================
# OAuth Client Models
# ============================================================================

class OAuthClientCreate(BaseModel):
    """Request model for creating an OAuth client"""
    client_name: str = Field(..., min_length=3, max_length=255, description="Client application name")
    description: Optional[str] = Field(None, max_length=1000, description="Client description")
    logo_url: Optional[str] = Field(None, max_length=500, description="Client logo URL")
    redirect_uris: List[str] = Field(..., min_items=1, description="Allowed redirect URIs")
    allowed_scopes: List[OAuthScope] = Field(
        default=[OAuthScope.PROFILE, OAuthScope.EMAIL],
        description="Scopes this client can request"
    )

    @validator('redirect_uris')
    def validate_redirect_uris(cls, v):
        """Validate redirect URIs are valid URLs"""
        for uri in v:
            if not uri.startswith(('http://', 'https://')):
                raise ValueError(f"Invalid redirect URI: {uri}")
        return v


class OAuthClient(BaseModel):
    """OAuth client model"""
    id: str
    client_id: str
    client_name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    redirect_uris: List[str]
    allowed_scopes: List[str]
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class OAuthClientWithSecret(OAuthClient):
    """OAuth client with secret (only returned on creation)"""
    client_secret: str


class OAuthClientUpdate(BaseModel):
    """Request model for updating an OAuth client"""
    client_name: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    logo_url: Optional[str] = Field(None, max_length=500)
    redirect_uris: Optional[List[str]] = None
    allowed_scopes: Optional[List[OAuthScope]] = None
    is_active: Optional[bool] = None


# ============================================================================
# OAuth Authorization Code Models
# ============================================================================

class OAuthAuthorizationRequest(BaseModel):
    """OAuth authorization request parameters"""
    client_id: str
    redirect_uri: str
    response_type: OAuthResponseType = OAuthResponseType.CODE
    scope: str  # Space-separated scopes
    state: str
    code_challenge: str
    code_challenge_method: str = "S256"

    @validator('scope')
    def validate_scope(cls, v):
        """Validate scope is not empty"""
        if not v.strip():
            raise ValueError("Scope cannot be empty")
        return v


class OAuthAuthorizationCode(BaseModel):
    """OAuth authorization code model"""
    code: str
    user_id: str
    client_id: str
    scope: List[str]
    redirect_uri: str
    code_challenge: str
    code_challenge_method: str
    issued_at: datetime
    expires_at: datetime
    used: bool = False
    used_at: Optional[datetime] = None


class OAuthAuthorizationCodeCreate(BaseModel):
    """Request to generate authorization code"""
    user_id: str
    client_id: str
    scope: str  # Space-separated
    code_challenge: str
    code_challenge_method: str = "S256"
    redirect_uri: str
    expires_in: int = 600  # 10 minutes


# ============================================================================
# OAuth Token Models
# ============================================================================

class OAuthTokenRequest(BaseModel):
    """OAuth token request (authorization code grant)"""
    grant_type: OAuthGrantType
    code: Optional[str] = None  # Required for authorization_code
    redirect_uri: Optional[str] = None  # Required for authorization_code
    client_id: str
    client_secret: str
    code_verifier: Optional[str] = None  # Required for PKCE
    refresh_token: Optional[str] = None  # Required for refresh_token grant


class OAuthTokenResponse(BaseModel):
    """OAuth token response"""
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int  # Seconds
    scope: str


class OAuthToken(BaseModel):
    """OAuth token model (stored in database)"""
    token_id: str
    user_id: str
    client_id: str
    token_type: OAuthTokenType
    token_hash: str
    scope: List[str]
    issued_at: datetime
    expires_at: datetime
    revoked: bool = False
    revoked_at: Optional[datetime] = None


class OAuthTokenValidation(BaseModel):
    """OAuth token validation result"""
    valid: bool
    user_id: Optional[str] = None
    client_id: Optional[str] = None
    scope: Optional[List[str]] = None
    expires_at: Optional[datetime] = None
    error: Optional[str] = None


# ============================================================================
# OAuth Consent Models
# ============================================================================

class OAuthConsent(BaseModel):
    """OAuth user consent model"""
    id: str
    user_id: str
    client_id: str
    scope: List[str]
    granted_at: datetime

    class Config:
        from_attributes = True


class OAuthConsentCreate(BaseModel):
    """Request to store user consent"""
    user_id: str
    client_id: str
    scope: List[str]


# ============================================================================
# API Key Models
# ============================================================================

class OAuthApiKeyCreate(BaseModel):
    """Request to create API key"""
    client_id: str
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    expires_at: Optional[datetime] = None


class OAuthApiKey(BaseModel):
    """API key model"""
    id: str
    client_id: str
    name: str
    description: Optional[str] = None
    is_active: bool = True
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class OAuthApiKeyWithSecret(OAuthApiKey):
    """API key with secret (only returned on creation)"""
    api_key: str


# ============================================================================
# User Profile Models (for external apps)
# ============================================================================

class UserProfile(BaseModel):
    """User profile for external applications"""
    id: str
    email: EmailStr
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    metadata: Optional[Dict[str, Any]] = None


# ============================================================================
# Subscription Models (for external apps)
# ============================================================================

class SubscriptionTier(str, Enum):
    """Subscription tiers"""
    FREE = "free"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, Enum):
    """Subscription status"""
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    TRIAL = "trial"
    SUSPENDED = "suspended"


class UserSubscription(BaseModel):
    """User subscription details for external applications"""
    user_id: str
    tier: SubscriptionTier
    plan: str
    status: SubscriptionStatus
    features: Dict[str, Any]
    billing_cycle: str  # "monthly" or "yearly"
    current_period_start: datetime
    current_period_end: datetime
    valid_until: datetime
    auto_renew: bool
    trial_ends_at: Optional[datetime] = None


# ============================================================================
# Rate Limits Models (for external apps)
# ============================================================================

class StorageLimits(BaseModel):
    """Storage limits"""
    limit_gb: float
    used_gb: float
    remaining_gb: float


class TemplateLimits(BaseModel):
    """Template limits"""
    limit: int
    current: int
    remaining: int


class BatchLimits(BaseModel):
    """Batch limits"""
    active_limit: int
    current_active: int


class RateLimits(BaseModel):
    """Rate limits and current usage"""
    user_id: str
    subscription_tier: SubscriptionTier
    cards_per_month: int
    current_usage: int
    remaining_cards: int
    llm_credits: int
    llm_credits_used: int
    storage: StorageLimits
    templates: TemplateLimits
    batches: BatchLimits
    reset_date: datetime
    billing_cycle: str


# ============================================================================
# User Verification Models
# ============================================================================

class UserVerificationRequest(BaseModel):
    """Request to verify user permissions"""
    application: str
    required_permissions: List[str]


class UserVerificationResponse(BaseModel):
    """User verification response"""
    user_id: str
    verified: bool
    permissions: List[str]
    has_access: bool
    reason: Optional[str] = None


# ============================================================================
# Usage Event Models
# ============================================================================

class UsageEventCreate(BaseModel):
    """Request to record usage event"""
    event: str
    quantity: int
    batch_id: Optional[str] = None
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None


class UsageEventResponse(BaseModel):
    """Usage event response"""
    event_id: str
    recorded: bool
    new_usage: int
    remaining_cards: int


# ============================================================================
# OAuth Error Models
# ============================================================================

class OAuthError(BaseModel):
    """OAuth error response"""
    error: str
    error_description: Optional[str] = None
    error_uri: Optional[str] = None
    state: Optional[str] = None


# ============================================================================
# JWKS Models
# ============================================================================

class JWK(BaseModel):
    """JSON Web Key"""
    kty: str = "RSA"
    use: str = "sig"
    kid: str
    alg: str = "RS256"
    n: str  # RSA public key modulus
    e: str  # RSA public key exponent


class JWKS(BaseModel):
    """JSON Web Key Set"""
    keys: List[JWK]


# ============================================================================
# OpenID Configuration Models
# ============================================================================

class OpenIDConfiguration(BaseModel):
    """OpenID Connect discovery document"""
    issuer: str
    authorization_endpoint: str
    token_endpoint: str
    jwks_uri: str
    response_types_supported: List[str] = ["code"]
    grant_types_supported: List[str] = ["authorization_code", "refresh_token"]
    token_endpoint_auth_methods_supported: List[str] = ["client_secret_post"]
    code_challenge_methods_supported: List[str] = ["S256"]
    scopes_supported: List[str] = ["profile", "email", "subscription"]
