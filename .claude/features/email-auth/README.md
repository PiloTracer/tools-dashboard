# Feature: Email-Auth

## Overview

The **email-auth** package on `back-auth` exposes a small FastAPI router (`prefix=/email`) that performs **email + password authentication** and returns **JWT access and refresh tokens** plus a minimal user payload.

Cookie-based **registration, email verification, session login, and logout** for the public Remix app are implemented under the **user-registration** feature instead (`back-auth/features/user-registration/api.py`, `front-public/app/features/user-registration/`). Treat those flows as the source of truth for browser sessions; this README covers the separate JWT login API.

## User Stories

### API clients

- As a client, I want to exchange a verified user’s email and password for bearer tokens for API access.

## Key Workflows

1. Client sends `POST /email/login` with JSON `{ "email", "password" }`.
2. Service validates password hash, requires `is_email_verified`, ensures subscription row exists, and returns tokens.

## Security Considerations

- Passwords verified with bcrypt against the shared `users` table.
- Unverified emails receive HTTP 403 with a clear message.

## Related documentation

- `.claude/features/email-auth/feature.yaml` — technical mapping
- `back-auth/features/email-auth/api.py` — implementation
- `.claude/features/user-registration/` — browser registration and session auth

---

Last Updated: April 22, 2026
