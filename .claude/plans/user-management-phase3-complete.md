# User Management - Phase 3 Complete

**Date**: 2025-11-13
**Phase**: Authentication Layer (back-auth)
**Status**: ✅ COMPLETED

---

## Summary

Phase 3 has been successfully completed. All authentication and authorization support for user management has been implemented, including session invalidation, admin permission validation, and API endpoints.

---

## Deliverables

### 1. Session Management Service (`back-auth/services/session_service.py`)

Created **2 session invalidation methods**:

#### `invalidate_user_sessions()`
- **Purpose**: Invalidate all sessions for a specific user
- **When Called**:
  - User role changed (requires re-authentication)
  - User status changed to inactive/suspended
  - Admin manually revokes access
- **Parameters**: session (AsyncSession), user_id (int)
- **Returns**: Number of sessions invalidated (int)
- **Implementation**: Uses SQLAlchemy DELETE with commit

#### `invalidate_session_by_token()`
- **Purpose**: Invalidate a specific session by token
- **Parameters**: session (AsyncSession), session_token (str)
- **Returns**: True if session was invalidated, False otherwise
- **Use Case**: Single session logout

### 2. Authentication Dependencies (`back-auth/core/dependencies.py`)

Created **3 FastAPI dependencies** for authentication and authorization:

#### `get_current_user()`
- **Purpose**: Extract and validate user from JWT token
- **Parameters**:
  - authorization (Header) - Bearer token
  - session (AsyncSession) - Database session
- **Returns**: User dict {id, email, role, permissions}
- **Raises**:
  - HTTP 401: Missing/invalid/expired token
  - HTTP 404: User not found
- **Features**:
  - Bearer token extraction
  - JWT decoding with jose library
  - Handles ExpiredSignatureError separately
  - Database user validation

#### `require_admin()`
- **Purpose**: Ensure current user has admin role
- **Depends On**: `get_current_user()`
- **Returns**: User dict if admin
- **Raises**: HTTP 403 if not admin
- **Use Case**: Protect admin-only endpoints

#### `require_permission()`
- **Purpose**: Check for specific permission
- **Parameters**: permission (str), current_user (dict)
- **Returns**: User dict if has permission
- **Permission Logic**:
  - Wildcard "*" grants all permissions
  - Specific permission check
- **Raises**: HTTP 403 if lacks permission
- **Use Case**: Granular permission control

### 3. User Management API (`back-auth/features/user-management/api.py`)

Created **3 admin endpoints**:

#### POST `/admin/users/{user_id}/invalidate-sessions`
**Purpose**: Invalidate all sessions for a user

**Request Body**:
```json
{
  "reason": "Role changed to moderator" // optional
}
```

**Response**:
```json
{
  "user_id": 123,
  "sessions_invalidated": 3,
  "reason": "Role changed to moderator"
}
```

**Security**:
- Requires admin role
- **Self-protection**: Cannot invalidate own sessions
- Returns 403 if admin tries to invalidate self

**Use Cases**:
- Called by back-api when role changes
- Called by back-api when status changes
- Called manually by admin to revoke access

#### GET `/admin/users/me/permissions`
**Purpose**: Get current admin's permissions

**Response**:
```json
{
  "user_id": 1,
  "email": "admin@example.com",
  "role": "admin",
  "permissions": ["*"]
}
```

**Use Cases**:
- Frontend determines what UI elements to show
- Frontend route guards
- Permission-based feature flags

#### POST `/admin/users/verify-admin`
**Purpose**: Verify admin credentials

**Response**:
```json
{
  "is_admin": true,
  "user_id": 1,
  "email": "admin@example.com"
}
```

**Use Cases**:
- Simple admin check
- Frontend route protection
- Pre-flight permission validation

### 4. Feature Contract (`back-auth/features/user-management/feature.yaml`)

Created comprehensive feature contract documenting:
- 3 API endpoints with full specifications
- Dependencies on core services
- Security requirements
- Use cases and integration points
- Notes on audit logging (Phase 4)

### 5. Integration with Main App (`back-auth/main.py`)

**Added**:
- `_load_user_management_router()` function
- Router registration in FastAPI app
- Follows existing pattern for hyphenated feature directories

---

## Architecture Integration

### Existing Authentication Flow (Unchanged)
```
User Login
    ↓
back-auth: email-auth or google-auth
    ↓
JWT Token Generated (access + refresh)
    ↓
Token Contains: user_id, email, role, permissions
    ↓
Frontend stores token
```

