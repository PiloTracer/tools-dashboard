# Technical Guide: Third-Party OAuth Integration with Tools Dashboard (for LLMs)

**Audience:** Coding agents and engineers implementing an **OAuth 2.0 client** (e.g. Next.js CMS, SPA + BFF) that uses **Tools Dashboard** as the **authorization server** (IdP).

**Repository note:** File paths in **§11** point at the **`tools-dashboard`** monorepo (IdP implementation). If you work in another repo (e.g. `tools-rizervox`), treat this document as a **protocol and behavior contract**; you do not have those files locally—mirror critical sections into your own `.ai/docs/reference/` if your team copies guides there.

**Not covered here:** Admin-only APIs, API-key **auto-auth** routes (`/api/users/{user_id}` style), Docker compose for Tools Dashboard — see linked docs below.

**Longer narrative + Next.js samples:** `.ai/features/app-library/OAUTH_IMPLEMENTATION_GUIDE.md` — **verify HTTP shapes against §5–6 here**; older examples may use JSON on `/oauth/token` (**wrong** for current Tools Dashboard).

**Browser E2E against Tools Dashboard:** `.ai/docs/20260430-e2e-oauth.md`.

---

## 1. Mental model

| Role | System |
|------|--------|
| **Authorization server** | Tools Dashboard: user-facing OAuth on **`front-public`**, token/crypto on **`back-auth`** (`/internal/oauth/*` — **do not call from your backend**; use public `/oauth/*` only). |
| **Your app** | **Confidential** OAuth client for this IdP: token exchange **must** run on **your server** with **`client_secret`** (`oauth.token.tsx` rejects missing credentials—see §5). |

**Two integration shapes:**

1. **Your app starts SSO** (e.g. `/sign-in`) — Use **`state`** (CSRF) + **PKCE S256** (`code_challenge` / `code_verifier`). **You** generate `state` and **must** validate it on callback.
2. **App Library “launch”** (user starts on Tools Dashboard) — Authorize URL may omit PKCE; Tools Dashboard still sends **`state`** (random), but **your callback must not treat `state` as proof your app initiated the flow**—see §4.4. **`client_secret` is still required** at `/oauth/token`.

**Pure browser-only (no backend) clients are not supported:** `/oauth/token` always requires **`client_id` + `client_secret`** in the body. Use a BFF or server route for token exchange.

---

## 2. Endpoints and discovery

### 2.1 Canonical URLs (nginx — recommended mental model)

Through Tools Dashboard’s reverse proxy, OAuth lives at the **host root** (not under `/app/`):

| Method | Path |
|--------|------|
| GET | `{ORIGIN}/.well-known/openid-configuration` |
| GET | `{ORIGIN}/.well-known/jwks.json` |
| GET | `{ORIGIN}/oauth/authorize` |
| POST | `{ORIGIN}/oauth/token` |
| POST | `{ORIGIN}/oauth/revoke` |

**Typical origins:** local `http://localhost:8082`; production `https://tools.aiepic.app` (see `.ai/context/HANDOFF.md`). Direct Remix dev port (`4101`) bypasses nginx—only use if you intentionally align **redirect URIs** and cookies.

Evidence: `infra/nginx/default.conf` (`location /oauth/`, `location /.well-known/`).

### 2.2 Discovery response (authoritative)

`GET {ORIGIN}/.well-known/openid-configuration` is implemented in `front-public/app/routes/.well-known.openid-configuration.tsx`. Fields include:

- `issuer` — `{scheme}//{host}` **of the discovery request**
- `authorization_endpoint` — `{issuer}/oauth/authorize`
- `token_endpoint` — `{issuer}/oauth/token`
- `jwks_uri` — `{issuer}/.well-known/jwks.json`
- `code_challenge_methods_supported` — **`["S256"]`**
- `token_endpoint_auth_methods_supported` — **`["client_secret_post"]`**
- `grant_types_supported` — `authorization_code`, `refresh_token`
- `scopes_supported` — includes `profile`, `email`, `subscription` (your client may allow a subset via App Library **`allowed_scopes`**)

### 2.3 Fixed env vars vs discovery (drift risk)

**Recommended:** At startup or build, fetch discovery from **`{TOOLS_ORIGIN}/.well-known/openid-configuration`** and use `authorization_endpoint`, `token_endpoint`, `jwks_uri`. Reduces drift when paths or hosts change.

