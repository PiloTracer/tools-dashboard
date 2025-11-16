# Auto-Auth Feature Specification

**Document Version:** 2.0
**Last Updated:** 2025-11-15
**Purpose:** Define the auto-auth feature for integrating external applications (like E-Cards) with the tools-dashboard platform

---

## Overview

The **auto-auth** feature enables external applications to authenticate users via OAuth 2.0 and access user data, subscriptions, and rate limits from the tools-dashboard platform.

**Critical Perspective:**
- **This document** is written from the perspective of **tools-dashboard** (the OAuth provider)
- **tools-dashboard** provides two main endpoints:
  - `http://epicdev.com/app` - User-facing application (front-public) with OAuth authorization server
  - `http://epicdev.com/admin` - Admin API (back-api) for backend-to-backend integration
- **External applications** (like E-Cards at `http://localhost:7300/`) consume these services

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│         External Application (e.g., E-Cards)                │
│         http://localhost:7300/                              │
│                                                             │
│  Frontend:                                                  │
│  - Initiates OAuth flow → epicdev.com/app/oauth/authorize  │
│  - Receives callback with authorization code               │
│                                                             │
│  Backend:                                                   │
│  - Exchanges code for tokens ← epicdev.com/app/oauth/token │
│  - Fetches user data ← epicdev.com/admin/api/users/:id     │
│  - Validates subscription ← epicdev.com/admin/api/...      │
└─────────────────────────────────────────────────────────────┘
                           ↑         │
                           │         │
        OAuth redirect     │         │ API calls
        (user browser)     │         │ (with API key)
                           │         ▼
┌──────────────────────────┴──────────────────────────────────┐
│              tools-dashboard (OAuth Provider)               │
│              http://epicdev.com                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  front-public (User App)                            │   │
│  │  http://epicdev.com/app                             │   │
│  │                                                      │   │
│  │  - User dashboard with app shortcuts                │   │
│  │  - OAuth 2.0 Authorization Server:                  │   │
│  │    • GET /oauth/authorize (user consent)            │   │
│  │    • POST /oauth/token (token exchange)             │   │
│  │    • POST /oauth/revoke (token revocation)          │   │
│  │    • GET /.well-known/jwks.json (public keys)       │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↑                                  │
│                          │ delegates auth to                │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  back-auth (Authentication Service)                 │   │
│  │  Internal service (not exposed)                     │   │
│  │                                                      │   │
│  │  Features:                                           │   │
│  │  - auto-auth/                                        │   │
│  │    • domain.py (OAuth logic, PKCE, JWT signing)     │   │
│  │    • infrastructure.py (key storage, code gen)      │   │
│  │    • api.py (internal endpoints)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  back-api (Business Logic API)                      │   │
│  │  http://epicdev.com/admin                           │   │
│  │                                                      │   │
│  │  Features:                                           │   │
│  │  - auto-auth/                                        │   │
│  │    • api.py (public API endpoints)                  │   │
│  │      - GET /api/users/:userId                       │   │
│  │      - GET /api/users/:userId/subscription          │   │
│  │      - GET /api/users/:userId/limits                │   │
│  │      - POST /api/users/:userId/verify               │   │
│  │      - POST /api/oauth-clients (register clients)   │   │
│  │    • domain.py (business logic)                     │   │
│  │    • infrastructure.py (DB integration)             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  front-admin (Admin Dashboard)                      │   │
│  │  http://epicdev.com/admin                           │   │
│  │                                                      │   │
│  │  Features:                                           │   │
│  │  - auto-auth/                                        │   │
│  │    • routes/ (Remix routes)                         │   │
│  │      - oauth-clients (manage client registrations)  │   │
│  │      - api-keys (manage API keys)                   │   │
│  │    • ui/ (React components)                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature Structure

Following the tools-dashboard feature-centered architecture, the auto-auth feature will be implemented across multiple layers:

### 1. Shared Contracts (`shared/contracts/auto-auth/`)

