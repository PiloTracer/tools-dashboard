# User-Status & User-Registration Integration

**Date:** November 12, 2025
**Purpose:** Document the integration between user-registration (authentication) and user-status (session state management) features

---

## Overview

The `user-status` feature provides real-time authentication state management throughout the application. It integrates with the `user-registration` feature to automatically update the UI after successful sign-in.

## Architecture

### Components

1. **user-registration** (Authentication)
   - Handles Google OAuth and email/password authentication
   - Sets session cookies on successful login
   - Redirects to `/features/progressive-profiling` after authentication

2. **user-status** (Session State Management)
   - Tracks authentication state globally
   - Displays status indicator ("Signed in" / "Guest")
   - Provides user menu with login/logout actions
   - Automatically refreshes on navigation

### Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User visits /features/user-registration?mode=login           │
│    StatusIndicator shows: "Guest"                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 2. User submits login form (email + password)                   │
│    POST /user-registration/login (back-auth)                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 3. Backend validates credentials                                │
│    - Checks email/password against database                     │
│    - Sets session cookie if valid                               │
│    - Returns { status: "authenticated", redirectTo: "..." }     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 4. Frontend receives response and redirects                     │
│    redirect("/features/progressive-profiling")                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 5. Navigation triggers useUserStatus hook refresh               │
│    useEffect(() => { store.initialize() }, [location.pathname]) │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 6. Store fetches status from backend                            │
│    GET /features/user-status → GET /user-registration/status    │
│    (includes session cookie in request)                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 7. Backend reads session cookie and returns user data           │
│    { status: "verified", email: "user@example.com", ... }       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 8. Frontend transforms response to user-status format           │
│    { isAuthenticated: true, user: { email, name, ... } }        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 9. Store notifies subscribers (StatusIndicator, UserMenu)       │
│    StatusIndicator shows: "Signed in"                           │
│    UserMenu shows: User info + Logout button                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Implementation Details

### 1. User-Registration Login Flow

**File:** `/front-public/app/features/user-registration/routes/index.tsx`

```typescript
async function handleLoginSubmission(request: Request, formData: FormData): Promise<Response> {
  // ... validation ...

  // Call backend auth service
  const apiResponse = await fetch(loginUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });

  if (apiResponse.ok) {
    // Backend sets session cookie
    const successRedirect = redirect("/features/progressive-profiling");
    const setCookie = apiResponse.headers.get("set-cookie");
    if (setCookie) {
      successRedirect.headers.append("Set-Cookie", setCookie); // ✅ Cookie forwarded to browser
    }
    return successRedirect;
  }
}
```

**Key Points:**
- Backend auth service (`back-auth`) validates credentials
- On success, backend sets session cookie and returns success response
- Frontend proxies the `Set-Cookie` header to the browser
- Browser stores cookie automatically for subsequent requests

---

### 2. User-Status Hook with Navigation Refresh

**File:** `/front-public/app/features/user-status/hooks/useUserStatus.ts`

```typescript
import { useLocation } from "@remix-run/react";

export function useUserStatus() {
  const store = getUserStatusStore();
  const location = useLocation(); // ✅ Track navigation
  const [state, setState] = useState<UserStatusState>(store.getState());

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, [store]);

  // Initialize/refresh status when location changes
  // ✅ This ensures status updates after login redirects
  useEffect(() => {
    store.initialize(); // Fetches /features/user-status
  }, [store, location.pathname]); // Re-run when pathname changes

  return { isAuthenticated, user, ... };
}
```

**Key Points:**
- Separated subscription effect from initialization effect
- `location.pathname` dependency triggers reinitialization on navigation
- After login redirect, pathname changes from `/features/user-registration` to `/features/progressive-profiling`
- Hook detects change and calls `store.initialize()` to fetch fresh status

**Previous Implementation (Bug):**
```typescript
useEffect(() => {
  const unsubscribe = store.subscribe(...);
  store.initialize(); // ❌ Only ran once on mount
  return unsubscribe;
}, [store]); // ❌ Never re-ran (store is singleton)
```

---

### 3. User-Status Store Initialization

**File:** `/front-public/app/features/user-status/store/userStatusStore.ts`

```typescript
async initialize(): Promise<void> {
  this.updateState({ isLoading: true });

  try {
    const response = await fetch("/app/features/user-status", {
      method: "GET",
      credentials: "include", // ✅ Send cookies with request
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data: UserStatusResponse = await response.json();
        this.updateState({
          isAuthenticated: data.isAuthenticated, // ✅ Updates UI state
          user: data.user,
          navigation: data.navigation || DEFAULT_NAVIGATION_STATE,
          isLoading: false,
        });
      }
    } else {
      this.clearAuthentication();
    }
  } catch (error) {
    console.error("Failed to initialize user status:", error);
    this.clearAuthentication();
  }
}
```