**Acceptable:** Fixed env (e.g. `NEXT_PUBLIC_OAUTH_AUTHORIZATION_ENDPOINT`, `OAUTH_TOKEN_ENDPOINT`, `OAUTH_USER_INFO_ENDPOINT`) **if** they are **byte-aligned** with discovery for each deployed environment.

**Required process if you skip runtime discovery:**

1. After every Tools Dashboard deploy or env change, verify:
   - `curl -sS "{ORIGIN}/.well-known/openid-configuration" | jq .`
   - Compare `authorization_endpoint`, `token_endpoint` to your env.
2. Add a **CI check** (optional): fail if env URLs ≠ discovery JSON.

---

## 3. Registering your client (App Library)

1. Register in **Tools Dashboard App Library** (admin) to obtain **`client_id`**, **`client_secret`**, **`redirect_uris`**, **`allowed_scopes`**.
2. **`redirect_uri`** on authorize and on token exchange must be the **same string** and must **exactly** match a registered entry (scheme, host, port, path, trailing slash).
3. Avoid **`0.0.0.0`** / **`::`** callback hosts; prefer **`localhost`** or **`127.0.0.1`** consistent with the browser. See HANDOFF and `pickOAuthRedirectUri` in `front-public/app/features/app-library/utils/oauth.ts`.

### 3.1 `client_secret` — required for Tools Dashboard token calls

`front-public/app/routes/oauth.token.tsx` returns **400** `Missing client credentials` if **`client_id`** or **`client_secret`** is absent **for both** authorization-code and refresh-token grants.

**Integrators:** Always configure **`OAUTH_CLIENT_SECRET`** (or equivalent) for confidential App Library clients. Code paths that **omit** `client_secret` when undefined will **fail token exchange** against this IdP—not optional behavior.

---

## 4. Authorization request (browser)

**Endpoint:** `GET {authorization_endpoint}`.

### 4.1 Required query parameters

Enforced by `front-public/app/routes/oauth.authorize.tsx`:

| Parameter | Value |
|-----------|--------|
| `response_type` | **`code`** |
| `client_id` | Registered client id |
| `redirect_uri` | Registered URI (exact match) |
| `scope` | Space-separated; each token must be in **`allowed_scopes`** |
| `state` | Opaque value; **you must validate** when **your** app started the flow (§4.4) |

### 4.2 PKCE (required when your app starts login)

| Parameter | Value |
|-----------|--------|
| `code_challenge` | BASE64URL(SHA256(`code_verifier`)) |
| `code_challenge_method` | **`S256`** (mandatory if `code_challenge` is present) |

If `code_challenge` is present and method is not `S256`, IdP redirects with `error=invalid_request`.

### 4.3 User session and registration (no OAuth error on your redirect)

The authorize loader calls **`back-auth`** `GET /user-registration/status` with the **user’s Cookie**.

If the user is **not signed in** or **not email-verified**, Tools Dashboard issues an **HTTP redirect** to **`/app/features/user-registration`** with **`return_to`** set to the full authorize URL—**not** to your `redirect_uri`.

**Your OAuth callback route must not assume every return is `{redirect_uri}?code=...`.** If the user abandons registration, you may never see a callback.

After verification, the user should resume **`return_to`** (authorize) and then complete the flow to your `redirect_uri`.

### 4.4 `state` semantics (app-started vs App Library launch)

| Who starts OAuth | `state` handling |
|------------------|------------------|
| **Your app** (`/sign-in`) | Generate cryptographically strong `state`; store (session, signed cookie, or server); on callback **reject** if `state` mismatch (CSRF). |
| **App Library launch** (`buildOAuthLaunchURL`) | Tools Dashboard generates `state` but **does not** persist it for your app; comments in `front-public/app/features/app-library/utils/oauth.ts` say the remote app **should not** validate `state` as CSRF because it did not initiate the flow. Still parse `state` if present; do not require it to match a secret only your server set **for launch**. |

### 4.5 Success redirect

`{redirect_uri}?code={authorization_code}&state={state}`

### 4.6 Error redirects (must handle on callback)

When the IdP rejects the request **after** `redirect_uri` is known valid, it redirects to:

`{redirect_uri}?error={code}&error_description={...}&state={state}`

**Callback handler contract:** Parse query parameters **in order**:

