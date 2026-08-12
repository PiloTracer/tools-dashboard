# Client-App Roles — Integration Guide for OAuth Client Applications

**Audience:** developers of OAuth client applications registered in Tools Dashboard (e.g. E-Cards, Rizervox).
**Purpose:** how your application learns which *client-app roles* an authenticated user holds **for your app**, and how to act on them.
**Binding SPEC:** `.work/features/app-roles/20260811-SPEC.md` (Approved 2026-08-11) · **Introduced:** migration `014_app_user_roles.sql`, back-auth `app_roles` claim + `validate-token` field.

---

## 1. Concepts

| Term | Meaning |
|------|---------|
| `appsuper` | Per-app role. The user holds it **for one specific application** (granted by a platform admin on that app). |
| `appglobal` | All-apps role. The user holds it for **every** application, present and future (one standing grant). |

Both are **assigned and revoked by the platform administrator** in Tools Dashboard. Your application **cannot** grant them, and they confer **no privileges inside Tools Dashboard** — they exist purely so that *your* application can attach meaning to them.

> **Your app defines what the roles mean.** Tools Dashboard stores the assignment and reports it truthfully; what an `appsuper` or `appglobal` user is allowed to *do* inside your app is entirely your application's decision and enforcement.

Roles are reported as a **list of strings** (`app_roles`). Possible values today: `[]`, `["appsuper"]`, `["appglobal"]`, `["appsuper", "appglobal"]`. The list is **verbatim** — the platform never expands or implies one role from another. If your app wants "appglobal implies appsuper powers," implement that mapping yourself:

```python
roles = set(app_roles)
if "appglobal" in roles:
    roles.add("appsuper")  # your app's choice, not the platform's
```

**Forward compatibility:** new roles may appear in the future. Treat unknown entries as no-ops — check membership, never equality of the whole list.

---

## 2. Two ways to read the roles

| | Fast path — JWT claim | Authoritative — `validate-token` |
|---|---|---|
| Where | `app_roles` claim inside the access token you already receive | `POST /auth/internal/oauth/validate-token` |
| Extra network call | none | one |
| Freshness | snapshot at token issuance (stale ≤ 1 h after a grant/revoke) | real-time (computed from the database at call time) |
| Use for | ordinary page rendering, feature toggles | **security-sensitive decisions** (granting admin-like powers in your app) |

Rule of thumb: render with the claim, but call `validate-token` before honoring an elevated action — revocation takes effect immediately there, while the claim can lag up to the access-token TTL (1 hour).

---

## 3. Base URLs and endpoints

| Environment | Base URL |
|-------------|----------|
| Development (local stack) | `http://localhost:8082` |
| Production | `https://tools.datawork.top` |

| Endpoint (relative to base URL) | Method | Purpose |
|--------------------------------|--------|---------|
| `/oauth/authorize` | GET/POST | Start the authorization-code flow (user consent) |
| `/oauth/token` | POST | Exchange code → tokens; also `refresh_token` grant. Requires `client_id` + `client_secret` |
| `/.well-known/jwks.json` | GET | Public keys to verify JWTs locally |
| `/oauth/revoke` | POST | Revoke a token |
| `/auth/internal/oauth/validate-token` | POST | **Authoritative** token validation + role lookup (no client credentials needed; the token itself is the proof) |

### 3.1 Token response (`POST /oauth/token`)

