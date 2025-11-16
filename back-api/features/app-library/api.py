"""API layer for app-library feature.

This module provides endpoints for:
- Public: Listing apps, getting app details, managing preferences
- Admin: Full CRUD operations, access control, analytics
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field, UUID4
from typing import Any
from datetime import datetime, date

from shared.contracts.app_library import (
    AppCreate,
    AppUpdate,
    App,
    AppWithSecret,
    AccessMode,
    AccessRuleCreate,
    UserPreferenceUpdate,
)

from . import domain

# Routers
public_router = APIRouter(prefix="/api/app-library", tags=["app-library-public"])
admin_router = APIRouter(prefix="/api/admin", tags=["app-library-admin"])


# ========== DEPENDENCY INJECTION ==========

async def get_app_repo(request: Request) -> Any:
    """Get AppRepository from app state."""
    return request.app.state.app_repo


async def get_access_rule_repo(request: Request) -> Any:
    """Get AccessRuleRepository from app state."""
    return request.app.state.access_rule_repo


async def get_user_pref_repo(request: Request) -> Any:
    """Get UserPreferenceRepository from app state."""
    return request.app.state.user_pref_repo


async def get_audit_log_repo(request: Request) -> Any:
    """Get AuditLogRepository from app state."""
    return request.app.state.audit_log_repo


async def get_current_user(request: Request) -> dict[str, Any]:
    """Get current user from session/JWT.

    TODO: Implement actual authentication
    Returns mock user for development.
    """
    return {
        "id": 1,
        "email": "admin@example.com",
        "role": "admin",
    }


# ========== RESPONSE MODELS ==========

class AppListResponse(BaseModel):
    """Response model for app list."""
    apps: list[dict[str, Any]]
    total: int
    favorites: list[dict[str, Any]]
    recently_used: list[dict[str, Any]]


class AppDetailResponse(BaseModel):
    """Response model for app detail."""
    app: dict[str, Any]
    access_rule: dict[str, Any] | None = None
    user_preference: dict[str, Any] | None = None


class SecretRegenerateResponse(BaseModel):
    """Response model for secret regeneration."""
    client_id: str
    client_secret: str
    message: str = "Client secret regenerated successfully. Save this secret securely - it won't be shown again."


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str


# ========== PUBLIC ENDPOINTS ==========

@public_router.get("/oauth-clients", response_model=AppListResponse)
async def list_apps(
    include_inactive: bool = False,
    app_repo: Any = Depends(get_app_repo),
    access_rule_repo: Any = Depends(get_access_rule_repo),
    user_pref_repo: Any = Depends(get_user_pref_repo),
    current_user: dict = Depends(get_current_user),
):
    """List all applications available to the current user.

    Args:
        include_inactive: Include inactive apps (admin only)
        app_repo: AppRepository instance
        access_rule_repo: AccessRuleRepository instance
        user_pref_repo: UserPreferenceRepository instance
        current_user: Current authenticated user

    Returns:
        List of available apps with favorites and recently used
    """
    # Get user subscription (TODO: fetch from subscription service)
    user_subscription = {"tier": "pro"}

    result = await domain.get_available_apps(
        user_id=current_user["id"],
        app_repo=app_repo,
        access_rule_repo=access_rule_repo,
        user_pref_repo=user_pref_repo,
        user_subscription=user_subscription,
        include_inactive=include_inactive and current_user["role"] == "admin",
    )

    return result


@public_router.get("/oauth-clients/{client_id}")
async def get_app(
    client_id: str,
    app_repo: Any = Depends(get_app_repo),
    access_rule_repo: Any = Depends(get_access_rule_repo),
    user_pref_repo: Any = Depends(get_user_pref_repo),
    current_user: dict = Depends(get_current_user),
):
    """Get details of a specific application.

    Args:
        client_id: OAuth client ID
        app_repo: AppRepository instance
        access_rule_repo: AccessRuleRepository instance
        user_pref_repo: UserPreferenceRepository instance
        current_user: Current authenticated user

    Returns:
        Application details

    Raises:
        HTTPException: If app not found or user doesn't have access
    """
    # Get app
    app = await app_repo.find_by_client_id(client_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    # Check access
    user_subscription = {"tier": "pro"}
    has_access = await domain.check_user_access(
        user_id=current_user["id"],
        app_id=str(app["id"]),
        app_repo=app_repo,
        access_rule_repo=access_rule_repo,
        user_subscription=user_subscription,
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this application"
        )

    # Get user preference
    user_prefs = await user_pref_repo.find_by_user(current_user["id"])
    user_pref = next((p for p in user_prefs if p["app_client_id"] == client_id), None)

    # Get access rule (admin only)
    access_rule = None
    if current_user["role"] == "admin":
        access_rule = await access_rule_repo.find_by_app_id(str(app["id"]))

    return AppDetailResponse(
        app=app,
        access_rule=access_rule,
        user_preference=user_pref,
    )


@public_router.post("/user/app-preferences/{app_client_id}/toggle-favorite")
async def toggle_favorite(
    app_client_id: str,
    user_pref_repo: Any = Depends(get_user_pref_repo),
    current_user: dict = Depends(get_current_user),
):
    """Toggle favorite status for an application.

    Args:
        app_client_id: Application client ID
        user_pref_repo: UserPreferenceRepository instance
        current_user: Current authenticated user

    Returns:
        Updated user preference
    """
    preference = await domain.toggle_favorite(
        user_id=current_user["id"],
        app_client_id=app_client_id,
        user_pref_repo=user_pref_repo,
    )

    return preference


# ========== ADMIN ENDPOINTS ==========

@admin_router.get("/app-library")
async def list_all_apps(
    include_deleted: bool = False,
    app_repo: Any = Depends(get_app_repo),
    current_user: dict = Depends(get_current_user),
):
    """List all applications (admin view).

    Args:
        include_deleted: Include soft-deleted apps
        app_repo: AppRepository instance
        current_user: Current authenticated user (must be admin)

    Returns:
        List of all applications

    Raises:
        HTTPException: If user is not admin
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    apps = await app_repo.find_all_active(include_deleted=include_deleted)

    return {"apps": apps, "total": len(apps)}


@admin_router.post("/app-library", response_model=dict)
async def create_app(
    app_data: AppCreate,
    request: Request,
    app_repo: Any = Depends(get_app_repo),
    audit_log_repo: Any = Depends(get_audit_log_repo),
    current_user: dict = Depends(get_current_user),
):
    """Create a new application.

    Args:
        app_data: Application creation data
        request: FastAPI request (for IP/user agent)
        app_repo: AppRepository instance
        audit_log_repo: AuditLogRepository instance
        current_user: Current authenticated user (must be admin)

    Returns:
        Created application with plain text client secret (shown once)

    Raises:
        HTTPException: If user is not admin
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    app, client_secret = await domain.create_app(
        client_name=app_data.client_name,
        description=app_data.description,
        logo_url=app_data.logo_url,
        dev_url=app_data.dev_url,
        prod_url=app_data.prod_url,
        redirect_uris=app_data.redirect_uris,
        allowed_scopes=app_data.allowed_scopes,
        is_active=app_data.is_active,
        created_by=current_user["id"],
        app_repo=app_repo,
        audit_repo=audit_log_repo,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return {
        **app,
        "client_secret": client_secret,
        "message": "Application created successfully. Save the client secret securely - it won't be shown again."
    }


@admin_router.get("/app-library/{app_id}")
async def get_app_admin(
    app_id: str,
    app_repo: Any = Depends(get_app_repo),
    access_rule_repo: Any = Depends(get_access_rule_repo),
    current_user: dict = Depends(get_current_user),
):
    """Get application details (admin view).

    Args:
        app_id: Application UUID
        app_repo: AppRepository instance
        access_rule_repo: AccessRuleRepository instance
        current_user: Current authenticated user (must be admin)

    Returns:
        Application details with access rule

    Raises:
        HTTPException: If user is not admin or app not found
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    app = await app_repo.find_by_id(app_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    access_rule = await access_rule_repo.find_by_app_id(app_id)

    return AppDetailResponse(
        app=app,
        access_rule=access_rule,
    )


@admin_router.put("/app-library/{app_id}")
async def update_app(
    app_id: str,
    app_data: AppUpdate,
    request: Request,
    app_repo: Any = Depends(get_app_repo),
    audit_log_repo: Any = Depends(get_audit_log_repo),
    current_user: dict = Depends(get_current_user),
):
    """Update an application.

    Args:
        app_id: Application UUID
        app_data: Application update data
        request: FastAPI request (for IP/user agent)
        app_repo: AppRepository instance
        audit_log_repo: AuditLogRepository instance
        current_user: Current authenticated user (must be admin)

    Returns:
        Updated application

    Raises:
        HTTPException: If user is not admin or app not found
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    updated_app = await domain.update_app(
        app_id=app_id,
        client_name=app_data.client_name,
        description=app_data.description,
        logo_url=app_data.logo_url,
        dev_url=app_data.dev_url,
        prod_url=app_data.prod_url,
        redirect_uris=app_data.redirect_uris,
        allowed_scopes=app_data.allowed_scopes,
        is_active=app_data.is_active,
        performed_by=current_user["id"],
        app_repo=app_repo,
        audit_repo=audit_log_repo,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    if not updated_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    return updated_app


@admin_router.delete("/app-library/{app_id}")
async def delete_app(
    app_id: str,
    request: Request,
    app_repo: Any = Depends(get_app_repo),
    audit_log_repo: Any = Depends(get_audit_log_repo),
    current_user: dict = Depends(get_current_user),
):
    """Delete (soft delete) an application.

    Args:
        app_id: Application UUID
        request: FastAPI request (for IP/user agent)
        app_repo: AppRepository instance
        audit_log_repo: AuditLogRepository instance
        current_user: Current authenticated user (must be admin)

    Returns:
        Deleted application

    Raises:
        HTTPException: If user is not admin or app not found
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    deleted_app = await domain.delete_app(
        app_id=app_id,
        performed_by=current_user["id"],
        app_repo=app_repo,
        audit_repo=audit_log_repo,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    if not deleted_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    return deleted_app


@admin_router.patch("/app-library/{app_id}/status")
async def toggle_status(
    app_id: str,
    status_data: dict,
    request: Request,
    app_repo: Any = Depends(get_app_repo),
    audit_log_repo: Any = Depends(get_audit_log_repo),
    current_user: dict = Depends(get_current_user),
):
    """Toggle active/inactive status of an application.

    Args:
        app_id: Application UUID
        status_data: {"is_active": bool}
        request: FastAPI request (for IP/user agent)
        app_repo: AppRepository instance
        audit_log_repo: AuditLogRepository instance
        current_user: Current authenticated user (must be admin)

    Returns:
        Updated application

    Raises:
        HTTPException: If user is not admin or app not found
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    is_active = status_data.get("is_active")
    if is_active is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="is_active field is required"
        )

    updated_app = await domain.update_app(
        app_id=app_id,
        client_name=None,
        description=None,
        logo_url=None,
        dev_url=None,
        prod_url=None,
        redirect_uris=None,
        allowed_scopes=None,
        is_active=is_active,
        performed_by=current_user["id"],
        app_repo=app_repo,
        audit_repo=audit_log_repo,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    if not updated_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    return updated_app


@admin_router.post("/app-library/{app_id}/regenerate-secret", response_model=SecretRegenerateResponse)
async def regenerate_secret(
    app_id: str,
    request: Request,
    app_repo: Any = Depends(get_app_repo),
    audit_log_repo: Any = Depends(get_audit_log_repo),
    current_user: dict = Depends(get_current_user),
):
    """Regenerate client secret for an application.

    Args:
        app_id: Application UUID
        request: FastAPI request (for IP/user agent)
        app_repo: AppRepository instance
        audit_log_repo: AuditLogRepository instance
        current_user: Current authenticated user (must be admin)

    Returns:
        Client ID and new secret (shown once)

    Raises:
        HTTPException: If user is not admin or app not found
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    result = await domain.regenerate_secret(
        app_id=app_id,
        performed_by=current_user["id"],
        app_repo=app_repo,
        audit_repo=audit_log_repo,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    client_id, new_secret = result

    return SecretRegenerateResponse(
        client_id=client_id,
        client_secret=new_secret,
    )


@admin_router.post("/app-library/{app_id}/access")
async def update_access_control(
    app_id: str,
    access_data: AccessRuleCreate,
    request: Request,
    access_rule_repo: Any = Depends(get_access_rule_repo),
    audit_log_repo: Any = Depends(get_audit_log_repo),
    current_user: dict = Depends(get_current_user),
):
    """Update access control rules for an application.

    Args:
        app_id: Application UUID
        access_data: Access rule data
        request: FastAPI request (for IP/user agent)
        access_rule_repo: AccessRuleRepository instance
        audit_log_repo: AuditLogRepository instance
        current_user: Current authenticated user (must be admin)

    Returns:
        Updated access rule

    Raises:
        HTTPException: If user is not admin
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    access_rule = await domain.update_access_control(
        app_id=app_id,
        mode=access_data.mode.value,
        user_ids=access_data.user_ids,
        subscription_tiers=[tier.value for tier in access_data.subscription_tiers] if access_data.subscription_tiers else None,
        performed_by=current_user["id"],
        access_rule_repo=access_rule_repo,
        audit_repo=audit_log_repo,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return access_rule


@admin_router.get("/app-library/{app_id}/usage")
async def get_usage_stats(
    app_id: str,
    start_date: date | None = None,
    end_date: date | None = None,
    app_repo: Any = Depends(get_app_repo),
    current_user: dict = Depends(get_current_user),
):
    """Get usage statistics for an application.

    Args:
        app_id: Application UUID
        start_date: Start date for statistics (optional)
        end_date: End date for statistics (optional)
        app_repo: AppRepository instance
        current_user: Current authenticated user (must be admin)

    Returns:
        Usage statistics

    Raises:
        HTTPException: If user is not admin or app not found
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    app = await app_repo.find_by_id(app_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    # TODO: Query Cassandra for usage stats
    # For now, return mock data
    return {
        "app_id": app_id,
        "app_name": app["client_name"],
        "total_users": 0,
        "total_launches": 0,
        "daily_stats": [],
    }


@admin_router.get("/app-library/{app_id}/audit-log")
async def get_audit_log(
    app_id: str,
    limit: int = 50,
    offset: int = 0,
    audit_log_repo: Any = Depends(get_audit_log_repo),
    current_user: dict = Depends(get_current_user),
):
    """Get audit log for an application.

    Args:
        app_id: Application UUID
        limit: Maximum number of logs to return
        offset: Offset for pagination
        audit_log_repo: AuditLogRepository instance
        current_user: Current authenticated user (must be admin)

    Returns:
        Audit log entries

    Raises:
        HTTPException: If user is not admin
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    logs = await audit_log_repo.find_by_app(app_id, limit=limit, offset=offset)
    total = await audit_log_repo.count_by_app(app_id)

    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# Export routers
__all__ = ["public_router", "admin_router"]