1. If **`error`** is present → **stop**; map `error` / `error_description` for UX and logs; **do not** treat as “missing code” only—surface IdP errors explicitly (`access_denied`, `invalid_scope`, `unauthorized_client`, etc.).
2. Else validate **`state`** (when your app initiated login).
3. Else require **`code`** and proceed to token exchange.

**Observed `error` values from `oauth.authorize.tsx` include:** `invalid_request`, `unsupported_response_type`, `access_denied`, `unauthorized_client`, `invalid_scope`, `server_error` (non-exhaustive; handle unknown `error` generically).

Early validation failures may redirect with `error` **before** session checks; registration failures use **`/app/features/user-registration`** instead (§4.3).

### 4.7 Consent UI

Default: interactive Allow/Deny may be **skipped** for registered apps (fast path). If **`OAUTH_REQUIRE_INTERACTIVE_CONSENT_UI=1`**, consent UI is shown—the same query contract applies.

---

## 5. Token endpoint — **form body only (not JSON)**

**Endpoint:** `POST {token_endpoint}`.

**Implementation:** `request.formData()` in `oauth.token.tsx`. Send:

`Content-Type: application/x-www-form-urlencoded`

Do **not** send `application/json` for body parameters unless a future version explicitly documents it.

### 5.1 Authorization code grant

| Field | Required | Notes |
|-------|----------|--------|
| `grant_type` | Yes | `authorization_code` |
| `code` | Yes | From callback |
| `redirect_uri` | Yes | **Identical** to authorize step |
| `client_id` | Yes | |
| `client_secret` | Yes | **Required by IdP** — omit → 400 |
| `code_verifier` | When PKCE used | Required if authorize included `code_challenge`; omit only for flows without PKCE (e.g. some App Library launches) |

**Success (200):** JSON with `access_token`, `refresh_token`, `token_type` (`Bearer`), `expires_in`, `scope`.

**Errors:** JSON `error`, `error_description`; HTTP 4xx/5xx.

**Implementation note:** Route comments mention **TODO** for stricter **`client_secret`** verification against DB; clients must still send it.

### 5.2 Refresh token grant

| Field | Required |
|-------|----------|
| `grant_type` | `refresh_token` |
| `refresh_token` | Yes |
| `client_id` | Yes |
| `client_secret` | Yes |

### 5.3 Token revocation

**Endpoint:** `POST {ORIGIN}/oauth/revoke` (same origin as authorize/token—not the token URL path).

**Body:** `application/x-www-form-urlencoded`

| Field | Required | Notes |
|-------|----------|--------|
| `token` | Yes | Access or refresh token to revoke |
| `token_type_hint` | No | `access_token` or `refresh_token` if you use hints |
| `client_id` | Parsed | Present in `oauth.revoke.tsx`; revocation still proceeds if absent |
| `client_secret` | Parsed | Same |

Per spec-style behavior, revocation may return **200** even when the token is unknown; check `oauth.revoke.tsx` for current behavior.

### 5.4 Example: authorization code exchange (`curl`)

Replace placeholders; **never commit real secrets**.

```bash
curl -sS -X POST "${TOOLS_ORIGIN}/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=${AUTH_CODE}" \
  --data-urlencode "redirect_uri=${OAUTH_REDIRECT_URI}" \
  --data-urlencode "client_id=${OAUTH_CLIENT_ID}" \
  --data-urlencode "client_secret=${OAUTH_CLIENT_SECRET}" \
  --data-urlencode "code_verifier=${PKCE_CODE_VERIFIER}"
```

---

## 6. Calling APIs with the access token

### 6.1 Current user — `GET /api/users/me`

**Purpose:** Bearer access token → current user profile + subscription-shaped hints.

**Client URL (via nginx):** `GET {ORIGIN}/api/users/me`  
**Upstream `back-api` path:** `/users/me` (generic `location /api/` strips the `/api` prefix — see HANDOFF “Two call patterns”).

**Header:** `Authorization: Bearer {access_token}`

Details: `.ai/features/users-oauth-resource/README.md`, `back-api/features/users/api.py`.

This is **not** the auto-auth **API-key** integration surface; do not confuse with `/api/users/{user_id}` admin/key flows.

### 6.2 Other APIs

Scopes like `cards:*`, storage integration (`tdsk_…`), etc. have separate docs—see **`OAUTH_IMPLEMENTATION_GUIDE.md`**, `shared/contracts/**`, and nginx exceptions (`/api/integrations/`, `/api/app-library/`, …).