**Purpose:** Define data models and interfaces shared across all services

```
shared/contracts/auto-auth/
├── feature.yaml                  # Feature contract definition
├── models.py                     # Pydantic models
│   ├── OAuthClient              # OAuth client registration
│   ├── OAuthAuthorizationCode   # Authorization code
│   ├── OAuthToken               # Access/refresh tokens
│   ├── UserProfile              # User profile for external apps
│   ├── UserSubscription         # Subscription details
│   └── RateLimits               # Usage limits
└── __init__.py
```

### 2. Back-Auth Feature (`back-auth/features/auto-auth/`)

**Purpose:** Implement OAuth 2.0 server logic

```
back-auth/features/auto-auth/
├── feature.yaml                  # Feature metadata
├── api.py                        # Internal FastAPI routes (not exposed)
│   ├── POST /internal/oauth/generate-code
│   ├── POST /internal/oauth/validate-code
│   ├── POST /internal/oauth/issue-tokens
│   └── POST /internal/oauth/validate-token
├── domain.py                     # OAuth business logic
│   ├── generate_authorization_code()
│   ├── validate_pkce()
│   ├── issue_access_token()     # RS256 JWT signing
│   ├── issue_refresh_token()
│   └── revoke_token()
├── infrastructure.py             # Data persistence
│   ├── store_authorization_code()
│   ├── get_authorization_code()
│   ├── store_token()
│   ├── get_token()
│   └── revoke_token_in_db()
└── __init__.py
```

**Key Responsibilities:**
- Generate and validate authorization codes (10-minute expiry)
- Implement PKCE (Proof Key for Code Exchange) validation
- Sign JWT tokens using RS256 (RSA with SHA-256)
- Store and manage RSA key pairs
- Validate code_verifier against code_challenge
- Issue short-lived access tokens (1 hour)
- Issue long-lived refresh tokens (30 days, single-use with rotation)
- Store tokens in Cassandra (auth_events keyspace)

### 3. Back-API Feature (`back-api/features/auto-auth/`)

**Purpose:** Public API endpoints for external applications

```
back-api/features/auto-auth/
├── feature.yaml                  # Feature metadata
├── api.py                        # Public FastAPI routes
│   ├── GET /api/users/:userId
│   ├── GET /api/users/:userId/subscription
│   ├── GET /api/users/:userId/limits
│   ├── POST /api/users/:userId/verify
│   ├── POST /api/users/:userId/usage
│   ├── POST /api/oauth-clients          # Register OAuth clients
│   ├── GET /api/oauth-clients/:clientId
│   ├── PUT /api/oauth-clients/:clientId
│   └── DELETE /api/oauth-clients/:clientId
├── domain.py                     # Business logic
│   ├── get_user_profile()
│   ├── get_user_subscription()
│   ├── get_user_limits()
│   ├── verify_user_permissions()
│   ├── record_usage_event()
│   └── manage_oauth_clients()
├── infrastructure.py             # Service integration
│   ├── fetch_user_from_postgres()
│   ├── fetch_subscription_from_postgres()
│   ├── fetch_limits_from_redis()
│   └── store_usage_event()
└── __init__.py
```

**Key Responsibilities:**
- Validate API key authentication
- Provide user profile data to external apps
- Provide subscription tier and features
- Provide rate limits and current usage
- Record usage events for billing
- Manage OAuth client registrations
- Enforce rate limiting (100 req/min per API key)

### 4. Front-Public Feature (`front-public/app/features/auto-auth/`)

**Purpose:** User-facing OAuth authorization flow

```
front-public/app/features/auto-auth/
├── feature.yaml                  # Feature metadata
├── routes/
│   ├── oauth.authorize.tsx       # GET /oauth/authorize (consent screen)
│   ├── oauth.token.tsx           # POST /oauth/token (token exchange)
│   ├── oauth.revoke.tsx          # POST /oauth/revoke
│   ├── .well-known.jwks.json.tsx # GET /.well-known/jwks.json
│   └── .well-known.openid-configuration.tsx # OAuth discovery
├── ui/
│   ├── ConsentScreen.tsx         # OAuth consent UI
│   ├── AppShortcuts.tsx          # Dashboard shortcuts (E-Cards button)
│   └── OAuthError.tsx            # Error display
└── __init__.py
```

