"""
Auto-Auth Feature - API Layer (back-api)
Public API endpoints for external applications and admin management.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status, Depends, Header
from pydantic import BaseModel, Field

# Import shared contracts
import sys
import importlib
from pathlib import Path
# Shared directory is mounted at /app/shared in the container
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "shared"))

# Import from module with hyphen using importlib
_auto_auth_contracts = importlib.import_module("contracts.auto-auth")
OAuthClientCreate = _auto_auth_contracts.OAuthClientCreate
OAuthClient = _auto_auth_contracts.OAuthClient
OAuthClientWithSecret = _auto_auth_contracts.OAuthClientWithSecret
OAuthClientUpdate = _auto_auth_contracts.OAuthClientUpdate
UserProfile = _auto_auth_contracts.UserProfile
UserSubscription = _auto_auth_contracts.UserSubscription
RateLimits = _auto_auth_contracts.RateLimits
UserVerificationRequest = _auto_auth_contracts.UserVerificationRequest
UserVerificationResponse = _auto_auth_contracts.UserVerificationResponse
UsageEventCreate = _auto_auth_contracts.UsageEventCreate
UsageEventResponse = _auto_auth_contracts.UsageEventResponse
OAuthApiKeyCreate = _auto_auth_contracts.OAuthApiKeyCreate
OAuthApiKey = _auto_auth_contracts.OAuthApiKey
OAuthApiKeyWithSecret = _auto_auth_contracts.OAuthApiKeyWithSecret

from .infrastructure import OAuthClientInfrastructure
from .domain import OAuthClientDomain


router = APIRouter(prefix="/api", tags=["auto-auth"])


# ============================================================================
# Dependency Injection
# ============================================================================

async def get_oauth_domain() -> OAuthClientDomain:
    """Get OAuth domain service.

    Returns:
        OAuthClientDomain instance
    """
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker

    # Import global database manager
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from database import db_manager

    # Use shared SQLAlchemy engine
    async_session_factory = sessionmaker(
        db_manager.sqlalchemy_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session_factory() as session:
        infra = OAuthClientInfrastructure(session)
        yield OAuthClientDomain(infra)


async def verify_api_key(
    authorization: str = Header(...),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> dict:
    """Verify API key from Authorization header.

    Args:
        authorization: Authorization header (Bearer <api_key>)
        domain: OAuth domain service

    Returns:
        Client data

    Raises:
        HTTPException 401: If API key is invalid
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )

    api_key = authorization.replace("Bearer ", "")
    client = await domain.validate_api_key(api_key)

    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired API key",
        )

    return client


async def verify_admin(
    # TODO: Implement actual admin verification
    # For now, allow all requests
) -> dict:
    """Verify admin user.

    Returns:
        Admin user data
    """
    return {"id": 1, "role": "admin"}


# ============================================================================
# External App API Endpoints (API Key Authentication)
# ============================================================================