---

## 7. Security checklist

1. **`client_secret`**: server-only env or vault; never browser, mobile bundles, or chat logs.
2. **`state`**: when **your** app starts OAuth, generate per request and verify on callback.
3. **PKCE**: S256 for app-started web flows.
4. **Tokens**: httpOnly Secure cookies or server session; never log bearer tokens or `Authorization`.
5. **`redirect_uri`**: fixed allowlist; exact match; HTTPS for production callbacks on your side.
6. **Scopes**: least privilege; align with App Library `allowed_scopes`.
7. **Callback**: handle **`error`** / **`error_description`** before `code` (§4.6).

---

## 8. Troubleshooting

| Symptom | Check |
|---------|--------|
| 400 `Missing client credentials` | Include **`client_secret`** in **form** body for **every** token request. |
| `invalid_redirect_uri` (redirect) | Registered URI matches authorize + token **exactly**. |
| `invalid_scope` | Requested scopes ⊆ `allowed_scopes`. |
| User stuck on Tools Dashboard registration | Session/verification on IdP; Mailhog in dev (`README.md`); no `code` on your site until they complete and retry authorize. |
| Callback “no code” but IdP returned `error` | Read **`error`** / **`error_description`** (§4.6)—do not collapse to generic “no_code”. |
| Token `invalid_grant` | Wrong `redirect_uri`, expired `code`, PKCE mismatch, bad `client_id`. |
| Token parse / empty fields | You sent **JSON** body—use **urlencoded** (§5). |
| 401 on `/api/users/me` | Expired token, wrong host, or path not going through nginx `/api/` routing. |
| Env “works in prod, breaks in dev” | Discovery vs fixed env drift (§2.3); `localhost` vs `127.0.0.1`; port mismatch. |

---

## 9. Alignment checklist (third-party app vs this contract)

Use when reviewing a remote app (e.g. CMS) against Tools Dashboard:

- [ ] Authorize: `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`; PKCE when app starts login.
- [ ] Callback: handles **`error`** / **`error_description`** explicitly; **`state`** validated when app-initiated.
- [ ] Token: **`application/x-www-form-urlencoded`**; **`client_secret` always sent**; **`code_verifier`** when PKCE used.
- [ ] Userinfo: `GET {ORIGIN}/api/users/me` with `Authorization: Bearer …`.
- [ ] Either **discovery** or **CI-verified** fixed env URLs (§2.3).
- [ ] No **browser-only** token exchange (§1).

---

## 10. One-paragraph summary for LLMs

Use **`GET {TOOLS_ORIGIN}/.well-known/openid-configuration`** or env URLs **proven equal** to it; register App Library **`client_id`**, **`client_secret`**, and exact **`redirect_uris`**; redirect users to **`/oauth/authorize`** with **`response_type=code`**, **`scope`**, **`state`**, and **PKCE S256** when your app starts SSO; on **`redirect_uri`**, **handle `error` before `code`**, honor **`state`** only for app-started flows; **`POST /oauth/token`** with **urlencoded** fields including **mandatory `client_secret`** and matching **`redirect_uri`** plus **`code_verifier`** when PKCE was used; call **`GET {ORIGIN}/api/users/me`** with **Bearer** token; remember **registration** may interrupt the flow **without** hitting your callback (§4.3).

---

## 11. Tools Dashboard source map (IdP repo only)

| Concern | File |
|---------|------|
| Discovery | `front-public/app/routes/.well-known.openid-configuration.tsx` |
| Authorize | `front-public/app/routes/oauth.authorize.tsx` |
| Token | `front-public/app/routes/oauth.token.tsx` |
| Revoke | `front-public/app/routes/oauth.revoke.tsx` |
| App Library launch URL / PKCE notes | `front-public/app/features/app-library/utils/oauth.ts` |
| User resource API | `back-api/features/users/api.py` |
| Nginx | `infra/nginx/default.conf`, `infra/nginx/default.prd.conf` |

---

## Document history

- **2026-04-30:** Expanded for discovery vs env drift, callback **`error`** handling, mandatory **`client_secret`**, registration **`return_to`** behavior, App Library **`state`** semantics, revocation, **`curl`** example, confidential-client limitation, troubleshooting and alignment checklist.
