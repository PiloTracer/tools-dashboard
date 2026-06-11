# Feature: Users OAuth resource (`/users/me`)

## Overview

This surface is a **resource-server** slice on `back-api`: it exposes **`GET /users/me`** for OAuth **Bearer** access tokens. The handler validates the token against **`back-auth`** (`POST /internal/oauth/validate-token`), loads the user from PostgreSQL, and best-effort attaches subscription-shaped metadata for integrated apps (e.g. external product UIs).

It is **not** the same as **user-management** (`/admin/users/...`, admin JWT) or the **auto-auth** external-app routes under **`/api/users/{user_id}`** (API-key style paths on the auto-auth router). Those are documented under their respective features.

## User stories

- As an **OAuth client**, after obtaining an access token, I want to call a stable endpoint to read the current user profile and subscription hints.

## Key workflow

1. Client sends `Authorization: Bearer <access_token>` to `GET /users/me` (see `feature.yaml` for URL layout behind `/api/`).
2. `back-api` forwards the token to `back-auth` for validation.
3. On success, `back-api` reads `users` (and optionally `subscriptions`) from Postgres and returns `UserInfoResponse`.

## Security considerations

- Tokens must be validated on every request; no caching of validation is implied in the current handler.
- Avoid logging raw tokens or full validation payloads in production.

## Known limitations

- Handler contains debug `print` statements; tighten logging before production hardening.
- Subscription usage fields include TODO placeholders (e.g. `currentUsage`).

---

Last Updated: April 22, 2026
