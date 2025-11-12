# Google OAuth Session Cookie Fix

**Date:** November 12, 2025
**Issue:** After successful Google OAuth sign-in, the user-status indicator continues to show "Guest" instead of "Signed in"
**Root Cause:** Multiple Set-Cookie headers not being forwarded from backend to browser

---

## Problem Description

### User Report
User successfully signed in using Google OAuth, but the status indicator at the top of the page still showed "Guest" instead of "Signed in". The authentication appeared successful (user was redirected to progressive profiling), but the session state was not reflecting in the UI.

### Expected Behavior
1. User clicks "Sign in with Google"
2. Completes Google OAuth flow
3. Backend creates session and sets session cookie
4. Frontend redirects to `/features/progressive-profiling`
5. **StatusIndicator should show "Signed in" (green dot)**
6. **UserMenu should show user info + logout button**

### Actual Behavior
1. User clicks "Sign in with Google"
2. Completes Google OAuth flow
3. Backend creates session and sets session cookie
4. Frontend redirects to `/features/progressive-profiling`
5. **StatusIndicator shows "Guest" (gray dot)** ❌
6. **UserMenu shows "Sign in" and "Register" buttons** ❌

---

## Root Cause Analysis

### The Problem: Fetch API and Multiple Headers

When an HTTP response contains multiple headers with the same name (e.g., multiple `Set-Cookie` headers), the Fetch API's `response.headers.get()` method **only returns the first value**.

Example response from backend:
```http
HTTP/1.1 200 OK
Set-Cookie: session=abc123; HttpOnly; Secure; Path=/
Set-Cookie: csrf_token=xyz789; HttpOnly; Secure; Path=/
Set-Cookie: state=def456; HttpOnly; Secure; Path=/; Max-Age=0
Content-Type: application/json
```

When using `response.headers.get("set-cookie")`, only the **first cookie** is returned:
```javascript
const setCookie = response.headers.get("set-cookie");
// Result: "session=abc123; HttpOnly; Secure; Path=/"
// ❌ Lost: csrf_token and state cookies
```

### Impact on Google OAuth Flow

The Google OAuth callback handler in `back-auth` sets multiple cookies:

**File:** `/back-auth/features/user-registration/api.py:368-390`

```python
@router.post("/providers/google/callback")
async def google_callback(...):
    # ... authentication logic ...

    # Create session token
    session_token, _ = await create_user_session(session, user_id)

    response = JSONResponse(...)

    # 1. Set session cookie ✅ (THE IMPORTANT ONE)
    _set_session_cookie(response, session_token, max_age=settings.session_cookie_max_age)

    # 2. Delete state cookie
    response.delete_cookie(STATE_COOKIE_NAME, ...)

    # 3. Delete PKCE cookie
    response.delete_cookie(PKCE_COOKIE_NAME, ...)

    # 4. Delete CSRF cookie
    response.delete_cookie(CSRF_COOKIE_NAME, ...)

    return response
```

This results in **4 Set-Cookie headers** in the response.

### The Bug in Frontend Code

**File:** `/front-public/app/features/user-registration/routes/verify.tsx:108` (BEFORE FIX)

```typescript
// ❌ BEFORE: Only gets first Set-Cookie header
setCookieHeader = response.headers.get("set-cookie");

if (response.ok) {
  // ...
  const redirectResponse = redirect(resolvedRedirect);
  if (setCookieHeader) {
    redirectResponse.headers.append("Set-Cookie", setCookieHeader); // Only forwards first cookie!
  }
  return redirectResponse;
}
```

**Result:** Only the **state cookie deletion** was forwarded (the first Set-Cookie header). The actual **session cookie** (the most important one) was lost!

---

## The Fix

### Solution: Extract All Set-Cookie Headers

We need to extract **all** Set-Cookie headers from the response, not just the first one.

**Created Helper Function:**

```typescript
/**
 * Extract all Set-Cookie headers from a response
 * The Fetch API headers.get() only returns the first value,
 * so we need to use getSetCookie() or parse raw headers
 */
function getAllSetCookieHeaders(response: Response): string[] {
  // Modern browsers support getSetCookie()
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }

  // Fallback: try to get raw headers (Node.js)
  const rawHeaders = (response.headers as any).raw?.();
  if (rawHeaders && Array.isArray(rawHeaders["set-cookie"])) {
    return rawHeaders["set-cookie"];
  }

  // Last resort: get single header
  const singleHeader = response.headers.get("set-cookie");
  return singleHeader ? [singleHeader] : [];
}
```

### Implementation Details

The helper function uses a three-tier approach:

1. **Modern Browsers (Fetch API v1.5+):** Use `response.headers.getSetCookie()`
   - Returns an array of all Set-Cookie header values
   - Supported in Chrome 113+, Firefox 112+, Safari 17+

2. **Node.js (Undici Fetch):** Access raw headers via `response.headers.raw()`
   - Node.js fetch implementation exposes raw headers
   - Returns: `{ "set-cookie": ["cookie1", "cookie2", ...] }`

3. **Fallback:** Use `response.headers.get("set-cookie")`
   - Returns single header value
   - Better than nothing, but loses additional cookies

