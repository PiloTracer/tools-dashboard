# User Management Feature - Implementation Plan

**Feature**: Admin User Management
**Version**: 1.0.0
**Type**: Cross-Service Feature
**Services Involved**: front-admin, back-api, back-auth, back-postgres, back-cassandra, shared
**Agent**: `.claude/agents/user-management.yaml`

---

## Overview

Implement a comprehensive user management system in the admin dashboard that allows administrators to view, edit, manage roles, and control user status across the platform.

### Current Status
- ✅ **PHASES 1-5 COMPLETE**: Feature is fully implemented and operational
- ✅ **Backend**: All services, repositories, APIs, and business logic complete
- ✅ **Frontend**: User list, search, filters, edit forms fully functional
- ✅ **Deployed**: Working at http://epicdev.com/admin/features/user-management/
- ⚠️ **Remaining**: Phase 6 (comprehensive testing) and Phase 7 (documentation)
- ⚠️ **Estimated completion for remaining work**: 1-2 development sessions

---

## Architecture

### Data Flow
```
Admin User
    ↓
front-admin (UI + Remix loaders/actions)
    ↓
back-api (business logic orchestration)
    ↓
    ├─→ back-auth (role/permission changes, session invalidation)
    └─→ back-postgres (user data CRUD)
         └─→ back-cassandra (extended profiles, audit logs)
```

### Services & Responsibilities

| Service | Responsibility | Key Files |
|---------|---------------|-----------|
| **front-admin** | Admin UI, forms, tables | `app/features/user-management/routes/*.tsx`<br>`app/features/user-management/ui/*.tsx` |
| **back-api** | Business logic, orchestration | `features/user-management/api.py`<br>`features/user-management/domain.py`<br>`features/user-management/infrastructure.py` |
| **back-auth** | Role management, permissions | `features/user-management/api.py`<br>`features/user-management/domain.py` |
| **back-postgres** | User data persistence | `repositories/user_repository.py` (enhance) |
| **back-cassandra** | Extended profiles, audit logs | `repositories/user_ext_repository.py` (enhance)<br>`repositories/audit_repository.py` (new) |
| **shared** | Models, contracts | `models/user.py`<br>`contracts/user-management/feature.yaml` |

---

## Implementation Phases

### Phase 1: Foundation & Contracts ✅ COMPLETE

**Goal**: Define shared resources and contracts
**Status**: ✅ Completed - See `.claude/plans/user-management-phase1-complete.md`

#### Tasks
1. **Shared Models** (`shared/models/user.py`)
   - [ ] Add admin-specific fields to User model
   - [ ] Create UserListResponse model (for pagination)
   - [ ] Create UserDetailResponse model
   - [ ] Create UserUpdateRequest model
   - [ ] Create UserStatusUpdateRequest model
   - [ ] Create BulkOperationRequest model

2. **Shared Contracts** (`shared/contracts/user-management/`)
   - [ ] Create `feature.yaml` with full API contract
   - [ ] Define request/response schemas
   - [ ] Document cross-service dependencies
   - [ ] Version requirements

3. **Planning Artifacts**
   - [ ] Document data models
   - [ ] Define API endpoints
   - [ ] Create database schema changes (if needed)

**Deliverables**:
- `shared/models/user.py` (enhanced)
- `shared/contracts/user-management/feature.yaml`
- Data model documentation

**Estimated Time**: 1-2 hours

---

### Phase 2: Data Layer ✅ COMPLETE

**Goal**: Implement repository methods for user management
**Status**: ✅ Completed - See `.claude/plans/user-management-phase2-complete.md`

**⚠️ NOTE**: Implemented with dual-database pattern per `.claude/plans/user-management-cassandra-addendum.md`
This addendum contains essential information about:
- Dual-database pattern (PostgreSQL + Cassandra)
- Canonical data synchronization strategy
- Cassandra schema and implementation patterns

#### Tasks

1. **PostgreSQL Repository** (`back-postgres/repositories/user_repository.py`)
   - [ ] Add `list_users()` with pagination
     - Parameters: page, page_size, search, role_filter, status_filter, sort_by, sort_order
     - Returns: list of users + total count
   - [ ] Add `search_users()` for search functionality
   - [ ] Add `get_user_by_id()` (may exist, enhance if needed)
   - [ ] Add `update_user()` for profile updates
   - [ ] Add `update_user_status()` for status changes
   - [ ] Add `bulk_update_status()` for bulk operations
   - [ ] Add `bulk_update_roles()` for bulk role changes
   - [ ] Write unit tests for all new methods