Form-encoded request (`grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `client_secret`, optional `code_verifier`), JSON response:

```json
{
  "access_token": "<JWT>",
  "refresh_token": "<JWT>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid email profile"
}
```

Refresh tokens are **single-use with rotation** (30-day TTL): each `refresh_token` grant returns a new refresh token and invalidates the old one. Every newly issued access token recomputes `app_roles` — a refresh picks up grant/revoke changes.

### 3.2 Access-token JWT claims

Verify signature against the JWKS, then read claims:

| Claim | Type | Meaning |
|-------|------|---------|
| `sub` | string | User ID (integer as string, e.g. `"2"`) |
| `aud` | string | Your `client_id` — always verify it equals yours |
| `scope` | string | Space-separated scopes |
| `exp` / `iat` | number | Expiry / issued-at (epoch seconds) |
| `app_roles` | string[] | **Roles the user holds for your app** (per-app rows + `appglobal`) |

### 3.3 Authoritative check (`POST /auth/internal/oauth/validate-token`)

Request:

```json
{ "token": "<access_token>" }
```

Response:

```json
{
  "valid": true,
  "user_id": 2,
  "client_id": "ecards_a1b2c3d4",
  "scope": ["openid", "email", "profile"],
  "app_roles": ["appsuper"],
  "error": null
}
```

Notes:

- `valid: false` → token invalid/expired; treat the user as unauthenticated (`error` carries a message).
- `app_roles` is always present on valid tokens; `[]` means "no roles for your app."
- The answer is scoped to the token's own audience: you can only ever learn the user's roles **for your app**, never for other apps.

---

## 4. Code examples

### 4.1 Python (PyJWT) — fast path

```python
import jwt
from jwt import PyJWKSet

BASE_URL = "https://tools.datawork.top"
MY_CLIENT_ID = "ecards_a1b2c3d4"  # your registered client_id

jwks = PyJWKSet.from_cacheable(...)  # or jwt.PyJWKClient(f"{BASE_URL}/.well-known/jwks.json")

def roles_from_token(access_token: str) -> set[str]:
    payload = jwt.decode(
        access_token,
        key=jwks,  # signing key resolved from JWKS by kid
        audience=MY_CLIENT_ID,  # rejects tokens issued for other apps
        algorithms=["RS256"],
    )
    return set(payload.get("app_roles") or [])

# usage
roles = roles_from_token(access_token)
can_manage_cards = "appsuper" in roles or "appglobal" in roles
```

### 4.2 Python (httpx) — authoritative path

```python
import httpx

def roles_authoritative(access_token: str) -> set[str]:
    r = httpx.post(
        f"{BASE_URL}/auth/internal/oauth/validate-token",
        json={"token": access_token},
        timeout=5.0,
    )
    data = r.json()
    if not data.get("valid"):
        raise PermissionError(data.get("error") or "invalid token")
    return set(data.get("app_roles") or [])
```

### 4.3 Node.js (jose) — fast path

```ts
import { createRemoteJWKSet, jwtVerify } from "jose";

const BASE_URL = "https://tools.datawork.top";
const MY_CLIENT_ID = "ecards_a1b2c3d4";
const JWKS = createRemoteJWKSet(new URL(`${BASE_URL}/.well-known/jwks.json`));

export async function rolesFromToken(accessToken: string): Promise<Set<string>> {
  const { payload } = await jwtVerify(accessToken, JWKS, { audience: MY_CLIENT_ID });
  return new Set((payload.app_roles as string[] | undefined) ?? []);
}
```

### 4.4 curl — smoke-test the authoritative path

```bash
curl -s -X POST https://tools.datawork.top/auth/internal/oauth/validate-token \
  -H "Content-Type: application/json" \
  -d '{"token": "<access_token>"}'
# → {"valid":true,"user_id":2,"client_id":"ecards_a1b2c3d4","app_roles":["appsuper"],...}
```

---

## 5. Recommended integration pattern

1. **Login** as today: `/oauth/authorize` → `/oauth/token`.
2. **On each request**, verify the access token locally (JWKS) and read `app_roles` for ordinary authorization decisions.
3. **Before elevated actions** (anything you gate behind `appsuper`/`appglobal`), call `validate-token` and use its `app_roles` — this reflects revocations immediately.
4. **On `exp`**, use the refresh-token grant; the new access token carries a fresh `app_roles` snapshot.
5. **Never** cache `app_roles` beyond the access token's lifetime, and never trust a token whose `aud` ≠ your `client_id`.

## 6. Semantics checklist (what stays your responsibility)

- Mapping roles to permissions inside your app (e.g. "`appsuper` may manage card templates").
- Deciding whether `appglobal` implies `appsuper` powers (the platform reports them separately, verbatim).
- Denying by default: absent/empty `app_roles` = regular user.
- Handling future unknown roles gracefully (ignore them).

## 7. Reference

| Item | Location |
|------|----------|
| Feature SPEC (rules R1–R20, security model) | `.work/features/app-roles/20260811-SPEC.md` |
| Token issuance / validation implementation | `back-auth/features/auto-auth/api.py`, `domain.py` |
| Public OAuth endpoints | `front-public/app/routes/oauth.*.tsx`, `front-public/app/routes/.well-known.jwks.json.tsx` |
| Schema | `back-postgres/schema/014_app_user_roles.sql` |

## Changelog

| Date | Change |
|------|--------|
| 2026-08-12 | Initial guide (appsuper/appglobal, `app_roles` claim + validate-token) |
