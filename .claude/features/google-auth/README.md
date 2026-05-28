# Feature: Google-Auth

> **Current code (April 2026):** `back-auth/features/google-auth/api.py` exposes a minimal `/auth/google/start` helper. End-user Google sign-in and callback handling are implemented in the **user-registration** feature on both `front-public` and `back-auth` (`/user-registration/providers/google/...`). The bullets below describe the intended product behavior, not necessarily shipped backend depth.

## Overview

Google-Auth provides OAuth 2.0 authentication via Google. This allows users to:
- Sign up and log in using their Google account
- Link/unlink Google account to existing email account
- Access profile information from Google
- Never need to remember another password

## User Stories

### Users
- As a user, I want to sign up using my Google account
- As a user, I want to log in with "Sign in with Google"
- As a user, I want to link my Google account to my existing account
- As a user, I want to unlink my Google account

## Key Workflows

### Sign Up with Google
1. User clicks "Sign up with Google"
2. User is redirected to Google login
3. User grants permission
4. User is redirected back with Google profile data
5. Account is created with email from Google
6. User is logged in

### Login with Google
1. User clicks "Sign in with Google"
2. Same OAuth flow as above
3. Existing account is found
4. User is logged in

## Key Features

- **OAuth 2.0 Flow**: Authorization code with PKCE
- **Profile Data**: Get email and name from Google
- **Account Linking**: Connect Google to existing account
- **Session Management**: Automatic session creation
- **Audit Trail**: Login events logged

## Technical Requirements

### Services Involved
- **front-public**: Google OAuth UI
- **back-auth**: Google OAuth handling
- **Google OAuth API**: External service
- **back-postgres**: Account storage
- **back-cassandra**: Event logging

### Security Considerations
- **PKCE Required**: Proof Key for Code Exchange
- **HTTPS Only**: All OAuth redirects HTTPS
- **State Parameter**: CSRF protection
- **Token Validation**: Verify tokens from Google
- **Rate Limiting**: Prevent abuse

### Dependencies
- google-auth-oauthlib
- requests >= 2.28.0

## Performance Targets
- OAuth redirect: < 500ms
- Token exchange: < 1s

## Known Limitations
- No refresh token handling
- Cannot access Google Calendar or Drive
- Limited scopes (profile, email only)

---

Last Updated: April 22, 2026
