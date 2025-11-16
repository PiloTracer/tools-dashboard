"""
Auto-Auth Feature - Shared Contracts

This module provides shared data models and contracts for OAuth 2.0 integration
with external applications.
"""

from .models import (
    # Enums
    OAuthGrantType,
    OAuthTokenType,
    OAuthResponseType,
    OAuthScope,
    SubscriptionTier,
    SubscriptionStatus,

    # OAuth Client Models
    OAuthClientCreate,
    OAuthClient,
    OAuthClientWithSecret,
    OAuthClientUpdate,

    # OAuth Authorization Code Models
    OAuthAuthorizationRequest,
    OAuthAuthorizationCode,
    OAuthAuthorizationCodeCreate,

    # OAuth Token Models
    OAuthTokenRequest,
    OAuthTokenResponse,
    OAuthToken,
    OAuthTokenValidation,

    # OAuth Consent Models
    OAuthConsent,
    OAuthConsentCreate,

    # API Key Models
    OAuthApiKeyCreate,
    OAuthApiKey,
    OAuthApiKeyWithSecret,

    # User Profile Models
    UserProfile,

    # Subscription Models
    UserSubscription,

    # Rate Limits Models
    RateLimits,
    StorageLimits,
    TemplateLimits,
    BatchLimits,

    # User Verification Models
    UserVerificationRequest,
    UserVerificationResponse,

    # Usage Event Models
    UsageEventCreate,
    UsageEventResponse,

    # OAuth Error Models
    OAuthError,

    # JWKS Models
    JWK,
    JWKS,

    # OpenID Configuration Models
    OpenIDConfiguration,
)

__all__ = [
    # Enums
    "OAuthGrantType",
    "OAuthTokenType",
    "OAuthResponseType",
    "OAuthScope",
    "SubscriptionTier",
    "SubscriptionStatus",

    # OAuth Client Models
    "OAuthClientCreate",
    "OAuthClient",
    "OAuthClientWithSecret",
    "OAuthClientUpdate",

    # OAuth Authorization Code Models
    "OAuthAuthorizationRequest",
    "OAuthAuthorizationCode",
    "OAuthAuthorizationCodeCreate",

    # OAuth Token Models
    "OAuthTokenRequest",
    "OAuthTokenResponse",
    "OAuthToken",
    "OAuthTokenValidation",

    # OAuth Consent Models
    "OAuthConsent",
    "OAuthConsentCreate",

    # API Key Models
    "OAuthApiKeyCreate",
    "OAuthApiKey",
    "OAuthApiKeyWithSecret",

    # User Profile Models
    "UserProfile",

    # Subscription Models
    "UserSubscription",

    # Rate Limits Models
    "RateLimits",
    "StorageLimits",
    "TemplateLimits",
    "BatchLimits",

    # User Verification Models
    "UserVerificationRequest",
    "UserVerificationResponse",

    # Usage Event Models
    "UsageEventCreate",
    "UsageEventResponse",

    # OAuth Error Models
    "OAuthError",

    # JWKS Models
    "JWK",
    "JWKS",

    # OpenID Configuration Models
    "OpenIDConfiguration",
]