**Key Points:**
- Fetches status from `/app/features/user-status` (resource route)
- Includes credentials (cookies) in request
- Validates response is JSON (not HTML)
- Updates store state and notifies all subscribers

---

### 4. User-Status API Route (Proxy)

**File:** `/front-public/app/features/user-status/routes/index.tsx`

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const { backAuthBaseUrl } = getBackAuthEnv();
  const statusUrl = new URL("/user-registration/status", backAuthBaseUrl);
  const cookieHeader = request.headers.get("cookie"); // ✅ Get cookies from request

  const response = await fetch(statusUrl, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}), // ✅ Forward cookies to backend
    },
  });

  const data = await response.json();

  // Transform backend response to user-status format
  const userStatus = {
    isAuthenticated: data.status === "verified", // ✅ Map backend status
    user: data.status === "verified" && data.email
      ? {
          id: data.email,
          email: data.email,
          name: data.email.split("@")[0],
          subscriptionTier: "free",
          features: [],
        }
      : null,
    navigation: { currentLocation: "/app", ... },
  };

  return json(userStatus);
}

// ✅ No default export = resource route (JSON only, no HTML)
```

**Key Points:**
- Resource route pattern (no default export)
- Proxies to `back-auth` service
- Forwards session cookies from client to backend
- Transforms backend response to frontend format
- Returns JSON only (never HTML)

---

### 5. Backend Status Endpoint

**File:** `/back-auth/features/user-registration/api.py`

```python
@router.get("/status")
async def registration_status(request: Request, session: AsyncSession):
    settings = get_settings()
    session_token = request.cookies.get(settings.session_cookie_name) # ✅ Read cookie

    if not session_token:
        return StatusResponse(status="pending", message="No active session")

    user_row = await find_user_by_session(session, session_token)
    if not user_row:
        return StatusResponse(status="pending", message="No user in session")

    status_value = "verified" if user_row["is_email_verified"] else "pending"
    return StatusResponse(
        status=status_value, # ✅ "verified" = authenticated
        email=user_row["email"],
        message="Account verified" if status_value == "verified" else "Awaiting verification",
    )
```

**Key Points:**
- Reads session cookie from request
- Validates session token against database
- Returns `status: "verified"` for authenticated users
- Returns `status: "pending"` for unauthenticated or unverified users

---

## Status Indicator Display Logic

**File:** `/front-public/app/features/user-status/ui/StatusIndicator.tsx`

```typescript
export const StatusIndicator: FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, isLoading } = useUserStatus();

  const status = isLoading
    ? "unknown"
    : isAuthenticated && user
    ? "authenticated"  // ✅ Shows "Signed in"
    : !isAuthenticated && user?.email
    ? "pending"        // Shows "Pending verification"
    : "anonymous";     // ✅ Shows "Guest"

  const statusColors = {
    authenticated: "bg-green-500",  // Green dot
    pending: "bg-yellow-500",       // Yellow dot
    unknown: "bg-gray-500",         // Gray dot
    anonymous: "bg-gray-500",       // Gray dot
  };

  const statusLabels = {
    authenticated: t("header.session.signedIn"),       // "Signed in"
    pending: t("header.session.pendingVerification"),  // "Pending verification"
    unknown: t("header.session.statusUnknown"),        // "Status unknown"
    anonymous: t("header.session.guest"),              // "Guest"
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      <span className="text-sm text-gray-700">{statusLabels[status]}</span>
    </div>
  );
};
```

**Status Mapping:**
- `isAuthenticated: true` + `user` exists → **"Signed in"** (green dot)
- `isAuthenticated: false` + `user?.email` exists → **"Pending verification"** (yellow dot)
- `isAuthenticated: false` + no user → **"Guest"** (gray dot)
- `isLoading: true` → **"Status unknown"** (gray dot)

---

## User Menu Display Logic

**File:** `/front-public/app/features/user-status/ui/UserMenu.tsx`

```typescript
export const UserMenu: FC<UserMenuProps> = ({ basePath }) => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useUserStatus();

  if (isAuthenticated && user) {
    // ✅ Authenticated: Show user info + logout
    return (
      <div className="auth-links">
        <div className="user-info">
          {user.avatar && <img src={user.avatar} alt={user.name} />}
          <div>
            <div>{user.name}</div>
            <div>{user.subscriptionTier}</div>
          </div>
        </div>
        <Form method="post" action={`${basePath}/features/user-logout`}>
          <button type="submit">{t("header.actions.logout")}</button>
        </Form>
      </div>
    );
  }

  // ✅ Not authenticated: Show login + register buttons
  return (
    <div className="auth-links">
      <NavLink to={`${basePath}/features/user-registration?mode=login`}>
        {t("header.actions.signIn")}
      </NavLink>
      <NavLink to={`${basePath}/features/user-registration`}>
        {t("header.actions.register")}
      </NavLink>
    </div>
  );
};
```

---

## Testing the Integration

### 1. Initial State (Not Authenticated)

```bash
# Test user-status endpoint without authentication
curl -s http://localhost:4101/app/features/user-status