### New Admin Authorization Flow
```
Admin Request
    ↓
JWT Token in Authorization Header
    ↓
get_current_user() validates token
    ↓
require_admin() checks role
    ↓
Endpoint executes
```

### Session Invalidation Flow
```
back-api: User role/status updated
    ↓
back-api calls back-auth: POST /admin/users/{id}/invalidate-sessions
    ↓
back-auth: Deletes all sessions for user
    ↓
User's next request uses expired/invalid session
    ↓
User must re-authenticate
    ↓
New JWT generated with updated role/permissions
```

---

## Security Implementation

### JWT Token Validation
- ✅ Bearer token extraction from Authorization header
- ✅ Token decoding with jose library
- ✅ Expiration checking (ExpiredSignatureError)
- ✅ Invalid token handling (JWTError)
- ✅ User existence validation against database

### Admin Protection
- ✅ Role-based access control (require_admin)
- ✅ Permission-based access control (require_permission)
- ✅ Self-modification prevention (cannot invalidate own sessions)
- ✅ All admin endpoints protected by dependencies

### Session Security
- ✅ Complete session invalidation on role change
- ✅ Complete session invalidation on status change
- ✅ Forces re-authentication with new permissions
- ✅ Prevents use of stale permissions

---

## API Endpoint Summary

| Method | Endpoint | Auth | Admin | Purpose |
|--------|----------|------|-------|---------|
| POST | `/admin/users/{user_id}/invalidate-sessions` | ✓ | ✓ | Invalidate all user sessions |
| GET | `/admin/users/me/permissions` | ✓ | ✓ | Get current admin permissions |
| POST | `/admin/users/verify-admin` | ✓ | ✓ | Verify admin credentials |

---

## Dependencies Created

### Service Dependencies
```python
# services/session_service.py
- invalidate_user_sessions(session, user_id) -> int
- invalidate_session_by_token(session, token) -> bool
```

### Core Dependencies
```python
# core/dependencies.py
- get_current_user(authorization, session) -> dict
- require_admin(current_user) -> dict
- require_permission(permission, current_user) -> dict
```

---

## Integration Points for Phase 4 (back-api)

### How back-api Will Use back-auth

#### Example 1: Role Change
```python
# back-api/features/user-management/domain.py
async def update_user_role(user_id: int, new_role: str):
    # 1. Update role in PostgreSQL
    user = await postgres_repo.update_user_role(user_id, new_role, permissions)

    # 2. Sync to Cassandra
    await cassandra_repo.sync_canonical_data(
        user_id, user["email"], new_role, user["status"]
    )

    # 3. Invalidate sessions (THIS IS THE NEW PART)
    await back_auth_service.invalidate_user_sessions(user_id, reason="Role changed")

    # 4. Create audit log
    await cassandra_repo.create_audit_log(...)

    return user
```

#### Example 2: Status Change
```python
# back-api/features/user-management/domain.py
async def update_user_status(user_id: int, new_status: str):
    # 1. Update status in PostgreSQL
    user = await postgres_repo.update_user_status(user_id, new_status)

    # 2. Sync to Cassandra
    await cassandra_repo.sync_canonical_data(
        user_id, user["email"], user["role"], new_status
    )

    # 3. Invalidate sessions if inactive/suspended
    if new_status in ["inactive", "suspended"]:
        await back_auth_service.invalidate_user_sessions(
            user_id,
            reason=f"Status changed to {new_status}"
        )

    # 4. Create audit log
    await cassandra_repo.create_audit_log(...)

    return user
```

#### Example 3: Frontend Permission Check
```typescript
// front-admin/app/routes/users/index.tsx
export async function loader({ request }: LoaderFunctionArgs) {
  // Verify admin permissions
  const adminCheck = await fetch('http://back-auth:8101/admin/users/verify-admin', {
    headers: {
      'Authorization': `Bearer ${getToken(request)}`
    }
  });

  if (!adminCheck.ok) {
    throw redirect('/login');
  }

  // Fetch users from back-api
  const users = await fetch('http://back-api:8100/api/admin/users');
  return json({ users });
}
```

---

## Testing Considerations

### Unit Tests Needed (Future)

#### Session Service
- Test `invalidate_user_sessions()` with multiple sessions
- Test `invalidate_user_sessions()` with no sessions (returns 0)
- Test `invalidate_session_by_token()` with valid token
- Test `invalidate_session_by_token()` with invalid token