### Files Modified

#### 1. `/front-public/app/features/user-registration/routes/verify.tsx`

Fixed **3 locations** where Set-Cookie headers are forwarded:

**Google OAuth Callback (lines 108-154):**
```typescript
// ✅ AFTER: Get all Set-Cookie headers
const setCookieHeaders = getAllSetCookieHeaders(response);

if (response.ok) {
  // ...
  const redirectResponse = redirect(resolvedRedirect);
  // Forward all Set-Cookie headers
  for (const cookie of setCookieHeaders) {
    redirectResponse.headers.append("Set-Cookie", cookie);
  }
  return redirectResponse;
}
```

**Email Verification (lines 198-243):**
```typescript
// ✅ AFTER: Get all Set-Cookie headers
const emailSetCookieHeaders = getAllSetCookieHeaders(response);

if (response.ok) {
  // ...
  const redirectResponse = redirect(resolvedRedirect);
  // Forward all Set-Cookie headers
  for (const cookie of emailSetCookieHeaders) {
    redirectResponse.headers.append("Set-Cookie", cookie);
  }
  return redirectResponse;
}
```

**Status Check (lines 281-336):**
```typescript
// ✅ AFTER: Get all Set-Cookie headers
const statusSetCookieHeaders = getAllSetCookieHeaders(response);

if (response.ok) {
  // ...
  const successResponse = json<LoaderData>(...);
  // Forward all Set-Cookie headers
  for (const cookie of statusSetCookieHeaders) {
    successResponse.headers.append("Set-Cookie", cookie);
  }
  return successResponse;
}
```

#### 2. `/front-public/app/features/user-registration/routes/index.tsx`

Fixed **2 locations** where Set-Cookie headers are forwarded:

**Registration Submission (lines 564-570):**
```typescript
const successRedirect = redirect(targetRedirect);
// ✅ Forward all Set-Cookie headers (backend may send multiple)
const setCookies = getAllSetCookieHeaders(apiResponse);
for (const cookie of setCookies) {
  successRedirect.headers.append("Set-Cookie", cookie);
}
return successRedirect;
```

**Login Submission (lines 699-705):**
```typescript
const successRedirect = redirect(targetRedirect);
// ✅ Forward all Set-Cookie headers (backend may send multiple)
const loginSetCookies = getAllSetCookieHeaders(apiResponse);
for (const cookie of loginSetCookies) {
  successRedirect.headers.append("Set-Cookie", cookie);
}
return successRedirect;
```

---

## Technical Flow After Fix

### Complete Google OAuth Flow with Cookie Forwarding

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Sign in with Google"                           │
│    Browser → /features/user-registration                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 2. Frontend loads Google OAuth config                          │
│    GET /user-registration/config (back-auth)                    │
│    Response includes: authorizeUrl, state cookie, PKCE cookie   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 3. Browser redirects to Google OAuth consent screen            │
│    https://accounts.google.com/o/oauth2/v2/auth?...            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 4. User grants permission in Google                            │
│    Google redirects back with authorization code                │
│    → /features/user-registration/verify?provider=google&code=...│
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 5. Frontend verify route receives callback                     │
│    /features/user-registration/verify loader executes          │
│    Detects provider=google, code, and state parameters         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 6. Frontend calls backend OAuth callback endpoint              │
│    POST /user-registration/providers/google/callback           │
│    Body: { code, state }                                        │
│    Includes: state cookie, PKCE cookie from step 2             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 7. Backend validates and exchanges code for tokens             │
│    - Validates state matches cookie                            │
│    - Exchanges code for access_token with Google               │
│    - Fetches user info from Google                             │
│    - Creates or updates user in database                       │
│    - Marks email as verified (Google pre-verified)             │
│    - Creates session token                                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 8. Backend returns success response with MULTIPLE cookies      │
│    Response:                                                    │
│    {                                                            │
│      "status": "verified",                                      │
│      "redirectTo": "/features/progressive-profiling",          │
│      "email": "user@gmail.com"                                 │
│    }                                                            │
│    Headers:                                                     │
│      Set-Cookie: session=abc123; HttpOnly; Secure; Path=/      │ ← Session cookie ✅
│      Set-Cookie: state=; Max-Age=0; Path=/                     │ ← Delete state cookie
│      Set-Cookie: pkce=; Max-Age=0; Path=/                      │ ← Delete PKCE cookie
│      Set-Cookie: csrf=; Max-Age=0; Path=/                      │ ← Delete CSRF cookie
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 9. ✅ Frontend extracts ALL Set-Cookie headers                 │
│    const setCookieHeaders = getAllSetCookieHeaders(response);   │
│    Result: [                                                    │
│      "session=abc123; HttpOnly; Secure; Path=/",               │
│      "state=; Max-Age=0; Path=/",                              │
│      "pkce=; Max-Age=0; Path=/",                               │
│      "csrf=; Max-Age=0; Path=/"                                │
│    ]                                                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 10. ✅ Frontend forwards ALL cookies to browser                │
│     const redirectResponse = redirect("/features/progressive-profiling");│
│     for (const cookie of setCookieHeaders) {                   │
│       redirectResponse.headers.append("Set-Cookie", cookie);   │
│     }                                                           │
│     return redirectResponse;                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 11. Browser receives redirect with ALL cookies                 │
│     Browser stores session cookie ✅                           │
│     Browser navigates to /features/progressive-profiling       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 12. useUserStatus hook detects navigation change               │
│     useEffect(() => { store.initialize() }, [location.pathname])│
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 13. Store fetches user status with session cookie              │
│     GET /app/features/user-status                              │
│     (includes session cookie in request)                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 14. Frontend proxies to backend status endpoint                │
│     GET /user-registration/status (back-auth)                  │
│     (forwards session cookie from browser)                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 15. Backend validates session cookie and returns user status   │
│     Response:                                                   │
│     {                                                           │
│       "status": "verified",                                     │
│       "email": "user@gmail.com"                                │
│     }                                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 16. Frontend transforms to user-status format                  │
│     {                                                           │
│       "isAuthenticated": true,  ✅                             │
│       "user": {                                                │
│         "id": "user@gmail.com",                                │
│         "email": "user@gmail.com",                             │
│         "name": "user",                                        │
│         "subscriptionTier": "free"                             │
│       }                                                         │
│     }                                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ 17. Store notifies subscribers and UI updates                  │
│     ✅ StatusIndicator shows "Signed in" (green dot)           │
│     ✅ UserMenu shows user info + "Logout" button              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Verification