@router.get(
    "/users/{user_id}",
    response_model=UserProfile,
    summary="Get user profile",
    description="Get user profile for external applications (requires API key)",
)
async def get_user_profile(
    user_id: int,
    client: dict = Depends(verify_api_key),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> UserProfile:
    """Get user profile.

    Args:
        user_id: User ID
        client: Authenticated client
        domain: OAuth domain service

    Returns:
        User profile data

    Raises:
        HTTPException 404: If user not found
    """
    profile = await domain.get_user_profile(user_id)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserProfile(**profile)


@router.get(
    "/users/{user_id}/subscription",
    response_model=UserSubscription,
    summary="Get user subscription",
    description="Get user subscription details (requires API key)",
)
async def get_user_subscription(
    user_id: int,
    client: dict = Depends(verify_api_key),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> UserSubscription:
    """Get user subscription.

    Args:
        user_id: User ID
        client: Authenticated client
        domain: OAuth domain service

    Returns:
        Subscription data

    Raises:
        HTTPException 403: If no active subscription
    """
    subscription = await domain.get_user_subscription(user_id)

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active subscription",
        )

    return UserSubscription(**subscription)


@router.get(
    "/users/{user_id}/limits",
    response_model=RateLimits,
    summary="Get user rate limits",
    description="Get user rate limits and current usage (requires API key)",
)
async def get_user_limits(
    user_id: int,
    client: dict = Depends(verify_api_key),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> RateLimits:
    """Get user rate limits.

    Args:
        user_id: User ID
        client: Authenticated client
        domain: OAuth domain service

    Returns:
        Rate limits data
    """
    limits = await domain.get_user_limits(user_id)
    return RateLimits(**limits)


@router.post(
    "/users/{user_id}/verify",
    response_model=UserVerificationResponse,
    summary="Verify user permissions",
    description="Verify user has required permissions (requires API key)",
)
async def verify_user_permissions(
    user_id: int,
    request: UserVerificationRequest,
    client: dict = Depends(verify_api_key),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> UserVerificationResponse:
    """Verify user permissions.

    Args:
        user_id: User ID
        request: Verification request
        client: Authenticated client
        domain: OAuth domain service

    Returns:
        Verification result
    """
    result = await domain.verify_user_permissions(
        user_id, request.required_permissions
    )
    return UserVerificationResponse(**result)


@router.post(
    "/users/{user_id}/usage",
    response_model=UsageEventResponse,
    summary="Record usage event",
    description="Record usage event for billing (requires API key)",
)
async def record_usage_event(
    user_id: int,
    request: UsageEventCreate,
    client: dict = Depends(verify_api_key),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> UsageEventResponse:
    """Record usage event.

    Args:
        user_id: User ID
        request: Usage event data
        client: Authenticated client
        domain: OAuth domain service

    Returns:
        Usage event response
    """
    result = await domain.record_usage_event(
        user_id=user_id,
        client_id=client["client_id"],
        event_type=request.event,
        quantity=request.quantity,
        metadata=request.metadata,
    )
    return UsageEventResponse(**result)


# ============================================================================
# OAuth Client Management (Admin Authentication)
# ============================================================================

@router.post(
    "/oauth-clients",
    response_model=OAuthClientWithSecret,
    summary="Register OAuth client",
    description="Register new OAuth client (admin only)",
    status_code=status.HTTP_201_CREATED,
)
async def create_oauth_client(
    request: OAuthClientCreate,
    admin: dict = Depends(verify_admin),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> OAuthClientWithSecret:
    """Register OAuth client.

    Args:
        request: Client creation request
        admin: Admin user
        domain: OAuth domain service

    Returns:
        Client data with client_secret (shown only once!)
    """
    client = await domain.register_oauth_client(
        client_name=request.client_name,
        redirect_uris=request.redirect_uris,
        allowed_scopes=[scope.value for scope in request.allowed_scopes],
        description=request.description,
        logo_url=request.logo_url,
        created_by=admin.get("id"),
    )

    return OAuthClientWithSecret(**client)


@router.get(
    "/oauth-clients/{client_id}",
    response_model=OAuthClient,
    summary="Get OAuth client",
    description="Get OAuth client details (admin only)",
)
async def get_oauth_client(
    client_id: str,
    admin: dict = Depends(verify_admin),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> OAuthClient:
    """Get OAuth client.

    Args:
        client_id: Client identifier
        admin: Admin user
        domain: OAuth domain service

    Returns:
        Client data

    Raises:
        HTTPException 404: If client not found
    """
    client = await domain.get_oauth_client(client_id)

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OAuth client not found",
        )

    return OAuthClient(**client)


@router.get(
    "/oauth-clients",
    response_model=list[OAuthClient],
    summary="List OAuth clients",
    description="List all OAuth clients (admin only)",
)
async def list_oauth_clients(
    admin: dict = Depends(verify_admin),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> list[OAuthClient]:
    """List OAuth clients.

    Args:
        admin: Admin user
        domain: OAuth domain service

    Returns:
        List of clients
    """
    clients = await domain.list_oauth_clients()
    return [OAuthClient(**client) for client in clients]


@router.put(
    "/oauth-clients/{client_id}",
    response_model=OAuthClient,
    summary="Update OAuth client",
    description="Update OAuth client (admin only)",
)
async def update_oauth_client(
    client_id: str,
    request: OAuthClientUpdate,
    admin: dict = Depends(verify_admin),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> OAuthClient:
    """Update OAuth client.

    Args:
        client_id: Client identifier
        request: Update request
        admin: Admin user
        domain: OAuth domain service

    Returns:
        Updated client data

    Raises:
        HTTPException 404: If client not found
    """
    updates = request.dict(exclude_unset=True)

    # Convert scopes to strings
    if "allowed_scopes" in updates:
        updates["allowed_scopes"] = [scope.value for scope in updates["allowed_scopes"]]

    client = await domain.update_oauth_client(client_id, updates)

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OAuth client not found",
        )

    return OAuthClient(**client)


@router.delete(
    "/oauth-clients/{client_id}",
    summary="Delete OAuth client",
    description="Delete OAuth client (admin only)",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_oauth_client(
    client_id: str,
    admin: dict = Depends(verify_admin),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> None:
    """Delete OAuth client.

    Args:
        client_id: Client identifier
        admin: Admin user
        domain: OAuth domain service

    Raises:
        HTTPException 404: If client not found
    """
    deleted = await domain.delete_oauth_client(client_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OAuth client not found",
        )


# ============================================================================
# API Key Management (Admin Authentication)
# ============================================================================

@router.post(
    "/api-keys",
    response_model=OAuthApiKeyWithSecret,
    summary="Generate API key",
    description="Generate API key for external app (admin only)",
    status_code=status.HTTP_201_CREATED,
)
async def create_api_key(
    request: OAuthApiKeyCreate,
    admin: dict = Depends(verify_admin),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> OAuthApiKeyWithSecret:
    """Generate API key.

    Args:
        request: API key creation request
        admin: Admin user
        domain: OAuth domain service

    Returns:
        API key data with key (shown only once!)
    """
    key = await domain.generate_api_key(
        client_id=request.client_id,
        name=request.name,
        description=request.description,
        expires_at=request.expires_at,
        created_by=admin.get("id"),
    )

    return OAuthApiKeyWithSecret(**key)


@router.get(
    "/api-keys",
    response_model=list[OAuthApiKey],
    summary="List API keys",
    description="List all API keys (admin only)",
)
async def list_api_keys(
    admin: dict = Depends(verify_admin),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> list[OAuthApiKey]:
    """List API keys.

    Args:
        admin: Admin user
        domain: OAuth domain service

    Returns:
        List of API keys
    """
    keys = await domain.list_api_keys()
    return [OAuthApiKey(**key) for key in keys]


@router.delete(
    "/api-keys/{key_id}",
    summary="Revoke API key",
    description="Revoke API key (admin only)",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def revoke_api_key(
    key_id: UUID,
    admin: dict = Depends(verify_admin),
    domain: OAuthClientDomain = Depends(get_oauth_domain),
) -> None:
    """Revoke API key.

    Args:
        key_id: API key UUID
        admin: Admin user
        domain: OAuth domain service

    Raises:
        HTTPException 404: If key not found
    """
    revoked = await domain.revoke_api_key(key_id)

    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )
