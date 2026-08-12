"""Pydantic models for client-app role (appsuper / appglobal) endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AppRoleHolder(BaseModel):
    """Effective role holder for an app (per-app or all-apps scope)."""

    id: str
    user_id: int
    email: str
    role: str
    scope: str  # "per_app" | "all_apps"
    app_id: str | None = None
    granted_by: int | None = None
    created_at: datetime | None = None


class AppRoleHolderListResponse(BaseModel):
    """Response model for the effective holders of an app."""

    app_id: str
    holders: list[AppRoleHolder]
    total: int


class UserAppRoleAssignment(BaseModel):
    """One role assignment of a user (appsuper rows carry app info)."""

    id: str
    user_id: int
    role: str
    scope: str  # "per_app" | "all_apps"
    app_id: str | None = None
    app_client_id: str | None = None
    app_name: str | None = None
    granted_by: int | None = None
    created_at: datetime | None = None


class UserAppRoleListResponse(BaseModel):
    """Response model for a user's client-app role assignments."""

    user_id: int
    assignments: list[UserAppRoleAssignment]
    total: int
