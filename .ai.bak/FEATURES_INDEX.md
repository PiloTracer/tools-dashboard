# Features Index

Complete index of all documented features in the Tools Dashboard project. Each feature has a corresponding directory in `.ai/features/` with standardized documentation.

## Quick Navigation

- [Authentication Features](#authentication-features)
- [User Management Features](#user-management-features)
- [Utility Features](#utility-features)
- [Admin Features](#admin-features)
- [Integration Features](#integration-features)
- [Platform services](#platform-services)

---

## Authentication Features

### 1. Auto-Auth (OAuth 2.0 & API Authentication)
**Directory:** `.ai/features/auto-auth/`

Comprehensive OAuth 2.0 authorization server and API authentication system.

- **Purpose:** Third-party app access, OAuth client management, API key authentication
- **Services:** front-public, front-admin, back-api, back-auth
- **Key Files:**
  - `README.md` - Business overview and workflows
  - `feature.yaml` - Complete service mapping and endpoints
- **Related Files:**
  - back-api/features/auto-auth/feature.yaml
  - back-auth/features/auto-auth/feature.yaml
  - front-public/app/features/auto-auth/feature.yaml
  - front-admin/app/features/auto-auth/feature.yaml

**Use Cases:**
- OAuth 2.0 authorization for external apps
- API key generation and management
- Token management and revocation

---

### 2. Email-Auth (Email & Password Authentication)
**Directory:** `.ai/features/email-auth/`

JWT email/password login API on `back-auth` (`POST /email/login`). Browser registration, session cookies, and logout are documented under **user-registration** / **user-logout** because that is where those routes live in this repository.

- **Purpose:** Bearer-token login for API-style clients; bcrypt-verified passwords against the shared `users` table
- **Services:** back-auth (primary); public cookie flows: see user-registration
- **Key Files:**
  - `README.md` - User workflows and security details
  - `feature.yaml` - Endpoints, services, and configuration
- **Related Files:**
  - back-auth/features/email-auth/feature.yaml

**Use Cases:**
- User login with email and password
- Password reset via email
- Account lockout after failed attempts
- Breach detection via HaveIBeenPwned

---

### 3. Google-Auth (Google OAuth 2.0)
**Directory:** `.ai/features/google-auth/`

Google sign-in for end users is wired through **user-registration** (front-public routes + `back-auth` provider callbacks). `google-auth` on `back-auth` currently exposes a small `/auth/google/start` helper—read `.ai/features/google-auth/feature.yaml` for the exact surface.

- **Purpose:** Google-assisted account access (product); implementation spans user-registration + google-auth modules
- **Services:** front-public (user-registration), back-auth
- **Key Files:**
  - `README.md` - User stories and workflows
  - `feature.yaml` - OAuth endpoints and configuration
- **Related Files:**
  - back-auth/features/google-auth/feature.yaml

**Use Cases:**
- Sign up with Google account
- Log in with "Sign in with Google"
- Link/unlink Google to existing account

---

### 4. Two-Factor Authentication (TOTP)
**Directory:** `.ai/features/two-factor/`

Product direction for TOTP and related flows. The checked-in `back-auth` router is a placeholder (`POST /auth/two-factor/challenge`); there is no dedicated `front-public` feature package yet.

- **Purpose:** Planned second-factor enforcement and recovery flows
- **Services:** back-auth (scaffold today)
- **Key Files:**
  - `README.md` - 2FA setup and usage workflows
  - `feature.yaml` - TOTP endpoints and security configuration
- **Related Files:**
  - back-auth/features/two-factor/feature.yaml

**Use Cases:**
- Enable 2FA on user accounts
- TOTP verification during login
- Backup codes for account recovery
- Device trust for 30-day remembering

---

### 5. User Logout
**Directory:** `.ai/features/user-logout/`

User session termination and cleanup.

- **Purpose:** Secure session invalidation for the public app (cookie session)
- **Services:** front-public (Remix resource route), back-auth (`POST /user-registration/logout` handler on the user-registration router)
- **Key Files:**
  - `README.md` - Logout workflows
  - `feature.yaml` - Logout endpoints and session cleanup
- **Related Files:**
  - front-public/app/features/user-logout/feature.yaml

**Use Cases:**
- Log out users securely
- Clear authentication tokens
- Invalidate sessions

---

## User Management Features

### 6. User Registration
**Directory:** `.ai/features/user-registration/`

User account creation with email verification and password validation.

- **Purpose:** New user onboarding, account creation
- **Services:** front-public, back-api, back-auth, back-postgres, back-cassandra
- **Key Files:**
  - `README.md` - Registration flows and requirements
  - `feature.yaml` - API endpoints and validation rules
- **Related Files:**
  - back-api/features/user-registration/feature.yaml
  - front-public/app/features/user-registration/feature.yaml

**Use Cases:**
- User account creation
- Email verification (OTP or link)
- Password strength validation
- Account initialization

---

### 7. User Management (Admin)
**Directory:** `.ai/features/user-management/`

Administrative user management: listing, editing, role changes, status control, and audit logging.

- **Purpose:** Admin user control, role management
- **Services:** front-admin, back-api, back-auth, back-postgres, back-cassandra
- **Key Files:**
  - `README.md` - Admin workflows and business rules
  - `feature.yaml` - Admin endpoints, service mappings
- **Related Files:**
  - back-api/features/user-management/feature.yaml
  - front-admin/app/features/user-management/feature.yaml

**Use Cases:**
- Admin user listing with search and filters
- User profile editing
- Role and permission management
- Account status control
- Audit logging of changes

---

### 8. User Status Lifecycle
**Directory:** `.ai/features/user-status/`

User account status management (active, inactive, suspended, deleted, archived).

- **Purpose:** Account state management, lifecycle control
- **Services:** front-public, front-admin, back-api, back-postgres, back-cassandra
- **Key Files:**
  - `README.md` - Status states and workflows
  - `feature.yaml` - Status endpoints and database schema
- **Related Files:**
  - back-api/features/user-status/feature.yaml
  - front-public/app/features/user-status/feature.yaml

**Use Cases:**
- Auto-deactivate inactive users
- Admin account suspension
- User account reactivation
- Soft delete implementation

---

### 9. Progressive Profiling
**Directory:** `.ai/features/progressive-profiling/`

Gradual user profile data collection during registration and onboarding.

- **Purpose:** Reduce registration friction, gather profile information incrementally
- **Services:** front-public, back-api, back-postgres, back-cassandra
- **Key Files:**
  - `README.md` - Profiling workflows and user experience
  - `feature.yaml` - Profile endpoints and fields
- **Related Files:**
  - back-api/features/progressive-profiling/feature.yaml
  - front-public/app/features/progressive-profiling/feature.yaml

**Use Cases:**
- Collect profile info during registration
- Continue profiling during onboarding
- Show completion progress
- Save data incrementally

---

### 10. User Subscription & Billing
**Directory:** `.ai/features/user-subscription/`

Subscription plan management, upgrades/downgrades, billing, and invoice handling.

- **Purpose:** Subscription lifecycle, billing management
- **Services:** front-public, front-admin, back-api, back-postgres
- **Key Files:**
  - `README.md` - Subscription plans and user workflows
  - `feature.yaml` - API endpoints and integration
- **Related Files:**
  - back-api/features/user-subscription/feature.yaml
  - front-public/app/features/user-subscription/feature.yaml

**Use Cases:**
- View current subscription
- Upgrade/downgrade plans
- Manage payment methods
- Download invoices
- Admin subscription management

---

## Utility Features

### 11. Change Language (i18n)
**Directory:** `.ai/features/change-language/`

Language switching with cookie-based persistence and instant UI updates.

- **Purpose:** Multi-language support, i18n
- **Services:** front-public (`/app/change-language` resource route, `LanguageSwitcher`, `i18next.server.ts`), shared contracts
- **Key Files:**
  - `README.md` - Language switching workflows
  - `feature.yaml` - Routes and i18n configuration
- **Related Files:**
  - front-public/app/features/change-language/feature.yaml

**Use Cases:**
- Switch application language
- Persist language preference
- Instant UI language switching
- Support multiple languages

---

## Admin Features

### 12. Admin Sign-In
**Directory:** `.ai/features/admin-signin/`

Admin Remix login that calls **`POST /email/login`** on `back-auth` and enforces `role === "admin"` before setting `admin_session`.

- **Purpose:** Gate access to the admin dashboard
- **Services:** front-admin, back-auth (email-auth router)
- **Key Files:**
  - `README.md` - Admin login security measures
  - `feature.yaml` - Admin endpoints and security config
- **Related Files:**
  - front-admin/app/features/admin-signin/feature.yaml

**Use Cases:**
- Admin user authentication with CSRF-protected form
- Role verification against JWT payload from email login

---

### 13. Task Scheduler
**Directory:** `.ai/features/task-scheduler/`

Administrative UI scaffold for scheduled tasks. Background execution APIs/workers are not present in-repo yet.

- **Purpose:** Future admin automation for recurring jobs
- **Services:** front-admin (scaffold)
- **Key Files:**
  - `README.md` - Task scheduling workflows
  - `feature.yaml` - API endpoints and job configuration
- **Related Files:**
  - front-admin/app/features/task-scheduler/feature.yaml

**Use Cases:**
- Schedule recurring tasks
- Monitor task execution
- View execution history
- Receive failure notifications

---

## Integration Features

### 14. App Library (SSO Hub)
**Directory:** `.ai/features/app-library/`

Application library with OAuth 2.0 SSO integration enabling users to discover, authorize, and launch integrated applications.

- **Purpose:** OAuth-based application ecosystem, SSO hub
- **Services:** front-public, back-api, back-auth, back-postgres, back-cassandra
- **Key Files:**
  - `README.md` - Comprehensive feature documentation
  - `feature.yaml` - OAuth endpoints and app registry
  - `USER_STORIES.md` - Detailed user personas and workflows
  - `TECHNICAL_SPEC.md` - Technical architecture
  - `QUICK_START.md` - Quick implementation guide
  - `OAUTH_IMPLEMENTATION_GUIDE.md` - OAuth implementation details
  - `DATABASE_SCHEMA.md` - Database design
  - `IMPLEMENTATION_PLAN.md` - Implementation roadmap
- **Related Files:**
  - front-public/app/features/app-library/feature.yaml
  - front-admin/app/features/app-library/ui/AppTable.tsx
  - front-admin/app/features/app-library/ui/AppForm.tsx
  - front-admin/app/routes/admin.features.app-library._index.tsx
  - back-api/features/app-library/api.py

**External Integrations:**
- E-Cards (Card template designer and batch generator)

**Use Cases:**
- Browse available applications
- Authorize apps with OAuth 2.0
- Launch apps with single sign-on
- Manage application permissions
- Admin app management

**Admin UI (same feature):** `front-admin` app registry lives under `app/routes/admin.features.app-library*.tsx` and `app/features/app-library/` (list, new, edit); it calls `back-api` `GET/POST /api/admin/app-library` and related admin routes.

---

## Platform services

These are **separate deployables** or **API slices** not previously indexed next to product features. Each has `.ai/features/{name}/`.

### 15. Users OAuth resource (`/users/me`)
**Directory:** `.ai/features/users-oauth-resource/`

`back-api` **Bearer-token** endpoint for the **current OAuth user** (validates via `back-auth` internal OAuth). Distinct from admin user APIs and from auto-auth’s `/api/users/{user_id}` API-key integration routes.

- **Purpose:** Let OAuth clients fetch profile + subscription hints after token issuance
- **Services:** back-api, back-auth, postgresql
- **Key Files:** `README.md`, `feature.yaml`
- **Implementation:** `back-api/features/users/api.py`, `back-api/features/users/feature.yaml`

### 16. Feature registry
**Directory:** `.ai/features/feature-registry/`

Compose service `feature-registry/` — planned catalog for applications and contracts. **Scaffold:** health endpoint + in-memory helper module only.

- **Purpose:** Future central registration and contract validation for ecosystem apps
- **Services:** feature-registry
- **Key Files:** `README.md`, `feature.yaml`, `feature-registry/CONTEXT.md`

### 17. WebSockets gateway
**Directory:** `.ai/features/websockets/`

Compose service `back-websockets/` — planned real-time channel for dashboard updates. **Scaffold:** health endpoint; full WS/auth per `back-websockets/CONTEXT.md` not yet implemented.

- **Purpose:** Push updates to clients with Redis and strict messaging constraints (design)
- **Services:** back-websockets, redis (intended)
- **Key Files:** `README.md`, `feature.yaml`, `back-websockets/CONTEXT.md`

### 18. Background workers (Celery)
**Directory:** `.ai/features/background-workers/`

Compose service **`back-workers`** — Celery app with **Redis** broker. Only **`heartbeat`** is registered; files under `tasks/` are **stubs** until wired in `main.py`.

- **Purpose:** Future durable jobs (cleanup, backup, export) per `back-workers/CONTEXT.md`
- **Services:** back-workers, redis
- **Key Files:** `README.md`, `feature.yaml`, `back-workers/CONTEXT.md`

---

## Feature Documentation Structure

Each feature directory follows this standardized structure:

```
.ai/features/{feature-name}/
├── README.md              # Business overview, workflows, user stories
├── feature.yaml           # Technical mapping, services, endpoints
└── [supporting docs]      # Additional documentation as needed
```

### README.md Contains
- Feature overview (what it does)
- User stories and use cases
- Key workflows
- Business requirements
- Performance targets
- Known limitations
- Testing strategy

### feature.yaml Contains
- Service implementations across all services
- API endpoints with method, auth, description
- Database tables and schemas
- External dependencies
- Configuration and environment variables
- Feature flags
- Testing information
- Security considerations

---

## How to Use This Index

### Finding a Feature
1. Know the feature name? Go to `.ai/features/{feature-name}/`
2. Want a quick overview? Read `README.md`
3. Looking for code locations? Check `feature.yaml`
4. Need API details? See back-api/features/{feature-name}/feature.yaml

### Understanding Feature Scope
- Single service? Check one service's feature.yaml
- Multi-service? Check the centralized feature.yaml for overview
- Need implementation details? Check service-specific feature.yaml files

### Planning Work
1. Read the feature's `README.md` for business context
2. Check `feature.yaml` to identify which services are involved
3. Navigate to service-specific files for detailed implementation info
4. Look for related prompts/plans in `.ai/prompts/` and `.ai/plans/`

---

## Feature Statistics

- **Total Features:** 18 (14 product-area features + 4 platform / resource entries)
- **Authentication Features:** 5 (auto-auth, email-auth, google-auth, 2fa, logout)
- **User Management Features:** 5 (registration, management, status, progressive-profiling, subscription)
- **Utility Features:** 1 (change-language)
- **Admin Features:** 2 (admin-signin, task-scheduler)
- **Integration Features:** 1 (app-library)
- **Platform services:** 4 (users-oauth-resource, feature-registry, websockets, background-workers)

### Service Coverage

| Service | Features |
|---------|----------|
| front-public | 9 features |
| front-admin | 5 features |
| back-api | 8 features |
| back-auth | 7 features |
| back-postgres | 10 features |
| back-cassandra | 9 features |

> Counts above are high-level planning figures; several features are still partial scaffolds—always prefer the per-feature `feature.yaml` under `.ai/features/{name}/` plus the service-local YAML in `back-*` / `front-*`.

---

## Related Documentation

- **Feature Standard:** `.ai/FEATURE_STANDARD.md` - Guidelines for documenting features
- **Convention Guide:** `.ai/CONVENTIONS.md` - Code conventions and standards
- **Directory Map:** `.ai/DIRECTORY_MAP.md` - Project structure overview

---

Last Updated: April 22, 2026
Maintained by: Engineering Team