**Key Responsibilities:**
- Display OAuth consent screen (first-time only)
- Handle authorization approval/denial
- Redirect to external app with authorization code
- Serve OAuth token endpoint (delegates to back-auth)
- Serve public keys for JWT validation (JWKS)
- Provide OAuth discovery document

### 5. Front-Admin Feature (`front-admin/app/features/auto-auth/`)

**Purpose:** Admin interface for managing OAuth clients and API keys

```
front-admin/app/features/auto-auth/
├── feature.yaml                  # Feature metadata
├── routes/
│   ├── oauth-clients.tsx         # List OAuth clients
│   ├── oauth-clients.$id.tsx     # Edit OAuth client
│   ├── oauth-clients.new.tsx     # Register new OAuth client
│   ├── api-keys.tsx              # List API keys
│   └── api-keys.$id.tsx          # Edit API key
├── ui/
│   ├── OAuthClientList.tsx       # Table of OAuth clients
│   ├── OAuthClientForm.tsx       # Client registration form
│   ├── ApiKeyList.tsx            # Table of API keys
│   └── ApiKeyGenerator.tsx       # Generate new API keys
└── __init__.py
```

**Key Responsibilities:**
- Register OAuth clients (client_id, client_secret, redirect_uris)
- Manage API keys for external apps
- Display OAuth client details
- Rotate API keys
- Monitor OAuth usage and logs

---

## OAuth 2.0 Authorization Flow

### Step 1: External App Initiates OAuth Flow

**External App (E-Cards):**
```javascript
// User clicks "Sign in with Tools Dashboard"
window.location.href =
  'http://epicdev.com/app/oauth/authorize?' +
  'client_id=ecards_app' +
  '&redirect_uri=http://localhost:7300/auth/callback' +
  '&response_type=code' +
  '&scope=profile+email+subscription' +
  '&state=RANDOM_CSRF_TOKEN' +
  '&code_challenge=BASE64_SHA256_HASH' +
  '&code_challenge_method=S256';
```

### Step 2: tools-dashboard Shows Consent Screen

**Route:** `front-public/app/features/auto-auth/routes/oauth.authorize.tsx`

