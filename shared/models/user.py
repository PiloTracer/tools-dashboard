"""Shared user models."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass(slots=True)
class User:
    """Core user model."""
    id: str
    email: str
    status: str  # 'active' | 'inactive' | 'suspended'
    role: str  # 'admin' | 'customer' | 'moderator' | 'support'
    permissions: list[str]  # ['users.read', 'users.write', '*']
    created_at: str
    updated_at: str


@dataclass(slots=True)
class UserListItem:
    """User model for paginated list display (admin)."""
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    status: str
    created_at: datetime
    last_login: Optional[datetime]


@dataclass(slots=True)
class UserDetail:
    """Detailed user model with extended information (admin)."""
    # Core info
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    status: str

    # Extended info (from Cassandra)
    phone: Optional[str]
    company: Optional[str]
    job_title: Optional[str]
    department: Optional[str]
    industry: Optional[str]

    # Preferences
    language: Optional[str]
    timezone: Optional[str]

    # Metadata
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    login_count: int
    profile_completion_percentage: Optional[int]


@dataclass(slots=True)
class UserUpdateRequest:
    """Request model for updating user information."""
    # Core fields (PostgreSQL)
    email: Optional[str] = None

    # Extended fields (Cassandra)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    industry: Optional[str] = None

    # Preferences
    language: Optional[str] = None
    timezone: Optional[str] = None


@dataclass(slots=True)
class UserStatusUpdateRequest:
    """Request model for updating user status."""
    status: str  # 'active' | 'inactive' | 'suspended'
    reason: Optional[str] = None


@dataclass(slots=True)
class UserRoleUpdateRequest:
    """Request model for updating user role."""
    role: str  # 'admin' | 'customer' | 'moderator' | 'support'
    reason: Optional[str] = None


@dataclass(slots=True)
class BulkOperationRequest:
    """Request model for bulk operations."""
    user_ids: list[str]
    operation: str  # 'update_status' | 'update_role' | 'export'
    parameters: dict  # Operation-specific parameters


@dataclass(slots=True)
class UserListResponse:
    """Response model for paginated user list."""
    users: list[UserListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


@dataclass(slots=True)
class ActivityLog:
    """User activity log entry."""
    id: str
    user_id: str
    action: str
    timestamp: datetime
    ip_address: Optional[str]
    user_agent: Optional[str]


@dataclass(slots=True)
class SessionInfo:
    """Active session information."""
    session_id: str
    created_at: datetime
    last_active: datetime
    ip_address: str
    user_agent: str


@dataclass(slots=True)
class AuditLog:
    """Audit log for admin actions."""
    id: str
    admin_id: str
    admin_email: str
    user_id: str
    action: str  # 'update_profile' | 'change_role' | 'change_status' | etc.
    changes: dict  # What changed
    timestamp: datetime
    ip_address: Optional[str]
