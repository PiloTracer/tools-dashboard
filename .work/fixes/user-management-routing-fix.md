# User Management Routing Fix

**Date**: 2025-11-14
**Issue**: User management links were routing to incorrect URLs
**Status**: ✅ RESOLVED

## Problem

The user-management feature navigation links were missing the `/admin` prefix, causing incorrect routing:

- **Incorrect**: `http://epicdev.com/features/user-management`
- **Correct**: `http://epicdev.com/admin/features/user-management`

This affected:
1. AdminLayout.tsx sidebar navigation
2. admin._index.tsx dashboard links (3 instances)

## Root Cause

The Remix route file structure follows a naming convention where:
- File: `admin.features.user-management._index.tsx`
- Maps to URL: `/admin/features/user-management`

However, the `<Link>` components in the UI were hardcoded with `/features/user-management` (missing the `/admin` prefix).

## Solution

Updated all navigation links to include the full `/admin/features/` prefix to match the Remix route structure and nginx proxy configuration.

### Files Modified

1. **front-admin/app/components/layout/AdminLayout.tsx**
   - Line 11: Changed `to: "/features/user-management"` → `to: "/admin/features/user-management"`
   - Line 24: Changed `to: "/features/task-scheduler"` → `to: "/admin/features/task-scheduler"`

2. **front-admin/app/routes/admin._index.tsx**
   - Line 90: Changed `<Link to="/features/user-management">` → `<Link to="/admin/features/user-management">`
   - Line 93: Changed `<Link to="/features/task-scheduler">` → `<Link to="/admin/features/task-scheduler">`
   - Line 116: Changed `<Link to="/features/user-management">` → `<Link to="/admin/features/user-management">`
   - Line 125: Changed `<Link to="/features/task-scheduler">` → `<Link to="/admin/features/task-scheduler">`

## Architecture Context

### Nginx Routing (infra/nginx/default.conf)

```nginx
location /admin/ {
    proxy_pass http://front-admin:3000/admin/;
    # Routes all /admin/* requests to front-admin
}
```

### Remix Route Mapping

Remix uses file-based routing where the file path determines the URL:

| Route File | URL Path |
|------------|----------|
| `admin.features.user-management._index.tsx` | `/admin/features/user-management` |
| `admin.features.user-management.$userId.tsx` | `/admin/features/user-management/:userId` |
| `admin.features.admin-signin.tsx` | `/admin/features/admin-signin` |

### Key Principle

**All admin feature links must include the `/admin` prefix to match both:**
1. The Remix route file naming convention (`admin.features.*`)
2. The nginx proxy configuration (`location /admin/`)

## Verification

After the fix, all links now correctly route to:
- ✅ `http://epicdev.com/admin/features/user-management` - User list page
- ✅ `http://epicdev.com/admin/features/user-management/{userId}` - User edit page

## Additional Fixes Applied

While fixing routing, also resolved:

1. **API URL Path**: Changed `/api/admin/users` → `/admin/users` (removed `/api` prefix)
2. **API Port**: Changed `back-api:8100` → `back-api:8000` (correct port)

## Prevention Guidelines

When creating new admin features:

1. ✅ **Route files** should follow the pattern: `admin.features.{feature-name}.tsx`
2. ✅ **Links** must use full path: `/admin/features/{feature-name}`
3. ✅ **Never** use relative paths like `/features/` - always include `/admin/`
4. ✅ **Verify** links match the route file naming structure

## Related Features

Other admin features that follow this pattern correctly:
- `/admin/features/admin-signin` ✅

## Testing

Confirmed working:
- Sidebar navigation links
- Dashboard card links
- CTA button links
- Edit page back navigation
- User table view links

All routing now works correctly across the admin interface.