**Loader:**
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id');
  const redirectUri = url.searchParams.get('redirect_uri');
  const scope = url.searchParams.get('scope');
  const state = url.searchParams.get('state');
  const codeChallenge = url.searchParams.get('code_challenge');
  const codeChallengeMethod = url.searchParams.get('code_challenge_method');

  // Validate request parameters
  if (!clientId || !redirectUri || !scope || !state || !codeChallenge) {
    return redirect(`${redirectUri}?error=invalid_request&state=${state}`);
  }

  // Get OAuth client details from back-api
  const client = await fetch(`${BACK_API_URL}/api/oauth-clients/${clientId}`);

  if (!client.ok) {
    return redirect(`${redirectUri}?error=unauthorized_client&state=${state}`);
  }

  const clientData = await client.json();

  // Validate redirect_uri is registered
  if (!clientData.redirect_uris.includes(redirectUri)) {
    return redirect(`${redirectUri}?error=invalid_redirect_uri&state=${state}`);
  }

  // Check if user is authenticated
  const session = await getSession(request.headers.get('Cookie'));
  if (!session.userId) {
    // Redirect to login, then back to OAuth authorize
    return redirect(`/signin?return_to=${encodeURIComponent(request.url)}`);
  }

  // Check if user has already consented
  const hasConsented = await checkUserConsent(session.userId, clientId);

  if (hasConsented) {
    // Skip consent screen, generate code and redirect
    const authCode = await generateAuthorizationCode({
      userId: session.userId,
      clientId,
      scope,
      codeChallenge,
      codeChallengeMethod,
      redirectUri
    });

    return redirect(`${redirectUri}?code=${authCode}&state=${state}`);
  }

  // Show consent screen
  return json({
    client: clientData,
    scope: scope.split(' '),
    redirectUri,
    state,
    codeChallenge
  });
}
```

**Action (User Approves):**
```typescript
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get('action'); // "approve" or "deny"
  const clientId = formData.get('client_id');
  const redirectUri = formData.get('redirect_uri');
  const state = formData.get('state');
  const scope = formData.get('scope');
  const codeChallenge = formData.get('code_challenge');
  const codeChallengeMethod = formData.get('code_challenge_method');

  const session = await getSession(request.headers.get('Cookie'));

  if (action === 'deny') {
    return redirect(`${redirectUri}?error=access_denied&state=${state}`);
  }

  // Generate authorization code via back-auth
  const authCode = await fetch(`${BACK_AUTH_URL}/internal/oauth/generate-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: session.userId,
      clientId,
      scope,
      codeChallenge,
      codeChallengeMethod,
      redirectUri,
      expiresIn: 600 // 10 minutes
    })
  });

  const { code } = await authCode.json();

  // Store user consent
  await storeUserConsent(session.userId, clientId, scope);

  // Redirect back to external app with code
  return redirect(`${redirectUri}?code=${code}&state=${state}`);
}
```

**UI:**
```tsx
export default function OAuthAuthorize() {
  const { client, scope, redirectUri, state } = useLoaderData<typeof loader>();

  return (
    <div className="consent-screen">
      <h1>Authorize {client.name}</h1>

      <div className="client-info">
        <img src={client.logo_url} alt={client.name} />
        <p>{client.description}</p>
      </div>

      <div className="permissions">
        <h2>This application will be able to:</h2>
        <ul>
          {scope.includes('profile') && <li>Read your profile information</li>}
          {scope.includes('email') && <li>Read your email address</li>}
          {scope.includes('subscription') && <li>Check your subscription status</li>}
        </ul>
      </div>

      <Form method="post">
        <input type="hidden" name="client_id" value={client.client_id} />
        <input type="hidden" name="redirect_uri" value={redirectUri} />
        <input type="hidden" name="state" value={state} />
        <input type="hidden" name="scope" value={scope.join(' ')} />

        <button type="submit" name="action" value="approve">
          Allow
        </button>
        <button type="submit" name="action" value="deny">
          Deny
        </button>
      </Form>
    </div>
  );
}
```

### Step 3: External App Exchanges Code for Tokens

**External App Request:**
```http
POST /oauth/token HTTP/1.1
Host: epicdev.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE_FROM_REDIRECT
&redirect_uri=http://localhost:7300/auth/callback
&client_id=ecards_app
&client_secret=CLIENT_SECRET
&code_verifier=ORIGINAL_PKCE_CODE_VERIFIER
```

**Route:** `front-public/app/features/auto-auth/routes/oauth.token.tsx`

**Action:**
```typescript
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const grantType = formData.get('grant_type');
  const code = formData.get('code');
  const redirectUri = formData.get('redirect_uri');
  const clientId = formData.get('client_id');
  const clientSecret = formData.get('client_secret');
  const codeVerifier = formData.get('code_verifier');

  // Validate grant type
  if (grantType !== 'authorization_code' && grantType !== 'refresh_token') {
    return json(
      { error: 'unsupported_grant_type' },
      { status: 400 }
    );
  }

  // Validate client credentials
  const client = await validateClient(clientId, clientSecret);
  if (!client) {
    return json(
      { error: 'invalid_client' },
      { status: 401 }
    );
  }

  if (grantType === 'authorization_code') {
    // Validate authorization code via back-auth
    const validation = await fetch(`${BACK_AUTH_URL}/internal/oauth/validate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        clientId,
        redirectUri,
        codeVerifier
      })
    });

    if (!validation.ok) {
      const error = await validation.json();
      return json(error, { status: 400 });
    }

    const { userId, scope } = await validation.json();

    // Issue tokens via back-auth
    const tokens = await fetch(`${BACK_AUTH_URL}/internal/oauth/issue-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        clientId,
        scope
      })
    });

    const tokenData = await tokens.json();

    return json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: scope
    });
  }

  if (grantType === 'refresh_token') {
    const refreshToken = formData.get('refresh_token');

    // Validate and rotate refresh token via back-auth
    const tokens = await fetch(`${BACK_AUTH_URL}/internal/oauth/refresh-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken,
        clientId
      })
    });

    if (!tokens.ok) {
      return json(
        { error: 'invalid_grant' },
        { status: 400 }
      );
    }

    const tokenData = await tokens.json();

    return json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: 'Bearer',
      expires_in: 3600
    });
  }
}
```

### Step 4: External App Fetches User Data

**External App Request:**
```http
GET /api/users/user123 HTTP/1.1
Host: epicdev.com
Authorization: Bearer ECARDS_API_KEY
Accept: application/json
```

**Route:** `back-api/features/auto-auth/api.py`

```python
from fastapi import APIRouter, Header, HTTPException, Depends
from .domain import get_user_profile, get_user_subscription, get_user_limits
from .infrastructure import validate_api_key