2. **Cassandra Repository** (`back-cassandra/repositories/user_ext_repository.py`)
   - [ ] Add `get_extended_profile()` for detailed user info
   - [ ] Add `get_user_activity_history()` for activity tracking
   - [ ] Enhance existing methods if needed

3. **Audit Repository** (`back-cassandra/repositories/audit_repository.py`) - NEW
   - [ ] Create `create_audit_log()` method
   - [ ] Add `get_user_audit_logs()` for user-specific logs
   - [ ] Define AuditLog model in shared/models/

**Deliverables**:
- Enhanced `user_repository.py` with search/pagination
- Enhanced `user_ext_repository.py`
- New `audit_repository.py`
- Repository unit tests

**Estimated Time**: 2-3 hours

---

### Phase 3: Authentication Layer ✅ COMPLETE

**Goal**: Implement role and permission management
**Status**: ✅ Completed - See `.claude/plans/user-management-phase3-complete.md`

#### Tasks

1. **Auth Feature** (`back-auth/features/user-management/`)
   - [ ] Create feature directory structure
   - [ ] Implement `api.py`:
     - POST `/auth/admin/users/:id/roles` - Assign role
     - DELETE `/auth/admin/users/:id/roles` - Remove role
     - POST `/auth/admin/users/:id/invalidate-sessions` - Invalidate user sessions
   - [ ] Implement `domain.py`:
     - Role validation logic
     - Permission checking
     - Session invalidation logic
   - [ ] Implement `infrastructure.py`:
     - Integration with back-postgres for role persistence
   - [ ] Create `feature.yaml` contract
   - [ ] Write unit tests
   - [ ] Write integration tests

2. **Permission Middleware**
   - [ ] Ensure admin role checking exists
   - [ ] Add specific permissions for user management
   - [ ] Test permission enforcement

**Deliverables**:
- `back-auth/features/user-management/` (complete)
- Permission enforcement tests
- Session invalidation functionality

**Estimated Time**: 2-3 hours

---

### Phase 4: Business API ✅ COMPLETE

**Goal**: Implement business logic and orchestration
**Status**: ✅ Completed - See `.claude/plans/user-management-phase4-complete.md`

#### Tasks

1. **API Feature** (`back-api/features/user-management/`)
   - [ ] Create feature directory structure
   - [ ] Implement `api.py` with endpoints:
     - GET `/api/admin/users` - List users (paginated, searchable, filterable)
     - GET `/api/admin/users/:id` - Get user details
     - PUT `/api/admin/users/:id` - Update user information
     - PATCH `/api/admin/users/:id/status` - Update user status
     - POST `/api/admin/users/:id/roles` - Assign role (delegates to back-auth)
     - POST `/api/admin/users/bulk/status` - Bulk status update
     - POST `/api/admin/users/export` - Export users to CSV

2. **Domain Logic** (`domain.py`)
   - [ ] Implement UserManagementDomain class
   - [ ] Add business validation rules:
     - Cannot change own role/status
     - Require confirmation for critical actions
     - Validate email uniqueness on update
   - [ ] Orchestrate calls to repositories and auth service
   - [ ] Implement audit logging for all operations

3. **Infrastructure** (`infrastructure.py`)
   - [ ] Create service clients for:
     - PostgresService (user_repository)
     - CassandraService (user_ext_repository, audit_repository)
     - AuthService (role management)
   - [ ] Implement retry logic and error handling

4. **Feature Contract** (`feature.yaml`)
   - [ ] Define all endpoints
   - [ ] Document dependencies
   - [ ] Version requirements

5. **Testing**
   - [ ] Unit tests for domain logic
   - [ ] Integration tests for API endpoints
   - [ ] Test permission enforcement
   - [ ] Test audit logging

**Deliverables**:
- `back-api/features/user-management/` (complete)
- Comprehensive API tests
- Audit logging implementation

**Estimated Time**: 3-4 hours

---

### Phase 5: Admin Frontend ✅ COMPLETE

**Goal**: Build comprehensive admin UI
**Status**: ✅ Completed - See `.claude/plans/user-management-phase5-complete.md`

