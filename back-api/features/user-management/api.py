"""API layer for user management feature.

This module provides admin endpoints for:
- Listing users with pagination, search, filters
- Getting user details
- Updating user information
- Changing user roles
- Changing user status
- Bulk operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Any

from .domain import (
    UserManagementService,
    UserListRequest,
    UserUpdateRequest,
    UserStatusUpdateRequest,
    UserRoleUpdateRequest,
    BulkOperationRequest,
)

router = APIRouter(prefix="/admin/users", tags=["user-management"])


# ========== REQUEST/RESPONSE MODELS ==========

class UserListQueryParams(BaseModel):
    """Query parameters for user listing."""
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")
    search: str | None = Field(None, description="Search by email")
    role: str | None = Field(None, description="Filter by role")
    status: str | None = Field(None, description="Filter by status")
    sort_by: str = Field("created_at", description="Sort field")
    sort_order: str = Field("desc", description="Sort order (asc/desc)")


class UserListItemResponse(BaseModel):
    """Response model for user list item."""
    id: int
    email: str
    first_name: str | None
    last_name: str | None
    role: str
    permissions: list[str]
    is_email_verified: bool
    created_at: str
    updated_at: str
    last_login: str | None


class UserListResponse(BaseModel):
    """Response model for paginated user list."""
    users: list[UserListItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserDetailResponse(BaseModel):
    """Response model for detailed user information."""
    # Core fields
    id: int
    email: str
    role: str
    permissions: list[str]
    is_email_verified: bool
    created_at: str
    updated_at: str

    # Extended fields
    first_name: str | None
    last_name: str | None
    # Contact information
    mobile_phone: str | None
    home_phone: str | None
    work_phone: str | None
    # Address information
    address_line1: str | None
    address_line2: str | None
    city: str | None
    state_province: str | None
    postal_code: str | None
    country: str | None
    # Professional information
    company: str | None
    job_title: str | None
    department: str | None
    industry: str | None
    # Profile picture
    picture_url: str | None
    # Other details
    other_details: str | None
    # Preferences
    language: str | None
    timezone: str | None
    profile_completion_percentage: int

    # Activity fields
    last_login: str | None
    login_count: int


class UserUpdateRequestModel(BaseModel):
    """Request model for updating user."""
    email: EmailStr | None = None
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    # Contact information
    mobile_phone: str | None = Field(None, max_length=20)
    home_phone: str | None = Field(None, max_length=20)
    work_phone: str | None = Field(None, max_length=20)
    # Address information
    address_line1: str | None = Field(None, max_length=200)
    address_line2: str | None = Field(None, max_length=200)
    city: str | None = Field(None, max_length=100)
    state_province: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    country: str | None = Field(None, max_length=100)
    # Professional information
    company: str | None = Field(None, max_length=200)
    job_title: str | None = Field(None, max_length=100)
    department: str | None = Field(None, max_length=100)
    industry: str | None = Field(None, max_length=100)
    # Profile picture
    picture_url: str | None = Field(None, max_length=500)
    # Other details
    other_details: str | None = Field(None, max_length=1000)
    # Preferences
    language: str | None = Field(None, max_length=10)
    timezone: str | None = Field(None, max_length=50)


class UserStatusUpdateRequestModel(BaseModel):
    """Request model for updating user status."""
    status: str = Field(..., description="New status (active, inactive, suspended)")
    reason: str | None = Field(None, description="Reason for status change")


class UserRoleUpdateRequestModel(BaseModel):
    """Request model for updating user role."""
    role: str = Field(..., description="New role (admin, customer, moderator, support)")
    permissions: list[str] = Field(default_factory=list, description="Permissions list")
    reason: str | None = Field(None, description="Reason for role change")


class BulkOperationRequestModel(BaseModel):
    """Request model for bulk operations."""
    user_ids: list[int] = Field(..., description="List of user IDs")
    operation: str = Field(..., description="Operation type (update_status, update_role)")
    parameters: dict[str, Any] = Field(..., description="Operation parameters")


class BulkOperationResponse(BaseModel):
    """Response model for bulk operations."""
    success: bool
    users_updated: int
    operation: str


# ========== DEPENDENCIES ==========

def get_service(request: Request) -> UserManagementService:
    """Dependency that returns a UserManagementService.

    Gets repository instances from application state and creates
    a fully configured service instance.
    """
    from .infrastructure import HttpAuthServiceClient, InfrastructureRegistry
    import os

    # Get repositories from app state
    user_repo = request.app.state.user_repo
    user_ext_repo = request.app.state.user_ext_repo
    audit_repo = request.app.state.audit_repo

    # Create auth service client
    auth_service_url = os.getenv("AUTH_SERVICE_URL", "http://back-auth:8001")
    auth_client = HttpAuthServiceClient(base_url=auth_service_url)

    # Create infrastructure registry
    infra = InfrastructureRegistry(auth_service=auth_client)

    # Create and return service
    return UserManagementService(
        user_repository=user_repo,
        user_ext_repository=user_ext_repo,
        audit_repository=audit_repo,
        auth_service_client=infra,
    )


async def get_current_admin(request: Request) -> dict[str, Any]:
    """Get current admin user from request.

    This extracts the admin user from the Authorization header
    and validates admin privileges via back-auth.

    TODO: Implement proper JWT validation and admin check
    For now, returns a mock admin user for development.
    """
    # Placeholder implementation for development
    # In production, this should:
    # 1. Extract JWT from Authorization header
    # 2. Call back-auth to validate and get user
    # 3. Verify admin role
    # 4. Return user dict

    # For now, return mock admin user to allow testing
    # TODO: Uncomment this when JWT auth is implemented
    # authorization = request.headers.get("Authorization")
    # if not authorization:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Missing authorization header"
    #     )

    # Mock admin user for development
    return {
        "id": 1,
        "email": "admin@example.com",
        "role": "admin",
        "permissions": ["*"],
    }


def get_client_ip(request: Request) -> str | None:
    """Extract client IP address from request."""
    # Check X-Forwarded-For header (if behind proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    # Fall back to direct connection
    if request.client:
        return request.client.host

    return None


# ========== ENDPOINTS ==========

@router.get(
    "",
    summary="List users",
    response_model=UserListResponse,
)
async def list_users(
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    role: str | None = None,
    status: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    service: UserManagementService = Depends(get_service),
    admin: dict = Depends(get_current_admin),
) -> UserListResponse:
    """List users with pagination, search, and filters.

    **Permissions**: Requires admin role

    **Query Parameters**:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - search: Search by email
    - role: Filter by role
    - status: Filter by status
    - sort_by: Sort field (email, created_at)
    - sort_order: Sort order (asc, desc)
    """
    request = UserListRequest(
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    result = await service.list_users(request, admin)
    return UserListResponse(**result)


@router.get(
    "/{user_id}",
    summary="Get user details",
    response_model=UserDetailResponse,
)
async def get_user_detail(
    user_id: int,
    service: UserManagementService = Depends(get_service),
    admin: dict = Depends(get_current_admin),
) -> UserDetailResponse:
    """Get detailed user information.

    **Permissions**: Requires admin role

    **Returns**:
    - Complete user profile including extended fields
    """
    try:
        detail = await service.get_user_detail(user_id, admin)
        return UserDetailResponse(**detail)
    except ValueError as e:
        print(f"ERROR: Get user {user_id} failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        print(f"ERROR: Unexpected error getting user {user_id}: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.put(
    "/{user_id}",
    summary="Update user information",
    response_model=UserDetailResponse,
)
async def update_user(
    user_id: int,
    request_body: UserUpdateRequestModel,
    request: Request,
    service: UserManagementService = Depends(get_service),
    admin: dict = Depends(get_current_admin),
) -> UserDetailResponse:
    """Update user information.

    **Permissions**: Requires admin role

    **Security**:
    - Cannot update own account
    - All changes are audited
    - Email updates sync to Cassandra
    """
    update_request = UserUpdateRequest(
        email=request_body.email,
        first_name=request_body.first_name,
        last_name=request_body.last_name,
        mobile_phone=request_body.mobile_phone,
        home_phone=request_body.home_phone,
        work_phone=request_body.work_phone,
        address_line1=request_body.address_line1,
        address_line2=request_body.address_line2,
        city=request_body.city,
        state_province=request_body.state_province,
        postal_code=request_body.postal_code,
        country=request_body.country,
        company=request_body.company,
        job_title=request_body.job_title,
        department=request_body.department,
        industry=request_body.industry,
        picture_url=request_body.picture_url,
        other_details=request_body.other_details,
        language=request_body.language,
        timezone=request_body.timezone,
    )

    try:
        detail = await service.update_user(
            user_id,
            update_request,
            admin,
            ip_address=get_client_ip(request),
        )
        return UserDetailResponse(**detail)
    except ValueError as e:
        print(f"ERROR: Update user {user_id} failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        print(f"ERROR: Unexpected error updating user {user_id}: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.patch(
    "/{user_id}/role",
    summary="Update user role",
    response_model=UserDetailResponse,
)
async def update_user_role(
    user_id: int,
    request_body: UserRoleUpdateRequestModel,
    request: Request,
    service: UserManagementService = Depends(get_service),
    admin: dict = Depends(get_current_admin),
) -> UserDetailResponse:
    """Update user role and permissions.

    **Permissions**: Requires admin role

    **Security**:
    - Cannot change own role
    - Invalidates all user sessions (forces re-authentication)
    - All changes are audited

    **Side Effects**:
    - User sessions invalidated
    - User must re-authenticate to get new permissions
    """
    role_request = UserRoleUpdateRequest(
        role=request_body.role,
        permissions=request_body.permissions,
        reason=request_body.reason,
    )

    try:
        detail = await service.update_user_role(
            user_id,
            role_request,
            admin,
            ip_address=get_client_ip(request),
        )
        return UserDetailResponse(**detail)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch(
    "/{user_id}/status",
    summary="Update user status",
    response_model=UserDetailResponse,
)
async def update_user_status(
    user_id: int,
    request_body: UserStatusUpdateRequestModel,
    request: Request,
    service: UserManagementService = Depends(get_service),
    admin: dict = Depends(get_current_admin),
) -> UserDetailResponse:
    """Update user status.

    **Permissions**: Requires admin role

    **Security**:
    - Cannot change own status
    - Inactive/suspended status invalidates sessions
    - All changes are audited

    **Side Effects**:
    - If status is inactive or suspended, all user sessions are invalidated
    """
    status_request = UserStatusUpdateRequest(
        status=request_body.status,
        reason=request_body.reason,
    )

    try:
        detail = await service.update_user_status(
            user_id,
            status_request,
            admin,
            ip_address=get_client_ip(request),
        )
        return UserDetailResponse(**detail)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/bulk",
    summary="Perform bulk operations",
    response_model=BulkOperationResponse,
)
async def bulk_operation(
    request_body: BulkOperationRequestModel,
    request: Request,
    service: UserManagementService = Depends(get_service),
    admin: dict = Depends(get_current_admin),
) -> BulkOperationResponse:
    """Perform bulk operations on multiple users.

    **Permissions**: Requires admin role

    **Supported Operations**:
    - update_role: Update role for multiple users

    **Security**:
    - Cannot include own user_id in bulk operations
    - All changes are audited
    """
    bulk_request = BulkOperationRequest(
        user_ids=request_body.user_ids,
        operation=request_body.operation,
        parameters=request_body.parameters,
    )

    try:
        if bulk_request.operation == "update_role":
            result = await service.bulk_update_roles(
                bulk_request,
                admin,
                ip_address=get_client_ip(request),
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported operation: {bulk_request.operation}",
            )

        return BulkOperationResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