router = APIRouter(prefix="/api", tags=["auto-auth"])

async def verify_api_key(authorization: str = Header(...)):
    """Dependency to validate API key"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    api_key = authorization.replace("Bearer ", "")
    client = await validate_api_key(api_key)

    if not client:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return client

@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    client = Depends(verify_api_key)
):
    """Get user profile for external app"""
    user = await get_user_profile(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "email": user.email,
        "name": user.full_name,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "status": user.status,
        "createdAt": user.created_at.isoformat(),
        "updatedAt": user.updated_at.isoformat()
    }

@router.get("/users/{user_id}/subscription")
async def get_subscription(
    user_id: str,
    client = Depends(verify_api_key)
):
    """Get user subscription details"""
    subscription = await get_user_subscription(user_id)

    if not subscription:
        raise HTTPException(status_code=403, detail="No active subscription")

    return {
        "userId": user_id,
        "tier": subscription.tier,
        "plan": subscription.plan_name,
        "status": subscription.status,
        "features": subscription.features,
        "validUntil": subscription.valid_until.isoformat()
    }

@router.get("/users/{user_id}/limits")
async def get_limits(
    user_id: str,
    client = Depends(verify_api_key)
):
    """Get user rate limits and current usage"""
    limits = await get_user_limits(user_id)

    return {
        "userId": user_id,
        "subscriptionTier": limits.tier,
        "limits": limits.limits,
        "resetDate": limits.reset_date.isoformat()
    }
```

---

## Database Schema

### PostgreSQL (User Data)

**Table: `oauth_clients`**
```sql
CREATE TABLE oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(255) UNIQUE NOT NULL,
    client_secret_hash VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    redirect_uris TEXT[] NOT NULL,
    allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY['profile', 'email'],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);
```

**Table: `oauth_consents`**
```sql
CREATE TABLE oauth_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    client_id VARCHAR(255) REFERENCES oauth_clients(client_id) NOT NULL,
    scope TEXT[] NOT NULL,
    granted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, client_id)
);
```

**Table: `oauth_api_keys`**
```sql
CREATE TABLE oauth_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(255) REFERENCES oauth_clients(client_id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);
```

### Cassandra (Auth Events)

**Table: `auth_events.oauth_authorization_codes`**
```cql
CREATE TABLE auth_events.oauth_authorization_codes (
    code TEXT PRIMARY KEY,
    user_id UUID,
    client_id TEXT,
    scope SET<TEXT>,
    redirect_uri TEXT,
    code_challenge TEXT,
    code_challenge_method TEXT,
    issued_at TIMESTAMP,
    expires_at TIMESTAMP,
    used BOOLEAN,
    used_at TIMESTAMP
);
```

**Table: `auth_events.oauth_tokens`**
```cql
CREATE TABLE auth_events.oauth_tokens (
    token_id UUID PRIMARY KEY,
    user_id UUID,
    client_id TEXT,
    token_type TEXT, -- 'access' or 'refresh'
    token_hash TEXT,
    scope SET<TEXT>,
    issued_at TIMESTAMP,
    expires_at TIMESTAMP,
    revoked BOOLEAN,
    revoked_at TIMESTAMP
);

CREATE INDEX ON auth_events.oauth_tokens (user_id);
CREATE INDEX ON auth_events.oauth_tokens (token_hash);
```

**Table: `auth_events.oauth_rsa_keys`**
```cql
CREATE TABLE auth_events.oauth_rsa_keys (
    key_id TEXT PRIMARY KEY,
    public_key TEXT,
    private_key TEXT,
    algorithm TEXT DEFAULT 'RS256',
    created_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN
);
```

### Redis (Caching & Rate Limiting)

**Keys:**
```
oauth:limits:{api_key}:{minute}  # Rate limiting for API keys
oauth:user:{user_id}:limits      # Cached user limits (1 hour TTL)
oauth:user:{user_id}:subscription # Cached subscription (1 hour TTL)
```

---

## API Endpoints Summary

### Front-Public (User-Facing OAuth)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/oauth/authorize` | OAuth authorization endpoint (consent screen) |
| POST | `/oauth/token` | Token exchange (authorization code → tokens) |
| POST | `/oauth/revoke` | Token revocation |
| GET | `/.well-known/jwks.json` | Public keys for JWT validation |
| GET | `/.well-known/openid-configuration` | OAuth discovery document |

### Back-API (External App Integration)

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/api/users/:userId` | Get user profile | API Key |
| GET | `/api/users/:userId/subscription` | Get subscription details | API Key |
| GET | `/api/users/:userId/limits` | Get rate limits and usage | API Key |
| POST | `/api/users/:userId/verify` | Verify user permissions | API Key |
| POST | `/api/users/:userId/usage` | Record usage event | API Key |
| POST | `/api/oauth-clients` | Register OAuth client | Admin |
| GET | `/api/oauth-clients/:clientId` | Get OAuth client details | Admin |
| PUT | `/api/oauth-clients/:clientId` | Update OAuth client | Admin |
| DELETE | `/api/oauth-clients/:clientId` | Delete OAuth client | Admin |
| POST | `/api/api-keys` | Generate API key | Admin |
| GET | `/api/api-keys` | List API keys | Admin |
| DELETE | `/api/api-keys/:keyId` | Revoke API key | Admin |

### Back-Auth (Internal Only)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/internal/oauth/generate-code` | Generate authorization code |
| POST | `/internal/oauth/validate-code` | Validate authorization code + PKCE |
| POST | `/internal/oauth/issue-tokens` | Issue access + refresh tokens |
| POST | `/internal/oauth/refresh-tokens` | Refresh access token |
| POST | `/internal/oauth/validate-token` | Validate access token |
| POST | `/internal/oauth/revoke-token` | Revoke token |

---

## Security Considerations

### 1. PKCE (Proof Key for Code Exchange)

**Required for all OAuth flows:**
- External app generates `code_verifier` (random 43-128 char string)
- External app computes `code_challenge = BASE64URL(SHA256(code_verifier))`
- External app sends `code_challenge` in `/oauth/authorize`
- External app sends `code_verifier` in `/oauth/token`
- tools-dashboard validates: `SHA256(code_verifier) === code_challenge`

### 2. JWT Token Security

**Access Tokens:**
- Algorithm: RS256 (RSA with SHA-256)
- Expiry: 1 hour
- Claims:
  - `sub`: User ID
  - `email`: User email
  - `name`: User full name
  - `iss`: `http://epicdev.com`
  - `aud`: Client ID
  - `iat`: Issued at timestamp
  - `exp`: Expiry timestamp

**Refresh Tokens:**
- Algorithm: RS256
- Expiry: 30 days
- Single-use with rotation
- Stored in Cassandra with hash

### 3. API Key Security

- Format: `eak_` prefix + 64 random alphanumeric characters
- Stored as bcrypt hash in PostgreSQL
- Rate limited: 100 requests/minute per API key
- Support key rotation with grace period

### 4. Rate Limiting

**OAuth Endpoints:**
- `/oauth/authorize`: 10 requests/minute per IP
- `/oauth/token`: 5 requests/minute per client_id

**Admin API Endpoints:**
- All endpoints: 100 requests/minute per API key

---

## External Application Requirements

To integrate with tools-dashboard auto-auth, external applications must:

### 1. OAuth 2.0 Client Registration

**Register via Admin Dashboard:**
1. Navigate to `http://epicdev.com/admin/oauth-clients/new`
2. Provide:
   - Application name
   - Description
   - Logo URL
   - Redirect URIs (e.g., `http://localhost:7300/auth/callback`)
   - Requested scopes (profile, email, subscription)
3. Receive:
   - `client_id` (e.g., `ecards_app`)
   - `client_secret` (store securely!)

### 2. Implement OAuth 2.0 Flow

**Step 1: Redirect to Authorization Endpoint**
```javascript
const codeVerifier = generateRandomString(128);
const codeChallenge = base64UrlEncode(sha256(codeVerifier));

sessionStorage.setItem('pkce_code_verifier', codeVerifier);

window.location.href =
  'http://epicdev.com/app/oauth/authorize?' +
  `client_id=${CLIENT_ID}` +
  `&redirect_uri=${REDIRECT_URI}` +
  `&response_type=code` +
  `&scope=profile email subscription` +
  `&state=${generateCSRFToken()}` +
  `&code_challenge=${codeChallenge}` +
  `&code_challenge_method=S256`;
```

**Step 2: Handle Callback**
```javascript
// Callback route: /auth/callback
const url = new URL(window.location.href);
const code = url.searchParams.get('code');
const state = url.searchParams.get('state');

// Validate state (CSRF protection)
if (state !== sessionStorage.getItem('oauth_state')) {
  throw new Error('Invalid state');
}

// Exchange code for tokens (backend)
const codeVerifier = sessionStorage.getItem('pkce_code_verifier');

const response = await fetch('/api/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code,
    codeVerifier
  })
});

const { access_token, refresh_token } = await response.json();

// Store tokens securely (httpOnly cookie recommended)
```

**Step 3: Use Access Token**
```javascript
// Backend: Fetch user data
const userResponse = await fetch(
  `http://epicdev.com/admin/api/users/${userId}`,
  {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  }
);

const user = await userResponse.json();
```

### 3. API Key Configuration

**Obtain API key from Admin Dashboard:**
1. Navigate to `http://epicdev.com/admin/api-keys/new`
2. Provide:
   - Key name (e.g., "E-Cards Production")
   - Description
   - Expiry date (optional)
3. Receive API key (e.g., `eak_4f3b9a8c7d6e5f4a3b2c1d0e...`)
4. Store in environment variable: `EXTERNAL_API_KEY`

---

## Testing Strategy

### Unit Tests

**Back-Auth:**
- PKCE validation logic
- JWT token signing and validation
- Authorization code generation and expiry
- Refresh token rotation

**Back-API:**
- API key validation
- User profile retrieval
- Subscription validation
- Rate limiting enforcement

### Integration Tests

**OAuth Flow:**
1. User initiates OAuth from external app
2. User sees consent screen
3. User approves
4. External app receives authorization code
5. External app exchanges code for tokens
6. External app fetches user data with API key

**Error Scenarios:**
- Invalid client credentials
- Expired authorization code
- Invalid PKCE code_verifier
- Revoked tokens
- Rate limit exceeded
- API key revoked

### End-to-End Tests

**Scenario: E-Cards Integration**
1. User clicks "E-Cards" button in tools-dashboard
2. E-Cards opens in new tab
3. E-Cards initiates OAuth flow
4. User approves consent
5. E-Cards receives user profile and subscription
6. E-Cards displays user dashboard
7. E-Cards creates batch (records usage via API)

---

## Monitoring & Observability

### Metrics to Track

**OAuth Metrics:**
- OAuth authorization requests per minute
- OAuth token exchanges per minute
- Failed authorization attempts
- Token revocation rate

**API Metrics:**
- API requests per minute per client
- API error rate per endpoint
- API latency (p50, p95, p99)
- Rate limit hits per API key

**Business Metrics:**
- Number of registered OAuth clients
- Number of active users per external app
- Usage events per external app
- Revenue per external app (if applicable)

### Logging

**Log Events:**
- OAuth authorization granted/denied
- Token issued/refreshed/revoked
- API key created/rotated/revoked
- Failed authentication attempts
- Rate limit violations

**Log Format (JSON):**
```json
{
  "timestamp": "2025-11-15T14:30:00Z",
  "level": "INFO",
  "event": "oauth.authorization.granted",
  "userId": "user123",
  "clientId": "ecards_app",
  "scope": ["profile", "email", "subscription"],
  "ip": "192.168.1.100"
}
```

---

## Implementation Checklist

### Shared Contracts
- [ ] Define Pydantic models in `shared/contracts/auto-auth/models.py`
- [ ] Create `feature.yaml` contract

### Back-Auth
- [ ] Implement authorization code generation (10-min expiry)
- [ ] Implement PKCE validation
- [ ] Implement RSA key generation and storage
- [ ] Implement JWT token signing (RS256)
- [ ] Implement refresh token rotation
- [ ] Create Cassandra tables for auth events
- [ ] Write unit tests

### Back-API
- [ ] Implement API key validation middleware
- [ ] Implement `/api/users/:userId` endpoint
- [ ] Implement `/api/users/:userId/subscription` endpoint
- [ ] Implement `/api/users/:userId/limits` endpoint
- [ ] Implement OAuth client registration endpoints
- [ ] Implement API key management endpoints
- [ ] Create PostgreSQL tables
- [ ] Implement rate limiting
- [ ] Write unit tests

### Front-Public
- [ ] Create consent screen UI
- [ ] Implement `/oauth/authorize` route (loader + action)
- [ ] Implement `/oauth/token` route (action)
- [ ] Implement `/oauth/revoke` route (action)
- [ ] Implement `/.well-known/jwks.json` route
- [ ] Implement `/.well-known/openid-configuration` route
- [ ] Add OAuth error handling
- [ ] Write integration tests

### Front-Admin
- [ ] Create OAuth client management UI
- [ ] Create API key management UI
- [ ] Implement OAuth client CRUD routes
- [ ] Implement API key generation UI
- [ ] Add OAuth usage analytics dashboard
- [ ] Write E2E tests

### Infrastructure
- [ ] Configure nginx routes for OAuth endpoints
- [ ] Add OAuth endpoints to API gateway
- [ ] Configure CORS for external apps
- [ ] Set up monitoring and alerting
- [ ] Create deployment scripts

---

## Documentation for External Developers

**External App Integration Guide:**
- OAuth 2.0 flow documentation
- API endpoint reference
- Code examples (JavaScript, Python, curl)
- Postman collection
- Test credentials

**Admin Documentation:**
- How to register OAuth clients
- How to generate API keys
- How to monitor OAuth usage
- How to rotate API keys
- Security best practices

---

**Document Owner:** Tools Dashboard Team
**Last Reviewed:** 2025-11-15
**Next Review:** 2025-12-15

For questions or support, contact: dev@epicdev.com