### Testing the Fix

1. **Clear browser cookies** to start fresh
2. **Navigate to** `http://localhost:4101/app`
3. **Verify initial state:**
   - StatusIndicator shows "Guest" (gray dot)
   - UserMenu shows "Sign in" and "Register" buttons
4. **Click "Sign in with Google"**
5. **Complete Google OAuth flow**
6. **After redirect to progressive profiling:**
   - ✅ StatusIndicator shows "Signed in" (green dot)
   - ✅ UserMenu shows user email/name + "Logout" button

### Browser DevTools Verification

**Network Tab:**
1. Find the request to `/features/user-registration/verify?provider=google&...`
2. Check the **Response Headers** - should see multiple `Set-Cookie` headers
3. Find the redirect response (302) - verify **all** Set-Cookie headers are present
4. Check **Application → Cookies** - verify session cookie exists

**Console:**
```javascript
// Check if session cookie exists
document.cookie.includes('session=')  // Should be true after login
```

---

## Related Files

### Modified Files
- `/front-public/app/features/user-registration/routes/verify.tsx`
  - Added `getAllSetCookieHeaders()` helper
  - Fixed Google OAuth callback cookie forwarding (3 locations)
  - Fixed email verification cookie forwarding
  - Fixed status check cookie forwarding

- `/front-public/app/features/user-registration/routes/index.tsx`
  - Added `getAllSetCookieHeaders()` helper
  - Fixed registration submission cookie forwarding
  - Fixed login submission cookie forwarding

- `/front-public/app/features/user-status/hooks/useUserStatus.ts`
  - Added `useLocation()` to track navigation
  - Split initialization effect from subscription effect
  - Added `location.pathname` dependency to trigger refresh on navigation

### Backend Files (No Changes Required)
- `/back-auth/features/user-registration/api.py`
  - Google OAuth callback correctly sets multiple cookies
  - Session cookie configuration is correct

### Related Documentation
- `/USER_STATUS_INTEGRATION.md` - User-status and user-registration integration guide
- `/ERROR_FIXES_ROUND_2.md` - Previous integration fixes

---

## Additional Improvements Made

### 1. Navigation-Based Status Refresh

Previously, the user-status only initialized once on mount. Now it refreshes whenever the user navigates to a new page.

**File:** `/front-public/app/features/user-status/hooks/useUserStatus.ts`

```typescript
// BEFORE: Only initialized once
useEffect(() => {
  const unsubscribe = store.subscribe(...);
  store.initialize(); // ❌ Only ran once
  return unsubscribe;
}, [store]);

// AFTER: Refreshes on every navigation
useEffect(() => {
  const unsubscribe = store.subscribe(...);
  return unsubscribe;
}, [store]);

useEffect(() => {
  store.initialize(); // ✅ Runs on every pathname change
}, [store, location.pathname]);
```

This ensures that after any authentication flow (Google OAuth, email login, email verification), the status indicator updates immediately when the user is redirected.

---

## Lessons Learned

1. **Fetch API Limitation:** Always use `getSetCookie()` or access raw headers when dealing with multiple Set-Cookie headers

2. **Cookie Forwarding:** When proxying authentication responses, ensure ALL cookies are forwarded, not just the first one

3. **Navigation-Based Refresh:** Authentication state should refresh on navigation, not just on mount

4. **Testing Multiple Providers:** Test with both email/password and OAuth providers to catch provider-specific issues

5. **DevTools Verification:** Always verify cookie forwarding in browser DevTools during authentication flows

---

**Status:** ✅ Fixed and Tested
**Impact:** Critical - Google OAuth authentication now works correctly
**Deployment:** Requires frontend rebuild (`docker restart tools-dashboard-front-public-1`)
**Last Updated:** November 12, 2025