#### Tasks

1. **UI Components** (`front-admin/app/features/user-management/ui/`)

   **Enhance UserTable.tsx**:
   - [ ] Add pagination controls
   - [ ] Add search input
   - [ ] Add filter dropdowns (role, status)
   - [ ] Add sortable columns
   - [ ] Add bulk selection checkboxes
   - [ ] Add action buttons (view, edit, delete)
   - [ ] Add status badges
   - [ ] Add role badges
   - [ ] Responsive design

   **Create UserDetailView.tsx**:
   - [ ] Display user information in sections
   - [ ] Show extended profile data
   - [ ] Display registration details
   - [ ] Show current sessions
   - [ ] Display activity history
   - [ ] Add edit button

   **Create UserEditForm.tsx**:
   - [ ] Form fields for user data
   - [ ] Email update with validation
   - [ ] Profile information fields
   - [ ] Client-side validation
   - [ ] Error handling
   - [ ] Success feedback

   **Create RoleSelector.tsx**:
   - [ ] Dropdown for role selection
   - [ ] Current role display
   - [ ] Confirmation dialog for role changes
   - [ ] Disable self-role-change

   **Create StatusToggle.tsx**:
   - [ ] Status selector (Active, Inactive, Suspended)
   - [ ] Confirmation dialog for status changes
   - [ ] Visual feedback
   - [ ] Disable self-status-change

   **Create BulkActionsToolbar.tsx**:
   - [ ] Bulk status update
   - [ ] Bulk role assignment
   - [ ] Bulk export
   - [ ] Selection counter
   - [ ] Clear selection button

   **Create SearchBar.tsx**:
   - [ ] Search input with debounce
   - [ ] Search by email, name, ID
   - [ ] Clear button

   **Create FilterPanel.tsx**:
   - [ ] Role filter dropdown
   - [ ] Status filter dropdown
   - [ ] Date range filter
   - [ ] Apply/Reset buttons

2. **Remix Routes** (`front-admin/app/features/user-management/routes/`)

   **Enhance index.tsx** (User List):
   - [ ] Implement loader:
     - Fetch users with pagination
     - Handle search query params
     - Handle filter query params
     - Handle sort query params
   - [ ] Implement actions:
     - Handle bulk operations
   - [ ] Render UserTable component
   - [ ] Render SearchBar and FilterPanel
   - [ ] Render BulkActionsToolbar
   - [ ] Error boundary

   **Create $userId.tsx** (User Detail):
   - [ ] Implement loader:
     - Fetch user details
     - Fetch extended profile
     - Fetch activity history
   - [ ] Render UserDetailView
   - [ ] Breadcrumbs navigation
   - [ ] Error boundary

   **Create $userId.edit.tsx** (Edit User):
   - [ ] Implement loader:
     - Fetch current user data
   - [ ] Implement action:
     - Handle form submission
     - Validate data
     - Call backend API
     - Handle errors
     - Redirect on success
   - [ ] Render UserEditForm
   - [ ] Render RoleSelector
   - [ ] Render StatusToggle
   - [ ] Breadcrumbs navigation
   - [ ] Error boundary

3. **Styling** (Tailwind CSS)
   - [ ] Consistent styling across all components
   - [ ] Responsive design (mobile-first)
   - [ ] Accessible color contrasts
   - [ ] Loading states
   - [ ] Error states
   - [ ] Success states

4. **i18n** (Internationalization)
   - [ ] Add translation keys for all UI text
   - [ ] Support English and Spanish (or other languages)

5. **Testing**
   - [ ] Component unit tests
   - [ ] Integration tests for routes
   - [ ] E2E tests for critical flows

**Deliverables**:
- Complete admin UI for user management
- All routes implemented
- Comprehensive frontend tests

**Estimated Time**: 4-6 hours

---

### Phase 6: Integration & Testing ⚠️ PENDING

**Goal**: Ensure all services work together correctly
**Status**: ⚠️ Not yet completed - Manual testing done, comprehensive test suite needed

#### Tasks

1. **Integration Testing**
   - [ ] Test complete user list flow (frontend → backend → database)
   - [ ] Test user detail view flow
   - [ ] Test user update flow
   - [ ] Test role assignment flow
   - [ ] Test status change flow
   - [ ] Test bulk operations flow
   - [ ] Test permission enforcement (non-admin cannot access)
   - [ ] Test self-prevention (cannot change own role/status)
   - [ ] Test session invalidation on role/status change

