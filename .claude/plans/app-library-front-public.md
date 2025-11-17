# App Library - Front Public Implementation Plan

**Feature:** Application Library with OAuth Integration
**Component:** front-public
**Status:** Planning
**Created:** 2025-11-16
**Owner:** Engineering Team

---

## Table of Contents

1. [Overview](#overview)
2. [User Stories](#user-stories)
3. [Responsibility Matrix](#responsibility-matrix)
4. [Technical Architecture](#technical-architecture)
5. [Implementation Tasks](#implementation-tasks)
6. [OAuth Flow Details](#oauth-flow-details)
7. [Remote Application Integration Guide](#remote-application-integration-guide)
8. [Testing Strategy](#testing-strategy)
9. [Success Criteria](#success-criteria)

---

## Overview

### Current State
After user authentication, users are redirected to:
```
http://epicdev.com/app/features/progressive-profiling
```

### Target State
After user authentication, users should be redirected to:
```
http://epicdev.com/app/features/app-library
```

### Goal
Enable seamless OAuth-based integration between the tools-dashboard platform and external applications (starting with E-Cards), allowing users to launch external apps with automatic authentication.

### Integration Status
- ✅ OAuth Server (back-auth) - Implemented
- ✅ OAuth Database Schema - Implemented
- ✅ E-Cards OAuth Client - Implemented (following OAUTH_IMPLEMENTATION_GUIDE.md)
- ⏳ App Library Frontend (front-public) - **TO BE IMPLEMENTED**
- ⏳ OAuth Launch Flow - **TO BE IMPLEMENTED**

---

## User Stories

### User Story 1: Successful OAuth Authentication Flow

```gherkin
Feature: Launch External Application with OAuth

Scenario: User successfully authenticates to external application
  Given I am an authenticated user on the tools-dashboard platform
  When I navigate to the application library
  Then I should see all available applications displayed as cards

  When I click on an application card (e.g., "E-Cards")
  Then I should be redirected to the remote application with OAuth parameters
  And the redirect URL should include:
    - client_id (application identifier)
    - redirect_uri (callback URL)
    - scope (requested permissions)
    - code_challenge (PKCE security parameter)
    - state (CSRF protection token)

  When I arrive at the remote application
  Then I should see the application interface
  And I should see a "Sign In with Tools Dashboard" button

  When I click "Sign In with Tools Dashboard"
  Then I should be redirected to the OAuth authorization endpoint
  And I should see the consent screen (if first time)

  When I approve the authorization (or skip if previously approved)
  Then I should be redirected back to the remote application with an authorization code
  And the remote application should exchange the code for an access token
  And I should be logged into the remote application
  And I should be able to use the application according to my subscription and rate limits
```

**Acceptance Criteria:**
- AC1.1: Application library displays as default landing page after authentication
- AC1.2: All available applications are shown in a responsive grid layout
- AC1.3: Each application card displays: logo, name, description, launch button
- AC1.4: Clicking "Launch App" initiates OAuth redirect with proper parameters
- AC1.5: OAuth redirect includes valid PKCE code_challenge
- AC1.6: OAuth redirect includes state parameter for CSRF protection
- AC1.7: Remote application receives all required OAuth parameters
- AC1.8: User can complete OAuth flow and access remote application
- AC1.9: User's subscription tier and rate limits are respected in remote app

---

### User Story 2: Failed OAuth Authentication Flow

```gherkin
Feature: Handle Failed OAuth Authentication

Scenario: User fails to authenticate to external application
  Given I am an authenticated user on the tools-dashboard platform
  When I navigate to the application library
  And I click on an application card
  And I am redirected to the remote application
  And I click "Sign In with Tools Dashboard"

  When the OAuth authentication fails (e.g., user denies consent, invalid credentials)
  Then I should see an error message on the remote application
  And I should see an option to "Return to Tools Dashboard"

  When I click "Return to Tools Dashboard"
  Then I should be redirected to http://epicdev.com/app
  And I should see a message explaining the authentication failure
  And I should see options to:
    - Try again
    - Contact support
    - Register (if not yet registered)
```

**Acceptance Criteria:**
- AC2.1: Failed OAuth flows are gracefully handled
- AC2.2: User receives clear error messages
- AC2.3: User can return to tools-dashboard platform
- AC2.4: Error page provides actionable next steps
- AC2.5: Authentication errors are logged for debugging
- AC2.6: User can retry authentication without data loss

---

### User Story 3: View Application Library

```gherkin
Feature: Browse Available Applications

Scenario: User views application library
  Given I am an authenticated user
  When I navigate to /app/features/app-library
  Then I should see a responsive grid of application cards
  And each card should display:
    - Application logo
    - Application name
    - Short description
    - "Launch App" button
    - Scope information (what permissions the app needs)

  When I hover over an application card
  Then the card should have a visual hover effect

  When no applications are available
  Then I should see an empty state message
  And I should see guidance on what applications are coming soon
```

**Acceptance Criteria:**
- AC3.1: Library is accessible at `/app/features/app-library`
- AC3.2: Grid layout is responsive (1 column on mobile, 2 on tablet, 3-4 on desktop)
- AC3.3: Cards have professional UIX styling
- AC3.4: Empty state is displayed when no apps are available
- AC3.5: Loading state is shown while fetching apps
- AC3.6: Only apps user has access to are displayed (access control respected)

---

## Responsibility Matrix

### Current System Responsibilities (tools-dashboard platform)

| Component | Responsibility | Status |
|-----------|----------------|--------|
| **front-public** | Display application library | ⏳ To Implement |
| **front-public** | Generate OAuth redirect URL with PKCE | ⏳ To Implement |
| **front-public** | Store PKCE code_verifier in sessionStorage | ⏳ To Implement |
| **front-public** | Redirect user to remote app with OAuth params | ⏳ To Implement |
| **front-public** | Handle OAuth errors on callback | ⏳ To Implement |
| **back-api** | Provide `/api/oauth-clients` endpoint (list apps) | ⏳ To Implement |
| **back-api** | Enforce access control (filter apps by user) | ⏳ To Implement |
| **back-auth** | OAuth authorization endpoint (`/oauth/authorize`) | ✅ Implemented |
| **back-auth** | OAuth token endpoint (`/oauth/token`) | ✅ Implemented |
| **back-auth** | Generate and validate JWT tokens | ✅ Implemented |
| **back-auth** | Manage OAuth clients in database | ✅ Implemented |
| **back-postgres** | Store OAuth clients (apps table) | ✅ Schema exists |
| **back-postgres** | Store access control rules | ✅ Schema exists |
| **back-cassandra** | Log OAuth events | ✅ Schema exists |

---

### Remote Application Responsibilities (e.g., E-Cards)

| Component | Responsibility | Status (E-Cards) |
|-----------|----------------|------------------|
| **Landing Page** | Display "Sign In with Tools Dashboard" button | ✅ Implemented |
| **OAuth Handler** | Capture OAuth params from URL | ✅ Implemented |
| **OAuth Handler** | Retrieve stored code_verifier from sessionStorage | ✅ Implemented |
| **OAuth Handler** | Redirect to `/oauth/authorize` endpoint | ✅ Implemented |
| **Callback Handler** | Capture authorization code from redirect | ✅ Implemented |
| **Callback Handler** | Exchange code for access token | ✅ Implemented |
| **Token Storage** | Store access_token securely (httpOnly cookie) | ✅ Implemented |
| **API Requests** | Include access_token in Authorization header | ✅ Implemented |
| **Token Refresh** | Handle token expiration (request new token) | ✅ Implemented |
| **Error Handling** | Show error message on failed auth | ⏳ To Enhance |
| **Error Handling** | Provide "Return to Tools Dashboard" link | ⏳ To Implement |

---

## Technical Architecture

### OAuth Launch Flow (Sequence Diagram)

```
┌─────────┐          ┌──────────────┐          ┌─────────────┐          ┌──────────────┐
│  User   │          │ front-public │          │  back-auth  │          │ Remote App   │
└────┬────┘          └──────┬───────┘          └──────┬──────┘          └──────┬───────┘
     │                      │                         │                        │
     │ 1. Navigate to       │                         │                        │
     │    /app/features/    │                         │                        │
     │    app-library       │                         │                        │
     ├─────────────────────>│                         │                        │
     │                      │                         │                        │
     │                      │ 2. Fetch apps           │                        │
     │                      │    GET /api/oauth-      │                        │
     │                      │    clients              │                        │
     │                      ├────────────────────────>│                        │
     │                      │<────────────────────────┤                        │
     │                      │ 3. Return apps list     │                        │
     │                      │                         │                        │
     │ 4. Display apps      │                         │                        │
     │<─────────────────────┤                         │                        │
     │                      │                         │                        │
     │ 5. Click "Launch     │                         │                        │
     │    E-Cards"          │                         │                        │
     ├─────────────────────>│                         │                        │
     │                      │                         │                        │
     │                      │ 6. Generate PKCE        │                        │
     │                      │    code_verifier        │                        │
     │                      │    code_challenge       │                        │
     │                      │                         │                        │
     │                      │ 7. Store code_verifier  │                        │
     │                      │    in sessionStorage    │                        │
     │                      │                         │                        │
     │ 8. Redirect to       │                         │                        │
     │    http://localhost: │                         │                        │
     │    7300?client_id=   │                         │                        │
     │    ecards&redirect_  │                         │                        │
     │    uri=...&code_     │                         │                        │
     │    challenge=...     │                         │                        │
     │<─────────────────────┤                         │                        │
     │─────────────────────────────────────────────────────────────────────────>│
     │                      │                         │                        │
     │                      │                         │   9. Display landing   │
     │                      │                         │      page with "Sign   │
     │                      │                         │      In" button        │
     │<─────────────────────────────────────────────────────────────────────────┤
     │                      │                         │                        │
     │ 10. Click "Sign In   │                         │                        │
     │     with Tools       │                         │                        │
     │     Dashboard"       │                         │                        │
     ├──────────────────────────────────────────────────────────────────────────>│
     │                      │                         │                        │
     │                      │                         │   11. Redirect to      │
     │                      │                         │       /oauth/authorize │
     │<─────────────────────────────────────────────────────────────────────────┤
     │──────────────────────────────────────────────>│                        │
     │                      │                         │                        │
     │                      │   12. Show consent      │                        │
     │                      │       screen (if        │                        │
     │                      │       needed)           │                        │
     │<──────────────────────────────────────────────┤                        │
     │                      │                         │                        │
     │ 13. Approve          │                         │                        │
     ├──────────────────────────────────────────────>│                        │
     │                      │                         │                        │
     │                      │   14. Generate auth     │                        │
     │                      │       code              │                        │
     │                      │                         │                        │
     │ 15. Redirect to      │                         │                        │
     │     callback with    │                         │                        │
     │     auth code        │                         │                        │
     │<──────────────────────────────────────────────┤                        │
     │─────────────────────────────────────────────────────────────────────────>│
     │                      │                         │                        │
     │                      │                         │   16. Exchange code    │
     │                      │                         │       for token        │
     │                      │                         │       POST /oauth/     │
     │                      │                         │       token            │
     │                      │                         │<───────────────────────┤
     │                      │                         ├───────────────────────>│
     │                      │                         │   17. Return access    │
     │                      │                         │       token (JWT)      │
     │                      │                         │                        │
     │                      │                         │   18. Store token,     │
     │                      │                         │       redirect to      │
     │                      │                         │       app dashboard    │
     │<─────────────────────────────────────────────────────────────────────────┤
     │                      │                         │                        │
     │ 19. Use application  │                         │                        │
     │<────────────────────────────────────────────────────────────────────────>│
```

---

### Component Structure (front-public)

```
front-public/app/features/app-library/
├── routes/
│   ├── index.tsx                    # Main library route (GET /app/features/app-library)
│   └── oauth-error.tsx              # OAuth error handler (GET /app/features/app-library/oauth-error)
├── ui/
│   ├── AppCard.tsx                  # Individual application card component
│   ├── AppGrid.tsx                  # Responsive grid layout
│   ├── EmptyState.tsx               # No apps available state
│   ├── LoadingState.tsx             # Loading skeleton
│   └── ErrorState.tsx               # Error state component
├── utils/
│   ├── oauth.ts                     # OAuth launch utilities (PKCE generation, redirect)
│   ├── api.ts                       # API client for fetching apps
│   └── storage.ts                   # SessionStorage management for PKCE
└── feature.yaml                     # Feature configuration
```

---

### Data Flow

```
1. User Authentication
   ↓
2. Redirect to /app/features/app-library (instead of progressive-profiling)
   ↓
3. front-public loader fetches apps from GET /api/oauth-clients
   ↓
4. back-api queries PostgreSQL apps table
   ↓
5. back-api filters apps based on access control rules
   ↓
6. front-public displays apps in responsive grid
   ↓
7. User clicks "Launch App"
   ↓
8. front-public generates PKCE code_verifier and code_challenge
   ↓
9. front-public stores code_verifier in sessionStorage
   ↓
10. front-public redirects to remote app with OAuth params:
    - Remote App URL?
    - client_id=ecards_a1b2c3d4
    - redirect_uri=http://localhost:7300/oauth/complete
    - scope=profile email subscription
    - code_challenge=<SHA256 hash>
    - code_challenge_method=S256
    - state=<random CSRF token>
    - response_type=code
    ↓
11. Remote app displays "Sign In with Tools Dashboard" button
    ↓
12. Remote app redirects to /oauth/authorize with same params
    ↓
13. back-auth validates params, shows consent screen
    ↓
14. User approves, back-auth generates authorization code
    ↓
15. back-auth redirects to remote app callback with code
    ↓
16. Remote app exchanges code for access_token
    ↓
17. Remote app stores token and redirects user to dashboard
    ↓
18. User uses remote app with access_token in API requests
```

---

## Implementation Tasks

### Phase 1: Update Authentication Redirect (Day 1)

**Files to Modify:**

1. **front-public/app/routes/user-registration/index.tsx** (or wherever auth redirect happens)
   - Change redirect from `/app/features/progressive-profiling` to `/app/features/app-library`

**Example:**
```typescript
// BEFORE
return redirect("/app/features/progressive-profiling");

// AFTER
return redirect("/app/features/app-library");
```

---

### Phase 2: Create OAuth Utilities (Day 1)

**File:** `front-public/app/features/app-library/utils/oauth.ts`

```typescript
/**
 * OAuth 2.0 PKCE Utilities for App Library
 */

/**
 * Generate a cryptographically secure random string
 */
function generateRandomString(length: number = 43): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => ('0' + byte.toString(16)).slice(-2)).join('');
}

/**
 * Generate SHA256 hash of a string
 */
async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate PKCE code_verifier and code_challenge
 */
export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateRandomString(43);
  const codeChallenge = await sha256(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
  };
}

/**
 * Store PKCE code_verifier in sessionStorage for later token exchange
 */
export function storePKCEVerifier(appClientId: string, codeVerifier: string): void {
  sessionStorage.setItem(`pkce_verifier_${appClientId}`, codeVerifier);
}

/**
 * Retrieve PKCE code_verifier from sessionStorage
 */
export function retrievePKCEVerifier(appClientId: string): string | null {
  return sessionStorage.getItem(`pkce_verifier_${appClientId}`);
}

/**
 * Build OAuth authorization URL for launching an app
 */
export async function buildOAuthLaunchURL(app: {
  client_id: string;
  dev_url: string;
  prod_url?: string;
  redirect_uris: string[];
  allowed_scopes: string[];
}): Promise<string> {
  // Generate PKCE parameters
  const { codeVerifier, codeChallenge } = await generatePKCE();

  // Store code_verifier for later use
  storePKCEVerifier(app.client_id, codeVerifier);

  // Generate state for CSRF protection
  const state = generateRandomString(32);
  sessionStorage.setItem(`oauth_state_${app.client_id}`, state);

  // Determine environment (dev or prod)
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === 'epicdev.com';
  const appBaseUrl = isDev ? app.dev_url : (app.prod_url || app.dev_url);

  // Build redirect URI (remote app's callback)
  const redirectUri = app.redirect_uris[0]; // Use first redirect URI

  // Build OAuth parameters to pass to remote app
  const oauthParams = new URLSearchParams({
    client_id: app.client_id,
    redirect_uri: redirectUri,
    scope: app.allowed_scopes.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state,
    response_type: 'code',
  });

  // Return full URL to remote app with OAuth params
  return `${appBaseUrl}?${oauthParams.toString()}`;
}

/**
 * Launch an application with OAuth flow
 */
export async function launchAppWithOAuth(app: {
  client_id: string;
  dev_url: string;
  prod_url?: string;
  redirect_uris: string[];
  allowed_scopes: string[];
}): Promise<void> {
  const launchUrl = await buildOAuthLaunchURL(app);

  // Redirect to remote application
  window.location.href = launchUrl;
}
```

---

### Phase 3: Create API Client (Day 1)

**File:** `front-public/app/features/app-library/utils/api.ts`

```typescript
/**
 * API client for app-library feature
 */

export interface AppConfig {
  id: string;
  client_id: string;
  client_name: string;
  description?: string;
  logo_url?: string;
  dev_url: string;
  prod_url?: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  is_active: boolean;
}

/**
 * Fetch available applications from back-api
 */
export async function fetchAvailableApps(): Promise<AppConfig[]> {
  const response = await fetch('/api/oauth-clients', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for session
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch apps: ${response.statusText}`);
  }

  const apps: AppConfig[] = await response.json();
  return apps;
}
```

---

### Phase 4: Create UI Components (Day 2)

**File:** `front-public/app/features/app-library/ui/AppCard.tsx`

```typescript
import { launchAppWithOAuth } from '../utils/oauth';
import type { AppConfig } from '../utils/api';

interface AppCardProps {
  app: AppConfig;
}

export function AppCard({ app }: AppCardProps) {
  const handleLaunch = async () => {
    try {
      await launchAppWithOAuth(app);
    } catch (error) {
      console.error('Failed to launch app:', error);
      alert('Failed to launch application. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Logo Section */}
      <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        {app.logo_url ? (
          <img
            src={app.logo_url}
            alt={`${app.client_name} logo`}
            className="w-20 h-20 object-contain rounded-xl"
          />
        ) : (
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
            {app.client_name.charAt(0)}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* App Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {app.client_name}
        </h3>

        {/* Description */}
        {app.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
            {app.description}
          </p>
        )}

        {/* Scopes */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Permissions:</p>
          <div className="flex flex-wrap gap-1">
            {app.allowed_scopes.map((scope) => (
              <span
                key={scope}
                className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
              >
                {scope}
              </span>
            ))}
          </div>
        </div>

        {/* Launch Button */}
        <button
          onClick={handleLaunch}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Launch App
        </button>
      </div>
    </div>
  );
}
```

**File:** `front-public/app/features/app-library/ui/AppGrid.tsx`

```typescript
import { AppCard } from './AppCard';
import type { AppConfig } from '../utils/api';

interface AppGridProps {
  apps: AppConfig[];
}

export function AppGrid({ apps }: AppGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {apps.map((app) => (
        <AppCard key={app.client_id} app={app} />
      ))}
    </div>
  );
}
```

**File:** `front-public/app/features/app-library/ui/EmptyState.tsx`

```typescript
export function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No applications available
      </h3>
      <p className="text-sm text-gray-600 max-w-md mx-auto">
        There are currently no applications available in the library. Check back soon for new integrations!
      </p>
    </div>
  );
}
```

**File:** `front-public/app/features/app-library/ui/LoadingState.tsx`

```typescript
export function LoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
          <div className="bg-gray-200 h-32"></div>
          <div className="p-6">
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**File:** `front-public/app/features/app-library/ui/ErrorState.tsx`

```typescript
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
        <svg
          className="w-8 h-8 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Failed to load applications
      </h3>
      <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
        {message || 'An error occurred while loading the application library.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
```

---

### Phase 5: Create Main Route (Day 2)

**File:** `front-public/app/features/app-library/routes/index.tsx`

```typescript
import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useRevalidator } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { getSession } from '~/sessions';
import { fetchAvailableApps, type AppConfig } from '../utils/api';
import { AppGrid } from '../ui/AppGrid';
import { EmptyState } from '../ui/EmptyState';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';

export async function loader({ request }: LoaderFunctionArgs) {
  // Check authentication
  const session = await getSession(request.headers.get('Cookie'));

  if (!session || !session.userId) {
    return redirect('/user-registration');
  }

  try {
    // Fetch available apps from back-api
    const apps = await fetchAvailableApps();

    return json({
      apps,
      userEmail: session.email,
    });
  } catch (error) {
    console.error('Failed to load apps:', error);
    return json({
      apps: [],
      error: 'Failed to load applications',
    });
  }
}

export default function AppLibrary() {
  const { apps, error } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [isLoading, setIsLoading] = useState(false);

  const handleRetry = () => {
    revalidator.revalidate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Application Library</h1>
          <p className="text-gray-600 mt-2">
            Launch integrated applications with seamless authentication
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Loading State */}
        {revalidator.state === 'loading' && <LoadingState />}

        {/* Error State */}
        {error && revalidator.state !== 'loading' && (
          <ErrorState message={error} onRetry={handleRetry} />
        )}

        {/* Empty State */}
        {!error && apps.length === 0 && revalidator.state !== 'loading' && (
          <EmptyState />
        )}

        {/* App Grid */}
        {!error && apps.length > 0 && revalidator.state !== 'loading' && (
          <AppGrid apps={apps} />
        )}
      </div>
    </div>
  );
}
```

---

### Phase 6: Create OAuth Error Handler (Day 2)

**File:** `front-public/app/features/app-library/routes/oauth-error.tsx`

```typescript
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error') || 'unknown_error';
  const errorDescription = url.searchParams.get('error_description') || 'An unknown error occurred';

  return json({
    error,
    errorDescription,
  });
}

export default function OAuthError() {
  const { error, errorDescription } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Error Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Authentication Failed
        </h1>

        {/* Error Description */}
        <p className="text-gray-600 text-center mb-6">
          {errorDescription}
        </p>

        {/* Error Code */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Error Code:</span> {error}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            to="/app/features/app-library"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-center transition-colors"
          >
            Return to Application Library
          </Link>

          <Link
            to="/app"
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg text-center transition-colors"
          >
            Go to Dashboard
          </Link>

          <a
            href="mailto:support@example.com"
            className="block w-full text-center text-sm text-blue-600 hover:text-blue-700"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 7: Create Feature Configuration (Day 2)

**File:** `front-public/app/features/app-library/feature.yaml`

```yaml
name: app-library
version: 1.0.0
description: Application Library with OAuth Integration
owner: Engineering Team
status: active

routes:
  - path: /app/features/app-library
    component: routes/index.tsx
    description: Main application library view
    authentication_required: true

  - path: /app/features/app-library/oauth-error
    component: routes/oauth-error.tsx
    description: OAuth error handler
    authentication_required: false

dependencies:
  backend:
    - back-api: /api/oauth-clients (list available apps)
    - back-auth: /oauth/authorize (OAuth authorization endpoint)
    - back-auth: /oauth/token (OAuth token exchange)

  database:
    - back-postgres: apps table
    - back-postgres: app_access_rules table
    - back-cassandra: oauth_auth_events table

external_integrations:
  - name: E-Cards
    url: http://localhost:7300
    client_id: ecards_a1b2c3d4
    description: First integrated application

security:
  - OAuth 2.0 Authorization Code Flow with PKCE
  - CSRF protection via state parameter
  - Secure storage of code_verifier in sessionStorage
  - JWT access tokens (RS256, 1-hour expiry)
```

---

## OAuth Flow Details

### PKCE (Proof Key for Code Exchange)

PKCE is a security extension to OAuth 2.0 to prevent authorization code interception attacks.

**Steps:**

1. **Generate code_verifier**: Random 43-character string
2. **Generate code_challenge**: SHA256 hash of code_verifier (base64url-encoded)
3. **Store code_verifier**: In sessionStorage for later use
4. **Send code_challenge**: In authorization request
5. **Send code_verifier**: In token exchange request

**Example:**

```typescript
// Step 1: Generate code_verifier
const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

// Step 2: Generate code_challenge
const codeChallenge = await sha256(codeVerifier);
// Result: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'

// Step 3: Store code_verifier
sessionStorage.setItem('pkce_verifier_ecards_a1b2c3d4', codeVerifier);

// Step 4: Authorization request
const authUrl = `http://epicdev.com/oauth/authorize?` +
  `client_id=ecards_a1b2c3d4&` +
  `redirect_uri=http://localhost:7300/oauth/complete&` +
  `scope=profile email subscription&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256&` +
  `state=random_state_token&` +
  `response_type=code`;

// Step 5: Token exchange (done by remote app)
const tokenResponse = await fetch('http://epicdev.com/oauth/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: 'authorization_code_from_callback',
    client_id: 'ecards_a1b2c3d4',
    client_secret: 'dev_secret_ecards_2025',
    redirect_uri: 'http://localhost:7300/oauth/complete',
    code_verifier: codeVerifier, // Retrieved from sessionStorage
  }),
});
```

---

### State Parameter (CSRF Protection)

The `state` parameter is used to prevent Cross-Site Request Forgery (CSRF) attacks.

**Steps:**

1. **Generate random state**: Before authorization request
2. **Store state**: In sessionStorage
3. **Send state**: In authorization request
4. **Validate state**: On callback (compare with stored value)

**Example:**

```typescript
// Generate and store state
const state = generateRandomString(32);
sessionStorage.setItem(`oauth_state_${appClientId}`, state);

// Authorization request includes state
const authUrl = `...&state=${state}`;

// On callback (remote app validates)
const receivedState = new URLSearchParams(window.location.search).get('state');
const storedState = sessionStorage.getItem(`oauth_state_${appClientId}`);

if (receivedState !== storedState) {
  throw new Error('CSRF attack detected: state mismatch');
}
```

---

## Remote Application Integration Guide

This section provides guidance for remote applications (like E-Cards) to integrate with the tools-dashboard OAuth server.

**Note:** E-Cards has already implemented this based on `.claude/features/app-library/OAUTH_IMPLEMENTATION_GUIDE.md`

### Step 1: Receive OAuth Parameters

When a user clicks "Launch App" in the tools-dashboard app library, they will be redirected to your application with OAuth parameters in the URL:

```
http://localhost:7300/?
  client_id=ecards_a1b2c3d4&
  redirect_uri=http://localhost:7300/oauth/complete&
  scope=profile email subscription&
  code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&
  code_challenge_method=S256&
  state=random_state_token&
  response_type=code
```

**Extract these parameters:**

```typescript
const params = new URLSearchParams(window.location.search);
const oauthParams = {
  client_id: params.get('client_id'),
  redirect_uri: params.get('redirect_uri'),
  scope: params.get('scope'),
  code_challenge: params.get('code_challenge'),
  code_challenge_method: params.get('code_challenge_method'),
  state: params.get('state'),
  response_type: params.get('response_type'),
};

// Store code_challenge and state for later use
sessionStorage.setItem('oauth_code_challenge', oauthParams.code_challenge);
sessionStorage.setItem('oauth_state', oauthParams.state);
```

---

### Step 2: Display "Sign In with Tools Dashboard" Button

Show a button that initiates the OAuth flow:

```tsx
<button onClick={handleSignIn}>
  Sign In with Tools Dashboard
</button>
```

---

### Step 3: Redirect to Authorization Endpoint

When the user clicks "Sign In", redirect to the tools-dashboard OAuth authorization endpoint:

```typescript
function handleSignIn() {
  const authUrl = `http://epicdev.com/oauth/authorize?` +
    `client_id=${oauthParams.client_id}&` +
    `redirect_uri=${encodeURIComponent(oauthParams.redirect_uri)}&` +
    `scope=${encodeURIComponent(oauthParams.scope)}&` +
    `code_challenge=${oauthParams.code_challenge}&` +
    `code_challenge_method=${oauthParams.code_challenge_method}&` +
    `state=${oauthParams.state}&` +
    `response_type=code`;

  window.location.href = authUrl;
}
```

---

### Step 4: Handle Authorization Callback

After the user approves (or denies) authorization, they will be redirected back to your `redirect_uri` with an authorization code:

```
http://localhost:7300/oauth/complete?
  code=auth_code_12345&
  state=random_state_token
```

**Extract the code and validate state:**

```typescript
// In your callback handler (e.g., /oauth/complete route)
const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const state = params.get('state');
const error = params.get('error');

// Handle errors
if (error) {
  // User denied authorization or error occurred
  const errorDescription = params.get('error_description') || 'Authorization failed';

  // Redirect back to tools-dashboard with error
  window.location.href = `http://epicdev.com/app/features/app-library/oauth-error?` +
    `error=${error}&` +
    `error_description=${encodeURIComponent(errorDescription)}`;
  return;
}

// Validate state (CSRF protection)
const storedState = sessionStorage.getItem('oauth_state');
if (state !== storedState) {
  throw new Error('CSRF attack detected: state mismatch');
}
```

---

### Step 5: Exchange Authorization Code for Access Token

Send a POST request to the token endpoint to exchange the authorization code for an access token:

```typescript
const tokenResponse = await fetch('http://epicdev.com/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    client_id: 'ecards_a1b2c3d4',
    client_secret: 'dev_secret_ecards_2025', // IMPORTANT: This should be stored securely on your backend
    redirect_uri: 'http://localhost:7300/oauth/complete',
    code_verifier: sessionStorage.getItem('pkce_verifier_ecards_a1b2c3d4'), // Retrieved from sessionStorage
  }),
});

const tokenData = await tokenResponse.json();

if (tokenResponse.ok) {
  const { access_token, token_type, expires_in, scope } = tokenData;

  // Store access_token securely (httpOnly cookie recommended)
  document.cookie = `access_token=${access_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${expires_in}`;

  // Redirect to application dashboard
  window.location.href = '/dashboard';
} else {
  // Token exchange failed
  const { error, error_description } = tokenData;

  // Redirect back to tools-dashboard with error
  window.location.href = `http://epicdev.com/app/features/app-library/oauth-error?` +
    `error=${error}&` +
    `error_description=${encodeURIComponent(error_description)}`;
}
```

---

### Step 6: Use Access Token in API Requests

Include the access token in the `Authorization` header of all API requests:

```typescript
const response = await fetch('http://epicdev.com/api/user/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json',
  },
});