# Expected response:
{
  "isAuthenticated": false,
  "user": null,
  "navigation": {
    "currentLocation": "/app",
    "nextLocation": null,
    "previousLocation": null
  },
  "timestamp": 1762924459838
}
```

**UI State:**
- StatusIndicator shows: **"Guest"** (gray dot)
- UserMenu shows: **"Sign in"** and **"Register"** buttons

### 2. After Successful Login

**User Action:**
1. Navigate to `/app/features/user-registration?mode=login`
2. Enter valid email and password
3. Submit form
4. Backend validates and redirects to `/app/features/progressive-profiling`

**Expected Behavior:**
1. Browser navigates to new URL
2. `useUserStatus` hook detects `location.pathname` change
3. Hook calls `store.initialize()`
4. Store fetches `/app/features/user-status` (with session cookie)
5. Backend reads cookie and returns:
```json
{
  "isAuthenticated": true,
  "user": {
    "id": "user@example.com",
    "email": "user@example.com",
    "name": "user",
    "subscriptionTier": "free",
    "features": []
  },
  "navigation": { ... },
  "timestamp": 1762924500000
}
```
6. Store updates state and notifies components
7. StatusIndicator shows: **"Signed in"** (green dot)
8. UserMenu shows: **User info + "Logout"** button

### 3. Session Persistence

**Browser Refresh:**
- Session cookie persists
- `useUserStatus` initializes on mount
- Fetches status from backend (with cookie)
- StatusIndicator remains **"Signed in"**

**New Browser Tab:**
- Same behavior as refresh
- Cookie shared across tabs (same origin)

---

## Troubleshooting

### Issue: StatusIndicator shows "Guest" after successful login

**Possible Causes:**
1. **Hook not refreshing on navigation**
   - ✅ Fixed: Added `location.pathname` dependency to initialization effect
   - Verify: Check browser DevTools Network tab for `/features/user-status` request after redirect

2. **Session cookie not set**
   - Check: Backend logs for cookie creation
   - Check: Browser DevTools Application → Cookies for session cookie
   - Verify: `user-registration` routes forward `Set-Cookie` header

3. **Backend not returning authenticated status**
   - Check: Backend `/user-registration/status` endpoint response
   - Verify: Session token in database matches cookie value

4. **Frontend not transforming response correctly**
   - Check: `/features/user-status` resource route transformation logic
   - Verify: `data.status === "verified"` maps to `isAuthenticated: true`

### Issue: StatusIndicator flickers between states

**Cause:** Multiple rapid initializations on navigation

**Solution:** Consider debouncing or adding a minimum loading time

### Issue: Logout doesn't update StatusIndicator

**Cause:** Logout action not clearing store state

**Solution:** Verify `/features/user-logout` route calls `store.clearAuthentication()`

---

## Future Enhancements

1. **Real User IDs**: Currently using email as ID, should use actual user ID from backend
2. **User Name**: Currently extracting from email, should fetch from user profile
3. **Subscription Tier**: Currently hardcoded as "free", should fetch from subscription service
4. **Features Array**: Should populate from backend user permissions
5. **Avatar Support**: Add avatar URL from user profile
6. **Optimistic Updates**: Update UI immediately on logout without waiting for server
7. **Error Handling**: Better error messages for network failures
8. **Offline Support**: Graceful degradation when backend is unavailable

---

## Related Files

### Frontend
- `/front-public/app/features/user-status/hooks/useUserStatus.ts` - Main hook with navigation refresh
- `/front-public/app/features/user-status/store/userStatusStore.ts` - State management
- `/front-public/app/features/user-status/routes/index.tsx` - API proxy resource route
- `/front-public/app/features/user-status/ui/StatusIndicator.tsx` - Status display component
- `/front-public/app/features/user-status/ui/UserMenu.tsx` - User menu component
- `/front-public/app/features/user-registration/routes/index.tsx` - Login/registration handler
- `/front-public/app/components/layout/PublicLayout.tsx` - Layout integration

### Backend
- `/back-auth/features/user-registration/api.py` - Authentication endpoints
- `/back-auth/core/database.py` - User database models

### Contracts
- `/shared/contracts/user-status/feature.yaml` - Shared contract
- `/front-public/app/features/user-status/feature.yaml` - Frontend feature definition

### Documentation
- `/ERROR_FIXES_ROUND_2.md` - Previous integration fixes
- `/USER_STATUS_INTEGRATION.md` - This document

---

**Status:** ✅ Integration Complete
**Last Updated:** November 12, 2025
**Tested:** Yes - All components working correctly