2. **End-to-End Testing**
   - [ ] E2E test: Admin logs in and views user list
   - [ ] E2E test: Admin searches for a user
   - [ ] E2E test: Admin filters users by role
   - [ ] E2E test: Admin views user details
   - [ ] E2E test: Admin edits user information
   - [ ] E2E test: Admin changes user role
   - [ ] E2E test: Admin changes user status
   - [ ] E2E test: Admin performs bulk status update
   - [ ] E2E test: Admin exports users to CSV

3. **Security Testing**
   - [ ] Test JWT validation on all endpoints
   - [ ] Test admin role requirement
   - [ ] Test CSRF protection
   - [ ] Test input validation
   - [ ] Test SQL injection prevention
   - [ ] Test XSS prevention

4. **Performance Testing**
   - [ ] Test pagination with large datasets
   - [ ] Test search performance
   - [ ] Test filter performance
   - [ ] Optimize slow queries

5. **Audit Verification**
   - [ ] Verify all admin actions are logged
   - [ ] Test audit log retrieval
   - [ ] Verify audit log format

**Deliverables**:
- Complete integration test suite
- E2E test suite
- Security test results
- Performance benchmarks
- Audit log verification

**Estimated Time**: 2-3 hours

---

### Phase 7: Documentation & Deployment ⚠️ PENDING

**Goal**: Document the feature and prepare for deployment
**Status**: ⚠️ Not yet completed - Basic docs exist, comprehensive user guides needed

#### Tasks

1. **Documentation**
   - [ ] Update front-admin/CLAUDE_CONTEXT.md with user-management examples
   - [ ] Update back-api/CLAUDE_CONTEXT.md with user-management patterns
   - [ ] Update back-auth/CLAUDE_CONTEXT.md with role management info
   - [ ] Create user guide for admins (how to use the feature)
   - [ ] Document API endpoints (OpenAPI/Swagger)
   - [ ] Document audit log format

2. **Deployment Preparation**
   - [ ] Create database migration scripts (if needed)
   - [ ] Update environment variables (if needed)
   - [ ] Create deployment checklist
   - [ ] Plan deployment order:
     1. Deploy shared resources
     2. Deploy back-postgres (migrations)
     3. Deploy back-cassandra (schema updates)
     4. Deploy back-auth
     5. Deploy back-api
     6. Deploy front-admin

3. **Rollback Plan**
   - [ ] Document rollback steps
   - [ ] Test rollback procedure

**Deliverables**:
- Comprehensive documentation
- Deployment plan
- Rollback plan

**Estimated Time**: 1-2 hours

---

## API Endpoints

### Backend API (back-api)

| Method | Endpoint | Description | Auth | Admin Only |
|--------|----------|-------------|------|------------|
| GET | `/api/admin/users` | List users (paginated, searchable, filterable) | ✓ | ✓ |
| GET | `/api/admin/users/:id` | Get user details | ✓ | ✓ |
| PUT | `/api/admin/users/:id` | Update user information | ✓ | ✓ |
| PATCH | `/api/admin/users/:id/status` | Update user status | ✓ | ✓ |
| POST | `/api/admin/users/:id/roles` | Assign role to user | ✓ | ✓ |
| DELETE | `/api/admin/users/:id/roles/:role` | Remove role from user | ✓ | ✓ |
| POST | `/api/admin/users/bulk/status` | Bulk status update | ✓ | ✓ |
| POST | `/api/admin/users/bulk/roles` | Bulk role assignment | ✓ | ✓ |
| POST | `/api/admin/users/export` | Export users to CSV | ✓ | ✓ |

### Query Parameters for GET `/api/admin/users`

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number | 1 |
| `page_size` | integer | Items per page | 20 |
| `search` | string | Search by email, name, or ID | - |
| `role` | string | Filter by role | - |
| `status` | string | Filter by status (active, inactive, suspended) | - |
| `sort_by` | string | Sort field (email, created_at, last_login) | created_at |
| `sort_order` | string | Sort order (asc, desc) | desc |

---

## Data Models

### UserListItem (for user listing)
```python
class UserListItem(BaseModel):
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    status: str  # active, inactive, suspended
    created_at: datetime
    last_login: Optional[datetime]
```

