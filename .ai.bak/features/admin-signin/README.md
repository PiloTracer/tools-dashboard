# Feature: Admin Sign-In

## Overview

Admin Sign-In provides the **front-admin** login surface at `/admin/features/admin-signin`:

- Email/password form with CSRF protection (`AdminSigninForm`).
- Submitted credentials are sent to **`back-auth` `POST /email/login`** (same router as email-auth).
- Successful responses must include `user.role === "admin"` or the session is rejected.
- Today the session is stored as an `admin_session` cookie in the Remix action (see route module for TODOs about hardening).

Dedicated `/auth/admin/*` endpoints and admin-only 2FA pages are **not** present in the tree as of April 2026.

## User Stories

### Admin Users
- As an admin, I want to log in securely to the admin dashboard
- As an admin, I want additional security checks during login
- As an admin, I want my access logged for audit purposes

---

Last Updated: April 22, 2026
