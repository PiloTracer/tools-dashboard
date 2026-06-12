# Feature: Users

## Overview

Core user data management and profile operations. This feature provides the foundational user identity layer used by authentication, user management, and other features.

## User Stories

- As a user, I want to have a profile with my basic information
- As an admin, I want to view user details for support purposes
- As a system, I want to track user creation and modification timestamps

## Key Workflows

1. User registration creates a user record
2. User profile updates modify the user record
3. Admin user management queries the user record

## Security Considerations

- Passwords are stored as bcrypt hashes
- User data is synchronized with back-auth
- Role and status changes require admin privileges

## Database Schema

### PostgreSQL

- `users` table: Core identity data

## Implementation

- **back-api**: `back-api/features/users/`
- **back-auth**: `back-auth/features/users/`

## Related Features

- `user-registration` — Creates users
- `user-management` — Admin operations on users
- `user-status` — Manages user status
- `user-subscription` — Subscription data linked to users

---

**Last Updated**: June 11, 2026