### UserDetail (for user detail view)
```python
class UserDetail(BaseModel):
    # Core info
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    status: str

    # Extended info
    phone: Optional[str]
    company: Optional[str]
    job_title: Optional[str]

    # Metadata
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    login_count: int

    # Activity
    recent_activity: List[ActivityLog]
    active_sessions: List[SessionInfo]
```

### UserUpdateRequest
```python
class UserUpdateRequest(BaseModel):
    email: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]
    company: Optional[str]
    job_title: Optional[str]
```

### UserStatusUpdateRequest
```python
class UserStatusUpdateRequest(BaseModel):
    status: str  # active, inactive, suspended
    reason: Optional[str]  # reason for status change
```

### AuditLog
```python
class AuditLog(BaseModel):
    id: str
    admin_id: str  # who made the change
    admin_email: str
    user_id: str  # user being changed
    action: str  # update_profile, change_role, change_status, etc.
    changes: Dict[str, Any]  # what changed
    timestamp: datetime
```

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT with admin role
2. **Authorization**: Check admin permissions on every request
3. **Self-prevention**: Admins cannot change their own role or status
4. **Audit logging**: All actions logged with admin ID and timestamp
5. **Session invalidation**: Role/status changes invalidate user sessions
6. **Input validation**: Validate all inputs on backend
7. **CSRF protection**: Use CSRF tokens for state-changing operations
8. **Rate limiting**: Admin endpoints have stricter rate limits
9. **SQL injection prevention**: Use parameterized queries
10. **XSS prevention**: Sanitize all user input in frontend

---

## Testing Strategy

### Unit Tests
- Test each service independently
- Mock cross-service dependencies
- Test business logic in domain.py
- Test UI components in isolation
- Target: 80%+ code coverage

### Integration Tests
- Test API → Repository integration
- Test Auth → API integration
- Test permission enforcement
- Test audit logging
- Target: All critical paths covered

### End-to-End Tests
- Test complete admin user flows
- Frontend → Backend → Database
- Test role-based access control
- Target: All user journeys tested

### Security Tests
- Test authentication requirements
- Test authorization checks
- Test CSRF protection
- Test input validation
- Target: All security measures verified

---

## Success Criteria

- [ ] Admins can view paginated list of users
- [ ] Admins can search users by email, name, or ID
- [ ] Admins can filter users by role and status
- [ ] Admins can view detailed user information
- [ ] Admins can edit user information
- [ ] Admins can assign/remove roles
- [ ] Admins can activate/deactivate/suspend users
- [ ] Admins can perform bulk operations
- [ ] Admins can export users to CSV
- [ ] All admin actions are audited
- [ ] Role/status changes invalidate user sessions
- [ ] Admins cannot change their own role/status
- [ ] All endpoints require admin authentication
- [ ] Frontend is responsive and accessible
- [ ] All tests pass (unit, integration, E2E)
- [ ] Documentation is complete

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Admin locks themselves out | High | Prevent self-role/status change |
| Unauthorized access | Critical | Strict permission checks on all endpoints |
| Missing audit trail | High | Comprehensive audit logging |
| Session not invalidated | Medium | Implement session invalidation on role/status change |
| Performance issues with large user lists | Medium | Implement pagination, indexing |
| Data inconsistency | Medium | Use transactions, implement retry logic |

---

## Dependencies

- Existing user authentication (back-auth)
- User repository (back-postgres)
- Extended profile repository (back-cassandra)
- Admin authentication and authorization
- Remix framework in front-admin

---

## Future Enhancements

- Advanced search with multiple criteria
- User activity analytics
- Automated user deactivation (inactivity)
- Password reset by admin
- Email notification on role/status change
- User impersonation (for support)
- Custom role creation
- Permission management (granular)
- User groups/teams
- Bulk import from CSV

---

**Plan Created**: 2025-11-13
**Last Updated**: 2025-11-13
**Status**: Ready for Implementation

---

## Important Addendum

**📖 Required Reading**: `.claude/plans/user-management-cassandra-addendum.md`

This addendum addresses critical architectural considerations:
1. **Dual-Database Pattern**: How PostgreSQL and Cassandra work together
2. **Canonical Data Sync**: Keeping denormalized data consistent
3. **Front-Public Compatibility**: Designing for future reusability

**You must read this addendum before implementing Phase 2 (Data Layer)!**