const userProfile = await response.json();
```

---

### Step 7: Handle Token Expiration

Access tokens expire after 1 hour. Implement token refresh or re-authentication:

```typescript
// Check if token is expired
if (response.status === 401) {
  // Token expired, redirect to sign-in
  window.location.href = '/?prompt=sign-in';
}
```

---

### Step 8: Error Handling - Return to Tools Dashboard

On authentication errors, provide a link back to the tools-dashboard:

```tsx
<div>
  <h1>Authentication Failed</h1>
  <p>{errorMessage}</p>
  <a href="http://epicdev.com/app">
    Return to Tools Dashboard
  </a>
</div>
```

---

## Testing Strategy

### Unit Tests

**Test OAuth Utilities:**

```typescript
// front-public/app/features/app-library/utils/oauth.test.ts

describe('OAuth Utilities', () => {
  describe('generatePKCE', () => {
    it('should generate code_verifier and code_challenge', async () => {
      const { codeVerifier, codeChallenge } = await generatePKCE();

      expect(codeVerifier).toHaveLength(43);
      expect(codeChallenge).toBeTruthy();
      expect(codeChallenge).not.toBe(codeVerifier);
    });
  });

  describe('buildOAuthLaunchURL', () => {
    it('should build correct OAuth URL with PKCE', async () => {
      const app = {
        client_id: 'test_app',
        dev_url: 'http://localhost:3000',
        redirect_uris: ['http://localhost:3000/callback'],
        allowed_scopes: ['profile', 'email'],
      };

      const url = await buildOAuthLaunchURL(app);

      expect(url).toContain('client_id=test_app');
      expect(url).toContain('code_challenge=');
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain('state=');
    });
  });
});
```

---

### Integration Tests

**Test App Launch Flow:**

```typescript
// front-public/app/features/app-library/routes/index.test.tsx

