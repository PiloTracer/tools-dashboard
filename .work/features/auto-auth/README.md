# Feature: Auto-Auth (OAuth 2.0 & API Authentication)

## Overview

Auto-Auth provides comprehensive authentication and authorization across the Tools Dashboard platform. It includes:
- **OAuth 2.0 Authorization Server** for third-party application access
- **External API Authentication** via API keys
- **OAuth Client Management** for admin dashboard
- **Token management** (generation, validation, revocation)

This feature enables secure integration with external applications while maintaining robust internal authentication.

## User Stories

### External App Developers
- As an app developer, I want to register my application as an OAuth client
- As a developer, I want to implement OAuth 2.0 flow to authenticate users
- As a developer, I want to manage OAuth credentials securely

### Admin Users
- As an admin, I want to manage OAuth clients (create, read, update, delete)
- As an admin, I want to generate and revoke API keys for system integrations
- As an admin, I want to monitor OAuth client activity

### End Users
- As a user, I want to grant permission for apps to access my data
- As a user, I want to see which apps have access to my account
- As a user, I want to revoke app access at any time

### System Users (API Clients)
- As an API client, I want to authenticate using API keys
- As an API client, I want to access user data with proper authorization
- As an API client, I want to track my usage and limits

## Key Workflows

### OAuth 2.0 Flow
1. External app redirects user to Tools Dashboard authorization endpoint
2. User logs in (if not authenticated)
3. User sees consent screen with requested scopes
4. User grants permission
5. User is redirected back to app with authorization code
6. App exchanges code for access token (backend)
7. App uses token to access user data via API

### API Key Flow
1. Admin generates API key in dashboard
2. Admin copies key and provides to external system
3. External system includes key in Authorization header
4. Back-API validates key and grants access
5. System records usage for rate limiting and auditing

### OAuth Client Management
1. Admin navigates to OAuth clients section
2. Admin creates new client with redirect URLs
3. System generates client ID and secret
4. Admin can view, update, or delete clients
5. All changes are audited

## Key Features

- **OAuth 2.0 Support**: Authorization code flow with PKCE
- **API Key Authentication**: Secure server-to-server communication
- **Token Management**: Generation, validation, and revocation
- **Consent Screens**: User-friendly permission requests
- **Rate Limiting**: Usage-based rate limits per client
- **Audit Logging**: Complete trail of auth operations
- **Session Management**: Secure session handling
- **JWKS Endpoint**: Public key publication for token verification

## Technical Requirements

### Services Involved
- **front-public**: User consent screens, OAuth endpoints
- **front-admin**: OAuth client management UI
- **back-api**: OAuth client CRUD, API key management
- **back-auth**: Core OAuth server, token generation
- **back-postgres**: Client storage, API keys, audit logs
- **back-cassandra**: Auth events, historical records

### Security Considerations
- **PKCE Required**: All OAuth flows use PKCE (Proof Key for Code Exchange)
- **HTTPS Only**: All OAuth endpoints require HTTPS
- **CSRF Protection**: State parameter prevents CSRF attacks
- **Token Storage**: Access tokens stored in session storage (not localStorage)
- **Rate Limiting**: Prevents brute force and abuse
- **Audit Trail**: All authentication events logged

### Dependencies
- bcrypt >= 4.0.0 (password hashing)
- JWT library (token generation/validation)
- PostgreSQL (client/key storage)
- Cassandra (event logging)

## Performance Targets
- OAuth token exchange: < 500ms
- API key validation: < 100ms
- Consent screen rendering: < 2s

## Known Limitations
- PKCE is mandatory (cannot be disabled)
- Token lifetime is fixed at 1 hour for access tokens
- Refresh token flow not yet implemented
- Rate limiting is per-key, not per-user

## Testing Strategy

### Unit Tests
- OAuth parameter validation
- Token generation and signing
- API key validation
- PKCE verification

### Integration Tests
- Full OAuth flow end-to-end
- API key authentication
- Token refresh (future)
- Rate limit enforcement

### E2E Tests
- User consent flow
- Client management flow
- API key usage flow

## Compliance & Standards
- **OAuth 2.0**: RFC 6749
- **PKCE**: RFC 7636
- **OpenID Connect**: Discovery document
- **JWT**: RFC 7519

---

Last Updated: November 28, 2025
