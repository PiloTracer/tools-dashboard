# App Library Integration Guide - Auto-Auth Feature

**Version:** 1.0.0
**Last Updated:** 2025-11-15
**Purpose:** Complete integration guide for the app-library feature to use auto-auth for launching external applications

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [App Library Feature Implementation](#app-library-feature-implementation)
4. [External App Integration Guide](#external-app-integration-guide)
5. [Complete Code Examples](#complete-code-examples)
6. [Security Considerations](#security-considerations)
7. [Testing & Validation](#testing--validation)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What is App Library?

The **app-library** feature is a dashboard component in the tools-dashboard platform that displays available external applications (like E-Cards, Invoice Generator, CRM, etc.) that users can launch with seamless authentication via OAuth 2.0.

### Integration Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    User Journey                                │
│                                                                │
│  1. User logs into tools-dashboard                            │
│  2. User sees app-library dashboard                           │
│  3. User clicks "E-Cards" app                                 │
│  4. tools-dashboard initiates OAuth flow                      │
│  5. User is redirected to E-Cards (auto-authenticated)        │
│  6. E-Cards validates OAuth token and logs user in            │
└────────────────────────────────────────────────────────────────┘
```

### Key Concepts

- **App Library**: Front-end component showing available apps
- **Auto-Auth**: OAuth 2.0 server in tools-dashboard
- **OAuth Client**: External application registered in tools-dashboard
- **Seamless Launch**: User clicks app and is auto-authenticated (no re-login)

---

## Architecture

### System Components

```
┌──────────────────────────────────────────────────────────────────┐
│                    tools-dashboard                               │
│                    http://epicdev.com                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  front-public/app/features/app-library/               │     │
│  │                                                        │     │
│  │  Purpose: Display available apps and launch them      │     │
│  │                                                        │     │
│  │  Components:                                           │     │
│  │  - AppLibraryDashboard.tsx (main UI)                 │     │
│  │  - AppCard.tsx (individual app display)              │     │
│  │  - AppLauncher.tsx (OAuth initiation logic)          │     │
│  │                                                        │     │
│  │  Routes:                                               │     │
│  │  - GET /app/library (main dashboard)                  │     │
│  │  - GET /app/library/launch/:appId (launch app)       │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  front-public/app/features/auto-auth/                 │     │
│  │                                                        │     │
│  │  Purpose: OAuth 2.0 authorization server              │     │
│  │                                                        │     │
│  │  Routes:                                               │     │
│  │  - GET /oauth/authorize (consent screen)              │     │
│  │  - POST /oauth/token (token exchange)                 │     │
│  │  - GET /.well-known/jwks.json (public keys)           │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  back-api/features/auto-auth/                          │     │
│  │                                                        │     │
│  │  Purpose: OAuth client and app registry               │     │
│  │                                                        │     │
│  │  Endpoints:                                            │     │
│  │  - GET /api/oauth-clients (list registered apps)      │     │
│  │  - GET /api/oauth-clients/:id (get app details)       │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                    OAuth Authorization Flow
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                    External Application                          │
│                    (e.g., E-Cards at http://localhost:7300)      │
│                                                                  │
│  Frontend:                                                       │
│  - /oauth/complete (receives OAuth code)                         │
│  - Displays loading screen during auth                          │
│                                                                  │
│  Backend:                                                        │
│  - POST /api/auth/exchange-token (exchange code for tokens)     │
│  - GET /api/user/profile (fetch user data from tools-dashboard) │
│  - Creates local session                                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## App Library Feature Implementation

### Part 1: Feature Structure

Create the app-library feature in tools-dashboard:

```
front-public/app/features/app-library/
├── feature.yaml                 # Feature metadata
├── routes/
│   ├── index.tsx               # Main app library dashboard
│   └── launch.$appId.tsx       # App launcher
├── ui/
│   ├── AppCard.tsx             # Individual app card
│   ├── AppGrid.tsx             # Grid of apps
│   └── AppLauncher.tsx         # OAuth launch logic
└── utils/
    ├── oauth.ts                # OAuth helper functions
    └── pkce.ts                 # PKCE generation utilities
```

### Part 2: Database Schema (Optional)

If you want to store user's favorite apps or app launch history:

```sql
-- Add to back-postgres/schema/
CREATE TABLE IF NOT EXISTS user_app_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id),
    app_client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id),
    is_favorite BOOLEAN DEFAULT false,
    last_launched_at TIMESTAMPTZ,
    launch_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, app_client_id)
);

CREATE INDEX idx_user_app_prefs_user_id ON user_app_preferences(user_id);
CREATE INDEX idx_user_app_prefs_favorite ON user_app_preferences(is_favorite);
```

### Part 3: Implementation Files

#### 1. Feature Metadata (`feature.yaml`)

```yaml
name: app-library
version: 1.0.0
description: Application library for launching external apps with auto-auth
service: front-public

routes:
  - path: /app/library
    file: index.tsx
    description: Main app library dashboard
  - path: /app/library/launch/:appId
    file: launch.$appId.tsx
    description: Launch external app with OAuth

dependencies:
  - auto-auth (OAuth 2.0 integration)
  - back-api (OAuth client registry)

features:
  - List available external applications
  - Launch apps with seamless OAuth authentication
  - Track user app preferences (favorites, recent)
  - Display app status and availability
```

#### 2. PKCE Utilities (`utils/pkce.ts`)

```typescript
/**
 * PKCE (Proof Key for Code Exchange) utilities
 * Required for secure OAuth 2.0 authorization code flow
 */

/**
 * Generate random code verifier (43-128 characters)
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generate code challenge from verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

/**
 * Generate CSRF state token
 */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Base64 URL encode (without padding)
 */
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Store PKCE parameters in sessionStorage
 */
export function storePKCEParams(params: {
  codeVerifier: string;
  state: string;
  appId: string;
}) {
  sessionStorage.setItem('oauth_code_verifier', params.codeVerifier);
  sessionStorage.setItem('oauth_state', params.state);
  sessionStorage.setItem('oauth_app_id', params.appId);
}

/**
 * Retrieve PKCE parameters from sessionStorage
 */
export function retrievePKCEParams() {
  return {
    codeVerifier: sessionStorage.getItem('oauth_code_verifier'),
    state: sessionStorage.getItem('oauth_state'),
    appId: sessionStorage.getItem('oauth_app_id'),
  };
}

/**
 * Clear PKCE parameters from sessionStorage
 */
export function clearPKCEParams() {
  sessionStorage.removeItem('oauth_code_verifier');
  sessionStorage.removeItem('oauth_state');
  sessionStorage.removeItem('oauth_app_id');
}
```

#### 3. OAuth Utilities (`utils/oauth.ts`)

```typescript
/**
 * OAuth 2.0 helper functions for app-library
 */

import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  storePKCEParams,
} from './pkce';

export interface AppConfig {
  client_id: string;
  client_name: string;
  description: string | null;
  logo_url: string | null;
  redirect_uris: string[];
  allowed_scopes: string[];
  launch_url: string; // Base URL of external app
}

/**
 * Launch external app with OAuth 2.0 flow
 */
export async function launchAppWithOAuth(app: AppConfig) {
  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store PKCE params for later validation
  storePKCEParams({
    codeVerifier,
    state,
    appId: app.client_id,
  });

  // Build OAuth authorization URL
  const authUrl = new URL('http://epicdev.com/oauth/authorize');
  authUrl.searchParams.set('client_id', app.client_id);
  authUrl.searchParams.set('redirect_uri', app.redirect_uris[0]);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', app.allowed_scopes.join(' '));
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // Open app in new window/tab
  window.open(authUrl.toString(), '_blank');

  // Optionally: Track launch event
  try {
    await fetch('/api/user/app-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_client_id: app.client_id,
        action: 'launched',
      }),
    });
  } catch (error) {
    console.error('Failed to track app launch:', error);
  }
}

/**
 * Fetch available apps from back-api
 */
export async function fetchAvailableApps(): Promise<AppConfig[]> {
  try {
    const response = await fetch('/api/oauth-clients');

    if (!response.ok) {
      throw new Error('Failed to fetch apps');
    }

    const clients = await response.json();

    // Filter only active clients with launch_url metadata
    return clients
      .filter((client: any) => client.is_active)
      .map((client: any) => ({
        client_id: client.client_id,
        client_name: client.client_name,
        description: client.description,
        logo_url: client.logo_url,
        redirect_uris: client.redirect_uris,
        allowed_scopes: client.allowed_scopes,
        launch_url: client.redirect_uris[0]?.split('/oauth/complete')[0] || '#',
      }));
  } catch (error) {
    console.error('Error fetching apps:', error);
    return [];
  }
}
```

#### 4. App Card Component (`ui/AppCard.tsx`)

```typescript
/**
 * Individual app card component
 */

import { AppConfig, launchAppWithOAuth } from '../utils/oauth';

interface AppCardProps {
  app: AppConfig;
}

export function AppCard({ app }: AppCardProps) {
  const handleLaunch = async () => {
    await launchAppWithOAuth(app);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* App Logo */}
      <div className="flex items-center justify-center mb-4">
        {app.logo_url ? (
          <img
            src={app.logo_url}
            alt={app.client_name}
            className="w-16 h-16 rounded-lg"
          />
        ) : (
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-600">
              {app.client_name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* App Name */}
      <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
        {app.client_name}
      </h3>

      {/* App Description */}
      {app.description && (
        <p className="text-sm text-gray-600 text-center mb-4 line-clamp-2">
          {app.description}
        </p>
      )}

      {/* Launch Button */}
      <button
        onClick={handleLaunch}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        Launch App
      </button>

      {/* Scopes Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Access: {app.allowed_scopes.join(', ')}
        </p>
      </div>
    </div>
  );
}
```

#### 5. Main App Library Dashboard (`routes/index.tsx`)

```typescript
/**
 * App Library Dashboard
 * Main page showing available apps
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { AppCard } from "../ui/AppCard";
import type { AppConfig } from "../utils/oauth";

interface LoaderData {
  apps: AppConfig[];
  userEmail: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  // Get user session
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  const userEmail = session.get("email") || "user@example.com";

  if (!userId) {
    return redirect("/user-registration");
  }

  // Fetch available apps from back-api
  const BACK_API_URL = process.env.BACK_API_URL || "http://localhost:8100";

  try {
    const response = await fetch(`${BACK_API_URL}/api/oauth-clients`);

    if (!response.ok) {
      throw new Error("Failed to fetch apps");
    }

    const clients = await response.json();

    // Transform to AppConfig format
    const apps: AppConfig[] = clients
      .filter((client: any) => client.is_active)
      .map((client: any) => ({
        client_id: client.client_id,
        client_name: client.client_name,
        description: client.description,
        logo_url: client.logo_url,
        redirect_uris: client.redirect_uris,
        allowed_scopes: client.allowed_scopes,
        launch_url: client.redirect_uris[0]?.split("/oauth/complete")[0] || "#",
      }));

    return json<LoaderData>({ apps, userEmail });
  } catch (error) {
    console.error("Error loading apps:", error);
    return json<LoaderData>({ apps: [], userEmail });
  }
}

export default function AppLibrary() {
  const { apps, userEmail } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">App Library</h1>
            <div className="text-sm text-gray-600">
              Logged in as: <span className="font-medium">{userEmail}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {apps.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No apps available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Contact your administrator to add applications.
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              Launch any of the following applications with seamless authentication:
            </p>

            {/* App Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {apps.map((app) => (
                <AppCard key={app.client_id} app={app} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## External App Integration Guide

This section explains how external applications (like E-Cards) integrate with tools-dashboard's auto-auth feature.

### Prerequisites

1. **OAuth Client Registration:**
   - Contact tools-dashboard admin
   - Provide: App name, description, logo, redirect URIs
   - Receive: `client_id` and `client_secret`

2. **API Key:**
   - Request API key from tools-dashboard admin
   - Store securely in environment variables

### Integration Steps

#### Step 1: Configure Environment Variables

```bash
# .env
OAUTH_CLIENT_ID=ecards_app
OAUTH_CLIENT_SECRET=your_client_secret_here
OAUTH_REDIRECT_URI=http://localhost:7300/oauth/complete
OAUTH_AUTHORIZE_URL=http://epicdev.com/oauth/authorize
OAUTH_TOKEN_URL=http://epicdev.com/oauth/token
OAUTH_JWKS_URL=http://epicdev.com/.well-known/jwks.json

# API Integration
TOOLS_DASHBOARD_API_URL=http://epicdev.com/admin/api
TOOLS_DASHBOARD_API_KEY=eak_your_api_key_here
```

#### Step 2: Backend - OAuth Token Exchange

Create an endpoint to handle OAuth callback:

```javascript
// backend/routes/auth.js (Node.js/Express example)

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const router = express.Router();

/**
 * OAuth Callback Handler
 * Receives authorization code and exchanges for tokens
 */
router.get('/oauth/complete', async (req, res) => {
  const { code, state } = req.query;

  // Validate state (CSRF protection)
  const storedState = req.session.oauth_state;
  if (state !== storedState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  // Retrieve PKCE code verifier from session
  const codeVerifier = req.session.oauth_code_verifier;

  if (!code || !codeVerifier) {
    return res.status(400).json({ error: 'Missing code or verifier' });
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await axios.post(
      process.env.OAUTH_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.OAUTH_REDIRECT_URI,
        client_id: process.env.OAUTH_CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET,
        code_verifier: codeVerifier,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Decode JWT to get user ID
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(access_token);
    const userId = decoded.sub;
    const userEmail = decoded.email;
    const userName = decoded.name;

    // Fetch full user profile from tools-dashboard API
    const userProfile = await axios.get(
      `${process.env.TOOLS_DASHBOARD_API_URL}/users/${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TOOLS_DASHBOARD_API_KEY}`,
        },
      }
    );

    // Fetch user subscription
    const subscription = await axios.get(
      `${process.env.TOOLS_DASHBOARD_API_URL}/users/${userId}/subscription`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TOOLS_DASHBOARD_API_KEY}`,
        },
      }
    );

    // Create local user session
    req.session.user = {
      id: userId,
      email: userEmail,
      name: userName,
      subscription: subscription.data,
      oauth_access_token: access_token,
      oauth_refresh_token: refresh_token,
      oauth_expires_at: Date.now() + expires_in * 1000,
    };

    // Clear OAuth temporary data
    delete req.session.oauth_state;
    delete req.session.oauth_code_verifier;

    // Redirect to app dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error('OAuth token exchange error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'authentication_failed',
      message: 'Failed to authenticate with tools-dashboard',
    });
  }
});

/**
 * Refresh Access Token
 * Use refresh token to get new access token
 */
router.post('/auth/refresh', async (req, res) => {
  const refreshToken = req.session.user?.oauth_refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token available' });
  }

  try {
    const tokenResponse = await axios.post(
      process.env.OAUTH_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.OAUTH_CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token: new_refresh_token, expires_in } = tokenResponse.data;

    // Update session
    req.session.user.oauth_access_token = access_token;
    req.session.user.oauth_refresh_token = new_refresh_token;
    req.session.user.oauth_expires_at = Date.now() + expires_in * 1000;

    res.json({ success: true });
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    res.status(401).json({ error: 'Failed to refresh token' });
  }
});

module.exports = router;
```

#### Step 3: Frontend - OAuth Flow Initiation

**When user is NOT coming from tools-dashboard app-library:**

```javascript
// frontend/src/utils/oauth.js

/**
 * Generate PKCE code verifier
 */
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generate code challenge from verifier
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

/**
 * Base64 URL encode
 */
function base64URLEncode(buffer) {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Initiate OAuth login
 */
export async function initiateOAuthLogin() {
  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateCodeVerifier(); // Reuse function for state

  // Store in sessionStorage
  sessionStorage.setItem('oauth_code_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);

  // Build authorization URL
  const authUrl = new URL(process.env.REACT_APP_OAUTH_AUTHORIZE_URL);
  authUrl.searchParams.set('client_id', process.env.REACT_APP_OAUTH_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', process.env.REACT_APP_OAUTH_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'profile email subscription');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // Redirect to tools-dashboard OAuth
  window.location.href = authUrl.toString();
}
```

**Frontend callback handler:**

```javascript
// frontend/src/pages/AuthCallback.jsx

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(errorParam);
      return;
    }

    if (!code || !state) {
      setError('Missing authorization code or state');
      return;
    }

    // Validate state
    const storedState = sessionStorage.getItem('oauth_state');
    if (state !== storedState) {
      setError('Invalid state parameter (CSRF attack detected)');
      return;
    }

    // Send code and verifier to backend
    const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

    fetch('/api/auth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: codeVerifier }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Token exchange failed');
        return res.json();
      })
      .then(() => {
        // Clear OAuth params
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_state');

        // Redirect to dashboard
        navigate('/dashboard');
      })
      .catch((err) => {
        console.error('Auth error:', err);
        setError(err.message);
      });
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="error">
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  return (
    <div className="loading">
      <h2>Authenticating...</h2>
      <p>Please wait while we log you in.</p>
    </div>
  );
}
```

#### Step 4: API Integration - Fetch User Data

```javascript
// backend/services/userService.js

const axios = require('axios');

class UserService {
  constructor() {
    this.apiUrl = process.env.TOOLS_DASHBOARD_API_URL;
    this.apiKey = process.env.TOOLS_DASHBOARD_API_KEY;
  }

  /**
   * Fetch user profile
   */
  async getUserProfile(userId) {
    try {
      const response = await axios.get(`${this.apiUrl}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error.response?.data);
      throw error;
    }
  }

  /**
   * Fetch user subscription
   */
  async getUserSubscription(userId) {
    try {
      const response = await axios.get(`${this.apiUrl}/users/${userId}/subscription`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching subscription:', error.response?.data);
      return null;
    }
  }

  /**
   * Fetch user rate limits
   */
  async getUserLimits(userId) {
    try {
      const response = await axios.get(`${this.apiUrl}/users/${userId}/limits`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching limits:', error.response?.data);
      return null;
    }
  }

  /**
   * Record usage event
   */
  async recordUsage(userId, event, quantity, metadata = {}) {
    try {
      await axios.post(
        `${this.apiUrl}/users/${userId}/usage`,
        {
          event,
          quantity,
          timestamp: new Date().toISOString(),
          metadata,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error recording usage:', error.response?.data);
    }
  }
}

module.exports = new UserService();
```

---

## Complete Code Examples

### Example 1: Python/Flask External App

```python
# backend/auth.py

from flask import Blueprint, request, redirect, session, jsonify
import requests
import hashlib
import base64
import secrets
import jwt
import os

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/auth/login')
def login():
    """Initiate OAuth login"""

    # Generate PKCE parameters
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode('utf-8').rstrip('=')

    state = base64.urlsafe_b64encode(secrets.token_bytes(16)).decode('utf-8').rstrip('=')

    # Store in session
    session['oauth_code_verifier'] = code_verifier
    session['oauth_state'] = state

    # Build authorization URL
    auth_url = (
        f"{os.getenv('OAUTH_AUTHORIZE_URL')}?"
        f"client_id={os.getenv('OAUTH_CLIENT_ID')}&"
        f"redirect_uri={os.getenv('OAUTH_REDIRECT_URI')}&"
        f"response_type=code&"
        f"scope=profile email subscription&"
        f"state={state}&"
        f"code_challenge={code_challenge}&"
        f"code_challenge_method=S256"
    )

    return redirect(auth_url)

@auth_bp.route('/oauth/complete')
def callback():
    """Handle OAuth callback"""

    code = request.args.get('code')
    state = request.args.get('state')

    # Validate state
    if state != session.get('oauth_state'):
        return jsonify({'error': 'Invalid state'}), 400

    code_verifier = session.get('oauth_code_verifier')

    # Exchange code for tokens
    token_response = requests.post(
        os.getenv('OAUTH_TOKEN_URL'),
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': os.getenv('OAUTH_REDIRECT_URI'),
            'client_id': os.getenv('OAUTH_CLIENT_ID'),
            'client_secret': os.getenv('OAUTH_CLIENT_SECRET'),
            'code_verifier': code_verifier,
        }
    )

    if not token_response.ok:
        return jsonify({'error': 'Token exchange failed'}), 400

    tokens = token_response.json()

    # Decode access token
    decoded = jwt.decode(tokens['access_token'], options={"verify_signature": False})
    user_id = decoded['sub']

    # Fetch user profile
    profile_response = requests.get(
        f"{os.getenv('TOOLS_DASHBOARD_API_URL')}/users/{user_id}",
        headers={'Authorization': f"Bearer {os.getenv('TOOLS_DASHBOARD_API_KEY')}"}
    )

    # Create session
    session['user'] = {
        'id': user_id,
        'email': decoded['email'],
        'name': decoded['name'],
        'access_token': tokens['access_token'],
        'refresh_token': tokens['refresh_token'],
    }

    # Clear OAuth params
    session.pop('oauth_state', None)
    session.pop('oauth_code_verifier', None)

    return redirect('/dashboard')
```

### Example 2: React External App (Complete)

```typescript
// src/services/authService.ts

import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface UserSession {
  id: string;
  email: string;
  name: string;
  subscription: any;
  limits: any;
}

class AuthService {
  private apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<void> {
    const response = await axios.post(`${this.apiUrl}/api/auth/exchange`, {
      code,
      code_verifier: codeVerifier,
    });

    if (response.data.success) {
      // User session created on backend
      // Fetch user data
      await this.fetchUserSession();
    }
  }

  /**
   * Fetch current user session
   */
  async fetchUserSession(): Promise<UserSession> {
    const response = await axios.get(`${this.apiUrl}/api/user/session`);
    return response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await axios.post(`${this.apiUrl}/api/auth/logout`);
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<void> {
    await axios.post(`${this.apiUrl}/api/auth/refresh`);
  }
}

export default new AuthService();
```

---

## Security Considerations

### For App-Library (tools-dashboard)

1. **PKCE Parameters:**
   - ✅ Always generate fresh `code_verifier` for each OAuth flow
   - ✅ Store `code_verifier` in sessionStorage (never send to external app)
   - ✅ Clear PKCE params after successful auth

2. **CSRF Protection:**
   - ✅ Generate random `state` parameter
   - ✅ Validate `state` in OAuth callback
   - ✅ Use cryptographically secure random generator

3. **Client Validation:**
   - ✅ Only show apps that are active and approved
   - ✅ Validate `redirect_uri` is registered
   - ✅ Enforce scope restrictions

### For External Apps

1. **Secret Management:**
   - ❌ NEVER expose `client_secret` in frontend code
   - ✅ Store in environment variables
   - ✅ Only use in backend API calls

2. **Token Storage:**
   - ❌ NEVER store tokens in localStorage (XSS risk)
   - ✅ Use httpOnly cookies for session
   - ✅ Store tokens in secure backend session

3. **API Key Security:**
   - ✅ Store API key in environment variables
   - ✅ Never commit to version control
   - ✅ Rotate keys regularly (every 90 days)

4. **JWT Validation:**
   - ✅ Verify JWT signature using JWKS
   - ✅ Check `exp` (expiration) claim
   - ✅ Validate `iss` (issuer) is tools-dashboard
   - ✅ Validate `aud` (audience) matches your `client_id`

---

## Testing & Validation

### Test Checklist for App-Library

- [ ] User can see app-library dashboard
- [ ] Apps load from OAuth client registry
- [ ] Clicking app opens OAuth consent in new tab
- [ ] PKCE parameters are generated correctly
- [ ] State parameter prevents CSRF
- [ ] OAuth flow completes successfully
- [ ] User is redirected to external app
- [ ] Session is created in external app

### Test Checklist for External App

- [ ] OAuth callback receives authorization code
- [ ] PKCE verification succeeds
- [ ] Token exchange returns access + refresh tokens
- [ ] JWT is valid and contains user claims
- [ ] User profile can be fetched from API
- [ ] Subscription data is retrieved
- [ ] Rate limits are enforced
- [ ] Token refresh works
- [ ] Logout revokes tokens

### Manual Testing Steps

1. **Launch App from Library:**
   ```
   1. Login to tools-dashboard (http://epicdev.com/app)
   2. Navigate to /app/library
   3. Click on "E-Cards" app
   4. Verify OAuth consent screen appears
   5. Click "Allow"
   6. Verify redirect to E-Cards
   7. Verify auto-login in E-Cards
   ```

2. **Direct Login (Not from Library):**
   ```
   1. Navigate directly to E-Cards (http://localhost:7300)
   2. Click "Sign in with Tools Dashboard"
   3. Verify OAuth flow
   4. Verify successful login
   ```

3. **Token Refresh:**
   ```
   1. Wait for access token to expire (1 hour)
   2. Make API call to tools-dashboard
   3. Verify automatic token refresh
   4. Verify API call succeeds
   ```

---

## Troubleshooting

### Common Issues

#### 1. "Invalid redirect_uri" Error

**Cause:** Redirect URI not registered in OAuth client

**Solution:**
```bash
# Check registered URIs in admin panel
# Ensure exact match (including protocol, port, path)

# Example:
Registered: http://localhost:7300/oauth/complete
Used:       http://localhost:7300/oauth/complete ✅

Registered: http://localhost:7300/oauth/complete
Used:       http://localhost:7300/callback ❌ (wrong path)
```

#### 2. "Invalid PKCE code_verifier" Error

**Cause:** `code_verifier` doesn't match `code_challenge`

**Solution:**
- Verify SHA256 hash is correct
- Ensure base64URL encoding (no padding)
- Check code_verifier is stored and retrieved correctly

#### 3. "Token expired" Error

**Cause:** Access token expired (1 hour lifetime)

**Solution:**
```javascript
// Implement token refresh
if (error.status === 401 && error.message.includes('expired')) {
  await authService.refreshToken();
  // Retry original request
}
```

#### 4. "API key invalid" Error

**Cause:** API key is wrong, expired, or revoked

**Solution:**
- Verify API key in environment variables
- Check key hasn't been revoked in admin panel
- Generate new API key if needed

#### 5. CORS Errors

**Cause:** Frontend trying to call OAuth endpoints directly

**Solution:**
- OAuth token exchange MUST be done from backend
- Only OAuth authorize (redirect) from frontend
- Use backend proxy for all API calls

---

## Summary

### App-Library Implementation Checklist

- [ ] Create `app-library` feature in `front-public`
- [ ] Implement PKCE utilities (`utils/pkce.ts`)
- [ ] Implement OAuth utilities (`utils/oauth.ts`)
- [ ] Create AppCard component
- [ ] Create main dashboard route
- [ ] Fetch apps from `/api/oauth-clients`
- [ ] Handle OAuth launch with PKCE
- [ ] Store PKCE params in sessionStorage
- [ ] Test complete flow

### External App Integration Checklist

- [ ] Register OAuth client with tools-dashboard admin
- [ ] Obtain `client_id` and `client_secret`
- [ ] Obtain API key
- [ ] Configure environment variables
- [ ] Implement OAuth callback endpoint (backend)
- [ ] Implement token exchange logic
- [ ] Implement token refresh logic
- [ ] Integrate with tools-dashboard APIs
- [ ] Implement frontend callback handler
- [ ] Test OAuth flow end-to-end

---

## Additional Resources

- **OAuth 2.0 Spec:** https://oauth.net/2/
- **PKCE RFC:** https://tools.ietf.org/html/rfc7636
- **JWT Spec:** https://jwt.io/
- **Tools-Dashboard Docs:** `.claude/features/auto-auth.md`

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-15
**Maintained By:** Tools Dashboard Team
**Contact:** dev@epicdev.com
