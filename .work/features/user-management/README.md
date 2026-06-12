# Feature: User Management

## Overview

User Management provides administrative functionality for managing user accounts, roles, permissions, and account status. This includes:
- User listing and search
- User profile editing
- Role and permission management
- Account status control (active, inactive, suspended)
- Audit logging of all changes
- Bulk operations

This is a critical admin feature for platform governance.

## User Stories

### Admin Users
- As an admin, I want to view all users with filtering and pagination
- As an admin, I want to search for users by email or name
- As an admin, I want to update user profile information
- As an admin, I want to change user roles and permissions
- As an admin, I want to activate/deactivate user accounts
- As an admin, I want to see audit logs of all changes
- As an admin, I want to perform bulk operations on multiple users
- As an admin, I want to prevent self-modification

### Super Admins
- As a super admin, I want to manage admin accounts
- As a super admin, I want to restore deleted accounts
- As a super admin, I want to view all audit trails

## Key Workflows

### User Listing and Search
1. Admin navigates to user management
2. Admin filters by role, status, or searches by email
3. System returns paginated results
4. Admin can sort by various columns

### User Profile Update
1. Admin selects a user
2. Admin edits profile fields (name, email, etc.)
3. System validates changes
4. Changes are saved to both PostgreSQL and Cassandra
5. Audit log entry is created

### Role Change
1. Admin selects a user
2. Admin changes user role
3. System invalidates user sessions (forces re-login with new permissions)
4. All changes are audited
5. User sees new permissions on next session

## Key Features

- **User Listing**: Paginated, searchable, filterable list
- **Profile Management**: Edit user information
- **Role Management**: Assign and revoke roles
- **Status Control**: Active, inactive, suspended states
- **Audit Trail**: Complete history of changes
- **Bulk Operations**: Apply changes to multiple users
- **Self-Prevention**: Admins cannot modify their own accounts
- **Dual Database Sync**: PostgreSQL to Cassandra synchronization

## Technical Requirements

### Services Involved
- **front-admin**: Admin dashboard UI
- **back-api**: User management endpoints, business logic
- **back-auth**: Session invalidation on role changes
- **back-postgres**: Primary user data storage
- **back-cassandra**: Extended profiles, audit logs

### Security Considerations
- **Admin Only**: All endpoints require admin role
- **Self-Modification Prevention**: Cannot change own account
- **Session Invalidation**: Role changes force re-authentication
- **Audit Trail**: All operations logged with admin ID
- **Dual Sync**: Ensures data consistency
- **Graceful Degradation**: Works without back-auth if needed

### Dependencies
- PostgreSQL (primary storage)
- Cassandra (audit logs, extended data)
- back-auth (session management)

## Performance Targets
- User listing load: < 2s (20 users per page)
- User update: < 500ms
- Bulk operation: < 5s for 100 users

## Known Limitations
- Status column doesn't exist in PostgreSQL yet (placeholder)
- Bulk status updates not yet implemented
- Soft deletes not yet implemented
- No user export functionality yet

## Testing Strategy

### Unit Tests
- User validation logic
- Role permission checking
- Self-modification prevention

### Integration Tests
- Database sync (PostgreSQL to Cassandra)
- Session invalidation on role change
- Audit log creation

### E2E Tests
- Full user update workflow
- Role change with session invalidation
- Search and filtering

---

Last Updated: November 28, 2025