#### Dependencies
- Test `get_current_user()` with valid token
- Test `get_current_user()` with expired token
- Test `get_current_user()` with invalid token
- Test `get_current_user()` with missing header
- Test `require_admin()` with admin user
- Test `require_admin()` with non-admin user
- Test `require_permission()` with wildcard permission
- Test `require_permission()` with specific permission
- Test `require_permission()` without permission

#### API Endpoints
- Test invalidate_sessions with different user_id
- Test invalidate_sessions with self (should fail)
- Test me/permissions returns correct data
- Test verify-admin with admin user
- Test verify-admin with non-admin user (should fail)

---

## Error Handling

### HTTP Status Codes

| Code | Condition | Example |
|------|-----------|---------|
| 200 | Success | Session invalidated successfully |
| 401 | Unauthorized | Missing/invalid/expired token |
| 403 | Forbidden | Not admin or trying to invalidate own sessions |
| 404 | Not Found | User not found in database |

### Error Responses

```json
// 401 Unauthorized
{
  "detail": "Token has expired"
}

// 403 Forbidden
{
  "detail": "Admin privileges required"
}

// 403 Forbidden (self-protection)
{
  "detail": "Cannot invalidate your own sessions"
}
```

---

## Performance Considerations

### Session Invalidation
- **Database Operation**: Single DELETE query
- **Performance**: O(n) where n = number of user sessions (typically 1-3)
- **Impact**: Minimal - deletes are fast in PostgreSQL

### Token Validation
- **JWT Decoding**: In-memory operation (fast)
- **Database Lookup**: Single SELECT query by ID (indexed, fast)
- **Caching**: Could add Redis caching for user lookups (future optimization)

---

## Next Steps (Phase 4)

Phase 4 will implement the **Business API Layer (back-api)**:

1. **User Management Domain Logic**
   - Orchestrate PostgreSQL + Cassandra updates
   - Call back-auth for session invalidation
   - Implement audit logging
   - Business rule validation

2. **User Management API Endpoints**
   - List users (paginated, searchable, filterable)
   - Get user details
   - Update user information
   - Update user role (with session invalidation)
   - Update user status (with session invalidation)
   - Bulk operations

3. **Integration**
   - Connect to back-postgres repositories
   - Connect to back-cassandra repositories
   - Connect to back-auth session invalidation
   - Implement dual-database sync pattern

4. **Error Handling**
   - Graceful degradation if Cassandra fails
   - Transaction management
   - Comprehensive error messages

**Estimated Time**: 3-4 hours

---

## Files Created/Modified

### Created
- `back-auth/services/session_service.py` - Session invalidation logic
- `back-auth/core/dependencies.py` - Auth/auth dependencies
- `back-auth/features/user-management/__init__.py` - Feature module
- `back-auth/features/user-management/api.py` - API endpoints
- `back-auth/features/user-management/feature.yaml` - Feature contract
- `.claude/plans/user-management-phase3-complete.md` - This documentation

### Modified
- `back-auth/main.py` - Added user-management router registration

---

## Important Notes

### Self-Protection Mechanism
The `invalidate_sessions` endpoint prevents admins from invalidating their own sessions:
```python
if user_id == admin["id"]:
    raise HTTPException(403, "Cannot invalidate your own sessions")
```

This prevents accidental lockouts.

### Audit Logging Placeholder
The API includes TODO comments for audit logging:
```python
# TODO: Log this action to audit trail (Phase 4)
```

This will be implemented in Phase 4 when back-api integrates with Cassandra audit repository.

### Existing Authentication Unchanged
This phase **only adds new functionality**. All existing authentication flows (email-auth, google-auth, user-registration) remain unchanged and functional.

---

**Phase 3 Status**: ✅ COMPLETED
**Ready for Phase 4**: YES (Business API Layer)
**Estimated Phase 4 Time**: 3-4 hours

---

## Critical Reminders for Phase 4

1. **Always invalidate sessions**: When updating role or status, call back-auth session invalidation
2. **Always create audit logs**: Every admin action must be logged to Cassandra
3. **Always sync canonical data**: PostgreSQL updates must sync to Cassandra
4. **Use dependencies**: Import and use `require_admin` from back-auth
5. **Self-protection**: Prevent admins from modifying themselves
6. **Error handling**: Handle back-auth session invalidation failures gracefully
