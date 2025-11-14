"""Domain layer for user management feature.

This module orchestrates user management operations across multiple services:
- PostgreSQL (core user data)
- Cassandra (extended profiles, audit logs)
- back-auth (session invalidation)
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True)
class UserListRequest:
    """Request for listing users with filters."""
    page: int = 1
    page_size: int = 20
    search: str | None = None
    role: str | None = None
    status: str | None = None
    sort_by: str = "created_at"
    sort_order: str = "desc"


@dataclass(slots=True)
class UserUpdateRequest:
    """Request for updating user information."""
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    # Contact information
    mobile_phone: str | None = None
    home_phone: str | None = None
    work_phone: str | None = None
    # Address information
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state_province: str | None = None
    postal_code: str | None = None
    country: str | None = None
    # Professional information
    company: str | None = None
    job_title: str | None = None
    department: str | None = None
    industry: str | None = None
    # Profile picture
    picture_url: str | None = None
    # Other details
    other_details: str | None = None
    # Preferences
    language: str | None = None
    timezone: str | None = None


@dataclass(slots=True)
class UserStatusUpdateRequest:
    """Request for updating user status."""
    status: str  # active, inactive, suspended
    reason: str | None = None


@dataclass(slots=True)
class UserRoleUpdateRequest:
    """Request for updating user role."""
    role: str  # admin, customer, moderator, support
    permissions: list[str]
    reason: str | None = None


@dataclass(slots=True)
class BulkOperationRequest:
    """Request for bulk operations."""
    user_ids: list[int]
    operation: str  # update_status, update_role
    parameters: dict[str, Any]


class UserManagementService:
    """Coordinates user management business logic.

    This service orchestrates operations across:
    - PostgreSQL (user_repository) - Core user data
    - Cassandra (user_ext_repository) - Extended profiles
    - Cassandra (audit_repository) - Audit logs
    - back-auth (session invalidation) - Force re-authentication
    """

    def __init__(
        self,
        user_repository: Any,  # PostgreSQL UserRepository
        user_ext_repository: Any,  # Cassandra UserExtRepository
        audit_repository: Any,  # Cassandra AuditRepository
        auth_service_client: Any,  # HTTP client for back-auth
    ) -> None:
        self.user_repo = user_repository
        self.user_ext_repo = user_ext_repository
        self.audit_repo = audit_repository
        self.auth_service = auth_service_client

    async def list_users(
        self,
        request: UserListRequest,
        admin_user: dict,
    ) -> dict[str, Any]:
        """List users with pagination, search, and filters.

        Args:
            request: List request with filters
            admin_user: Current admin user (for audit)

        Returns:
            Dict with users, total, page info
        """
        # Get paginated users from PostgreSQL
        result = await self.user_repo.list_users(
            page=request.page,
            page_size=request.page_size,
            search=request.search,
            role=request.role,
            status=request.status,
            sort_by=request.sort_by,
            sort_order=request.sort_order,
        )

        # Enhance with extended profile data from Cassandra
        import uuid
        USER_ID_NAMESPACE = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')

        enhanced_users = []
        for user in result["users"]:
            # Get extended profile if available
            # Note: PostgreSQL uses integer IDs, Cassandra expects UUIDs
            # Generate deterministic UUID from integer user_id
            ext_profile = None
            try:
                user_uuid = str(uuid.uuid5(USER_ID_NAMESPACE, str(user["id"])))
                ext_profile = self.user_ext_repo.get_extended_profile(user_uuid)
            except (ValueError, Exception):
                # Extended profile doesn't exist yet
                pass

            # Merge core and extended data
            enhanced_user = {
                **user,
                "first_name": ext_profile.get("first_name") if ext_profile else None,
                "last_name": ext_profile.get("last_name") if ext_profile else None,
                "last_login": None,  # TODO: Track in sessions table
                # Convert datetime objects to ISO strings
                "created_at": user["created_at"].isoformat() if user.get("created_at") else None,
                "updated_at": user["updated_at"].isoformat() if user.get("updated_at") else None,
                # Ensure permissions is a list (PostgreSQL stores as JSON)
                "permissions": user.get("permissions", []) if isinstance(user.get("permissions"), list) else [],
            }
            enhanced_users.append(enhanced_user)

        return {
            "users": enhanced_users,
            "total": result["total"],
            "page": result["page"],
            "page_size": result["page_size"],
            "total_pages": result["total_pages"],
        }

    async def get_user_detail(
        self,
        user_id: int,
        admin_user: dict,
    ) -> dict[str, Any]:
        """Get detailed user information.

        Args:
            user_id: User ID to retrieve
            admin_user: Current admin user (for audit)

        Returns:
            Complete user detail including extended profile

        Raises:
            ValueError: If user not found
        """
        # Get core user data from PostgreSQL
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        # Get extended profile from Cassandra
        # Note: PostgreSQL uses integer IDs, Cassandra expects UUIDs
        # Generate deterministic UUID from integer user_id
        ext_profile = None
        try:
            import uuid
            USER_ID_NAMESPACE = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
            user_uuid = str(uuid.uuid5(USER_ID_NAMESPACE, str(user_id)))
            ext_profile = self.user_ext_repo.get_extended_profile(user_uuid)
        except (ValueError, Exception):
            # Extended profile doesn't exist yet
            pass

        # Merge all data
        detail = {
            # Core data (PostgreSQL)
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "permissions": user.get("permissions", []) if isinstance(user.get("permissions"), list) else [],
            "is_email_verified": user["is_email_verified"],
            "created_at": user["created_at"].isoformat() if user.get("created_at") else None,
            "updated_at": user["updated_at"].isoformat() if user.get("updated_at") else None,

            # Extended data (Cassandra)
            "first_name": ext_profile.get("first_name") if ext_profile else None,
            "last_name": ext_profile.get("last_name") if ext_profile else None,
            # Contact information
            "mobile_phone": ext_profile.get("mobile_phone") if ext_profile else None,
            "home_phone": ext_profile.get("home_phone") if ext_profile else None,
            "work_phone": ext_profile.get("work_phone") if ext_profile else None,
            # Address information
            "address_line1": ext_profile.get("address_line1") if ext_profile else None,
            "address_line2": ext_profile.get("address_line2") if ext_profile else None,
            "city": ext_profile.get("city") if ext_profile else None,
            "state_province": ext_profile.get("state_province") if ext_profile else None,
            "postal_code": ext_profile.get("postal_code") if ext_profile else None,
            "country": ext_profile.get("country") if ext_profile else None,
            # Professional information
            "company": ext_profile.get("company") if ext_profile else None,
            "job_title": ext_profile.get("job_title") if ext_profile else None,
            "department": ext_profile.get("department") if ext_profile else None,
            "industry": ext_profile.get("industry") if ext_profile else None,
            # Profile picture
            "picture_url": ext_profile.get("picture_url") if ext_profile else None,
            # Other details
            "other_details": ext_profile.get("other_details") if ext_profile else None,
            # Preferences
            "language": ext_profile.get("language") if ext_profile else None,
            "timezone": ext_profile.get("timezone") if ext_profile else None,
            "profile_completion_percentage": (ext_profile.get("profile_completion_percentage") or 0) if ext_profile else 0,

            # TODO: Add activity history, sessions
            "last_login": None,
            "login_count": 0,
        }

        return detail

    async def update_user(
        self,
        user_id: int,
        request: UserUpdateRequest,
        admin_user: dict,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        """Update user information.

        This orchestrates updates across PostgreSQL and Cassandra,
        maintaining data consistency through canonical sync.

        Args:
            user_id: User ID to update
            request: Update request with new values
            admin_user: Current admin user (for audit)
            ip_address: Admin's IP address (for audit)

        Returns:
            Updated user detail

        Raises:
            ValueError: If user not found or validation fails
        """
        # Prevent self-modification
        if user_id == admin_user["id"]:
            raise ValueError("Cannot modify your own account")

        # Track changes for audit
        changes = {}

        # 1. Update core fields in PostgreSQL (if email provided)
        if request.email is not None:
            old_user = await self.user_repo.get_user_by_id(user_id)
            if old_user:
                changes["email"] = {"old": old_user["email"], "new": request.email}

            user = await self.user_repo.update_user(user_id, email=request.email)
            if not user:
                raise ValueError(f"User {user_id} not found")

            # 2. Sync canonical data to Cassandra (only if extended profile exists)
            # Note: PostgreSQL uses integer IDs, Cassandra expects UUIDs
            # Generate deterministic UUID from integer user_id
            try:
                import uuid
                USER_ID_NAMESPACE = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
                user_uuid = str(uuid.uuid5(USER_ID_NAMESPACE, str(user_id)))

                self.user_ext_repo.sync_canonical_data(
                    user_id=user_uuid,
                    email=user["email"],
                    role=user["role"],
                    status="active",  # TODO: Use actual status when column exists
                )
            except (ValueError, Exception):
                # Extended profile doesn't exist yet
                pass

        # 3. Update extended fields in Cassandra (if provided)
        extended_fields = {}
        for field in ["first_name", "last_name",
                      "mobile_phone", "home_phone", "work_phone",
                      "address_line1", "address_line2", "city", "state_province", "postal_code", "country",
                      "company", "job_title", "department", "industry",
                      "picture_url", "other_details",
                      "language", "timezone"]:
            value = getattr(request, field, None)
            if value is not None:
                extended_fields[field] = value
                changes[field] = {"old": None, "new": value}  # TODO: Track old values

        if extended_fields:
            # Create or update extended profile in Cassandra
            # Note: For now, we'll create a UUID from the integer user_id
            # In production, consider using a mapping table or different strategy
            try:
                # First, try to get the user data to create denormalized copy
                user = await self.user_repo.get_user_by_id(user_id)
                if user:
                    # Generate a deterministic UUID from the integer user_id
                    # UUID v5 uses SHA-1 hash of a namespace and name
                    import uuid
                    # Use a custom namespace for user IDs
                    USER_ID_NAMESPACE = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
                    user_uuid = str(uuid.uuid5(USER_ID_NAMESPACE, str(user_id)))

                    # Upsert extended profile with both extended fields and denormalized data
                    self.user_ext_repo.upsert_extended_profile(
                        user_id=user_uuid,
                        extended_data=extended_fields,
                        denormalized_data={
                            "email": user["email"],
                            "role": user["role"],
                            "status": "active",  # TODO: Use actual status
                        }
                    )
            except Exception as e:
                # Log but don't fail the update if Cassandra fails
                print(f"Warning: Failed to update extended profile for user {user_id}: {e}")
                pass

        # 4. Create audit log
        try:
            import uuid
            USER_ID_NAMESPACE = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
            admin_uuid = str(uuid.uuid5(USER_ID_NAMESPACE, str(admin_user["id"])))
            user_uuid = str(uuid.uuid5(USER_ID_NAMESPACE, str(user_id)))

            self.audit_repo.create_audit_log(
                admin_id=admin_uuid,
                admin_email=admin_user["email"],
                user_id=user_uuid,
                action="update_profile",
                changes=changes,
                ip_address=ip_address,
            )
        except (ValueError, Exception) as e:
            # Audit logging is best-effort, don't fail the update
            print(f"Warning: Failed to create audit log for user {user_id}: {e}")
            pass

        # Return updated user detail
        return await self.get_user_detail(user_id, admin_user)

    async def update_user_role(
        self,
        user_id: int,
        request: UserRoleUpdateRequest,
        admin_user: dict,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        """Update user role and permissions.

        This triggers session invalidation to force re-authentication.

        Args:
            user_id: User ID to update
            request: Role update request
            admin_user: Current admin user (for audit)
            ip_address: Admin's IP address (for audit)

        Returns:
            Updated user detail

        Raises:
            ValueError: If user not found or self-modification attempted
        """
        # Prevent self-modification
        if user_id == admin_user["id"]:
            raise ValueError("Cannot change your own role")

        # Get old role for audit
        old_user = await self.user_repo.get_user_by_id(user_id)
        if not old_user:
            raise ValueError(f"User {user_id} not found")

        # 1. Update role in PostgreSQL
        user = await self.user_repo.update_user_role(
            user_id,
            request.role,
            request.permissions,
        )

        # 2. Sync canonical data to Cassandra
        self.user_ext_repo.sync_canonical_data(
            user_id=str(user_id),
            email=user["email"],
            role=request.role,
            status="active",  # TODO: Use actual status
        )

        # 3. Invalidate all user sessions (force re-authentication)
        try:
            await self.auth_service.invalidate_user_sessions(
                user_id=user_id,
                reason=request.reason or "Role changed",
            )
        except Exception as e:
            # Log error but don't fail the role update
            # Sessions will eventually expire anyway
            print(f"Warning: Failed to invalidate sessions for user {user_id}: {e}")

        # 4. Create audit log
        self.audit_repo.create_audit_log(
            admin_id=str(admin_user["id"]),
            admin_email=admin_user["email"],
            user_id=str(user_id),
            action="change_role",
            changes={
                "role": {"old": old_user["role"], "new": request.role},
                "permissions": {"old": old_user["permissions"], "new": request.permissions},
                "reason": request.reason,
            },
            ip_address=ip_address,
        )

        return await self.get_user_detail(user_id, admin_user)

    async def update_user_status(
        self,
        user_id: int,
        request: UserStatusUpdateRequest,
        admin_user: dict,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        """Update user status.

        Note: Status column doesn't exist yet in PostgreSQL schema.
        This is a placeholder implementation.

        Args:
            user_id: User ID to update
            request: Status update request
            admin_user: Current admin user (for audit)
            ip_address: Admin's IP address (for audit)

        Returns:
            Updated user detail

        Raises:
            ValueError: If user not found or self-modification attempted
        """
        # Prevent self-modification
        if user_id == admin_user["id"]:
            raise ValueError("Cannot change your own status")

        # Get user
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        # TODO: Update status in PostgreSQL when column exists
        # user = await self.user_repo.update_user_status(user_id, request.status)

        # Sync to Cassandra
        self.user_ext_repo.sync_canonical_data(
            user_id=str(user_id),
            email=user["email"],
            role=user["role"],
            status=request.status,
        )

        # Invalidate sessions if inactive or suspended
        if request.status in ["inactive", "suspended"]:
            try:
                await self.auth_service.invalidate_user_sessions(
                    user_id=user_id,
                    reason=request.reason or f"Status changed to {request.status}",
                )
            except Exception as e:
                print(f"Warning: Failed to invalidate sessions for user {user_id}: {e}")

        # Create audit log
        self.audit_repo.create_audit_log(
            admin_id=str(admin_user["id"]),
            admin_email=admin_user["email"],
            user_id=str(user_id),
            action="change_status",
            changes={
                "status": {"old": "active", "new": request.status},  # TODO: Track actual old status
                "reason": request.reason,
            },
            ip_address=ip_address,
        )

        return await self.get_user_detail(user_id, admin_user)

    async def bulk_update_roles(
        self,
        request: BulkOperationRequest,
        admin_user: dict,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        """Perform bulk role update.

        Args:
            request: Bulk operation request
            admin_user: Current admin user (for audit)
            ip_address: Admin's IP address (for audit)

        Returns:
            Result with success/failure counts
        """
        role = request.parameters.get("role")
        permissions = request.parameters.get("permissions", [])

        if not role:
            raise ValueError("Role is required for bulk role update")

        # Prevent self-modification
        if admin_user["id"] in request.user_ids:
            raise ValueError("Cannot change your own role in bulk operation")

        # Update in PostgreSQL
        count = await self.user_repo.bulk_update_roles(
            request.user_ids,
            role,
            permissions,
        )

        # Sync to Cassandra and invalidate sessions for each user
        for user_id in request.user_ids:
            user = await self.user_repo.get_user_by_id(user_id)
            if user:
                self.user_ext_repo.sync_canonical_data(
                    user_id=str(user_id),
                    email=user["email"],
                    role=role,
                    status="active",  # TODO: Use actual status
                )

                # Invalidate sessions
                try:
                    await self.auth_service.invalidate_user_sessions(
                        user_id=user_id,
                        reason="Bulk role update",
                    )
                except Exception as e:
                    print(f"Warning: Failed to invalidate sessions for user {user_id}: {e}")

        # Create audit log
        self.audit_repo.create_audit_log(
            admin_id=str(admin_user["id"]),
            admin_email=admin_user["email"],
            user_id="bulk",
            action="bulk_update_roles",
            changes={
                "user_ids": request.user_ids,
                "role": role,
                "permissions": permissions,
                "count": count,
            },
            ip_address=ip_address,
        )

        return {
            "success": True,
            "users_updated": count,
            "operation": "bulk_update_roles",
        }
