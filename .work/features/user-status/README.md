# Feature: User Status

## Overview

User Status manages user account states throughout their lifecycle:
- **Active**: Normal user account
- **Inactive**: User hasn't logged in for 90 days
- **Suspended**: Admin-suspended account
- **Deleted**: Soft-deleted account (data retained)
- **Archived**: Account archived by user request

## User Stories

### Users
- As a user, I want to see my account status
- As a user, I want to reactivate my inactive account
- As a user, I want to request account deletion

### Admins
- As an admin, I want to change user status
- As an admin, I want to suspend accounts
- As an admin, I want to reactivate accounts

## Key Workflows

### Auto-Deactivate
1. User hasn't logged in for 90 days
2. System automatically sets status to inactive
3. User receives email notification
4. User can reactivate by logging in

### Admin Suspension
1. Admin navigates to user
2. Admin changes status to suspended
3. User cannot log in
4. User receives email notification
5. Admin can reactivate when needed

---

Last Updated: November 28, 2025