describe('App Library Route', () => {
  it('should display available apps', async () => {
    const { getByText } = render(<AppLibrary />);

    await waitFor(() => {
      expect(getByText('E-Card + QR-Code Batch Generator')).toBeInTheDocument();
    });
  });

  it('should redirect to remote app on launch', async () => {
    const { getByText } = render(<AppLibrary />);

    const launchButton = await screen.findByRole('button', { name: /launch app/i });
    fireEvent.click(launchButton);

    // Check that redirect was initiated
    expect(window.location.href).toContain('client_id=ecards_a1b2c3d4');
  });
});
```

---

### End-to-End Tests

**Test Full OAuth Flow:**

```typescript
// e2e/app-library.spec.ts

describe('App Library E2E', () => {
  it('should complete full OAuth flow', async () => {
    // 1. Navigate to app library
    await page.goto('http://epicdev.com/app/features/app-library');

    // 2. Verify apps are displayed
    await expect(page.locator('text=E-Card + QR-Code Batch Generator')).toBeVisible();

    // 3. Click launch button
    await page.click('button:has-text("Launch App")');

    // 4. Verify redirect to remote app
    await expect(page).toHaveURL(/http:\/\/localhost:7300\?client_id=/);

    // 5. Click "Sign In with Tools Dashboard"
    await page.click('button:has-text("Sign In with Tools Dashboard")');

    // 6. Verify redirect to authorization endpoint
    await expect(page).toHaveURL(/http:\/\/epicdev.com\/oauth\/authorize/);

    // 7. Approve authorization
    await page.click('button:has-text("Approve")');

    // 8. Verify redirect back to remote app with code
    await expect(page).toHaveURL(/http:\/\/localhost:7300\/auth\/callback\?code=/);

    // 9. Verify token exchange and final redirect to dashboard
    await expect(page).toHaveURL('http://localhost:7300/dashboard');

    // 10. Verify user is authenticated in remote app
    await expect(page.locator('text=Welcome')).toBeVisible();
  });
});
```

---

## Success Criteria

### Functional Requirements

- ✅ Users are redirected to `/app/features/app-library` after authentication (not progressive-profiling)
- ✅ Application library displays all available apps in a responsive grid
- ✅ Each app card shows: logo, name, description, scopes, launch button
- ✅ Clicking "Launch App" initiates OAuth flow with PKCE
- ✅ OAuth parameters are correctly passed to remote application
- ✅ Remote application can complete OAuth authorization
- ✅ Users can authenticate to remote apps without re-entering credentials
- ✅ Failed OAuth flows redirect back to tools-dashboard with error message
- ✅ Access control is enforced (users only see apps they can access)

### Non-Functional Requirements

- ✅ Library loads in < 2 seconds (p95)
- ✅ OAuth redirect completes in < 500ms
- ✅ Responsive design works on mobile, tablet, desktop
- ✅ All security best practices followed (PKCE, state validation)
- ✅ No secrets exposed in frontend code
- ✅ Code is well-documented and follows project conventions

### User Experience

- ✅ Professional UIX styling with Tailwind CSS
- ✅ Smooth hover effects and transitions
- ✅ Clear loading states
- ✅ Helpful error messages
- ✅ Empty state guidance
- ✅ Intuitive navigation

---

## Next Steps

### Immediate (Day 1-2)

1. ✅ Create plan document (this file)
2. ⏳ Update authentication redirect to `/app/features/app-library`
3. ⏳ Implement OAuth utilities (`oauth.ts`, `api.ts`)
4. ⏳ Create UI components (`AppCard`, `AppGrid`, etc.)
5. ⏳ Create main route (`index.tsx`)
6. ⏳ Create error handler route (`oauth-error.tsx`)
7. ⏳ Test with E-Cards application

### Short-Term (Week 1)

1. ⏳ Implement back-api `/api/oauth-clients` endpoint
2. ⏳ Implement access control filtering
3. ⏳ Write unit tests for utilities and components
4. ⏳ Write integration tests for routes
5. ⏳ Perform end-to-end testing with E-Cards
6. ⏳ Fix any bugs discovered during testing

### Medium-Term (Week 2-3)

1. ⏳ Add favorites functionality (star apps)
2. ⏳ Add recently used section
3. ⏳ Add search/filter functionality
4. ⏳ Add app categories/tags
5. ⏳ Performance optimization (caching)
6. ⏳ Add analytics tracking (usage events)

---

## Related Documentation

- `.claude/features/app-library/README.md` - Feature overview
- `.claude/features/app-library/OAUTH_IMPLEMENTATION_GUIDE.md` - Complete OAuth integration guide for remote apps
- `.claude/features/app-library/TECHNICAL_SPEC.md` - Technical architecture
- `.claude/features/app-library/DATABASE_SCHEMA.md` - Database schema
- `.claude/features/app-library/IMPLEMENTATION_PLAN.md` - 5-week implementation plan
- `.claude/features/auto-auth.md` - OAuth server specification

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-16
**Status:** Ready for Implementation
**Next Action:** Begin Phase 1 - Update authentication redirect
