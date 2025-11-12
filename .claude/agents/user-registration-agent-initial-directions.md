# May need this to execute "claude":

export PATH="$HOME/.local/bin:$PATH"

# Creating a User Registration & Authentication Subagent for Claude Code

## 1. Instructions to Create the Subagent

Based on your architecture and requirements, here's how to create the `agent-user-registration` subagent:

### Step 1: Create the agent directory structure
```bash
mkdir -p .claude/agents/
```

### Step 2: Create the subagent configuration file
Create a file named `.claude/agents/user-registration.yaml` with the following content:

```yaml
name: agent-user-registration
type: user-lifecycle-specialist
description: "Specialized agent for handling all user lifecycle operations including registration, authentication, signin, user creation, and profile management across all application layers. Understands the separation between registration (back-api) and authentication (back-auth)."
tools:
  - read_files
  - write_files
  - search_code
  - execute_command
system_prompt: |
  You are a user lifecycle specialist AI that understands the complete user management architecture across this multi-service application.

  CRITICAL ARCHITECTURE UNDERSTANDING:

  1. SERVICE RESPONSIBILITIES:
     - back-api/features/user-registration/ - User REGISTRATION (account creation, new user signup)
     - back-auth/features/email-auth/ - Email/password LOGIN (authentication, signin)
     - back-auth/features/google-auth/ - Google OAuth LOGIN (social authentication)
     - back-auth/features/two-factor/ - Two-factor authentication (2FA/TOTP)
     - back-postgres/repositories/user_repository.py - Core user account data (email, credentials)
     - back-cassandra/repositories/user_ext_repository.py - Extended user profiles and metadata

  2. KEY PRINCIPLES:
     - User REGISTRATION = Creating new accounts → back-api/features/user-registration/
     - User AUTHENTICATION = Logging in → back-auth/features/email-auth/ or google-auth/
     - Business logic NEVER in frontend - only UI and form handling
     - Database operations NEVER in back-api/back-auth - delegate to back-postgres/back-cassandra
     - Always follow security best practices: bcrypt hashing, rate limiting, secure tokens
     - Respect the feature-focused development pattern

  3. PROJECT STRUCTURE:
     - back-api/features/user-registration/ - Registration domain logic and orchestration
     - back-auth/features/email-auth/ - Email/password authentication endpoints
     - back-auth/features/google-auth/ - OAuth2/Google authentication
     - back-auth/features/two-factor/ - TOTP 2FA implementation
     - front-public/app/features/user-registration/ - Has RegistrationForm.tsx + LoginForm.tsx
     - front-admin/app/features/ - MISSING authentication features (needs implementation)
     - shared/contracts/user-registration/ - Shared contracts between services
     - back-postgres/repositories/user_repository.py - User account persistence
     - back-cassandra/repositories/user_ext_repository.py - Extended user data

  4. FRONTEND PATTERNS:
     - front-public has complete registration + login UI (RegistrationForm, LoginForm)
     - front-admin needs email/password signin (no social login for admin)
     - All frontends use Remix loaders/actions to call backend
     - Forms submit to back-api (registration) or back-auth (login)

  5. SECURITY CONSTRAINTS:
     - Passwords: bcrypt + HaveIBeenPwned breach check
     - Access tokens: 15min expiration, JWT with DPoP
     - Refresh tokens: 7 days, single-use with rotation
     - All sensitive operations require re-authentication
     - Rate limiting enforced at API gateway (Kong)

  When implementing user lifecycle features:
  1. Check existing feature.yaml files for contracts first
  2. Respect service boundaries (registration vs authentication)
  3. Update appropriate feature directory only
  4. Maintain separation: UI (frontend) → API (back-api/back-auth) → Data (back-postgres/cassandra)
  5. Follow existing patterns in user-registration and email-auth features
  6. Document cross-service dependencies in feature.yaml
```

### Step 3: Create a feature context file for the agent
Create `.claude/agents/user-registration-feature-context.md` to help the agent understand the complete user lifecycle:

```markdown
# User Registration & Authentication Feature Context

## Service Architecture

### User Registration (Account Creation)
- **Service**: back-api
- **Location**: back-api/features/user-registration/
- **Purpose**: Create new user accounts, trigger verification emails
- **Endpoints**: POST /user-registration
- **Dependencies**: back-auth@1.2.0, shared@2.4.1
- **Database**: Calls back-postgres for user creation

### User Authentication (Login/Signin)
- **Service**: back-auth
- **Locations**:
  - back-auth/features/email-auth/ (email/password login)
  - back-auth/features/google-auth/ (OAuth2/Google login)
  - back-auth/features/two-factor/ (2FA/TOTP)
- **Purpose**: Authenticate existing users, issue JWT tokens
- **Endpoints**:
  - POST /auth/email/login
  - POST /auth/google/callback
  - POST /auth/2fa/verify
- **Token Management**: Issues access + refresh tokens with DPoP

### Data Persistence
- **PostgreSQL** (back-postgres/repositories/user_repository.py):
  - Core user accounts: email, hashed password, verification status
  - Financial data associated with users
  - Relational integrity for user-related data

- **Cassandra** (back-cassandra/repositories/user_ext_repository.py):
  - Extended user profiles and preferences
  - Application-specific configuration
  - High-volume metadata and time-series data

### Frontend Implementations
- **front-public/app/features/user-registration/**:
  - ✅ RegistrationForm.tsx - New user signup
  - ✅ LoginForm.tsx - User login
  - ✅ VerificationBanner.tsx - Email verification UI
  - Routes: /features/user-registration, /features/user-registration/verify

- **front-admin/app/features/**:
  - ❌ MISSING: Admin signin feature (email/password only, no social login)
  - ❌ MISSING: Admin user creation feature
  - Existing: user-management, task-scheduler

## Security Requirements

### Password Security
- Hashing: bcrypt with cost factor 12+
- Breach Detection: Check against HaveIBeenPwned API
- Strength Requirements: Enforce minimum complexity
- Never log or expose plaintext passwords

### Token Management
- Access Tokens: JWT, 15min expiration, DPoP binding
- Refresh Tokens: Single-use, 7 days, automatic rotation
- Token Storage: Secure httpOnly cookies
- Revocation: Support immediate token invalidation

### Authentication Flow Security
- CSRF Protection: All state-changing operations
- Rate Limiting: Per IP and per user
- Email Verification: Required before full account access
- Re-authentication: Required for sensitive operations

### Admin Security (front-admin specific)
- Email/password ONLY (no social login)
- Additional security validation for admin actions
- Audit trail for all admin operations
- Session timeout: 30min inactivity
```

## 2. Example Usage: Request Sign-in Functionality for front-admin

### Example 1: Implement Admin Signin UI

**Scenario**: Create email/password signin for front-admin (no social login)

```
Working on feature: admin-signin
Location: front-admin/app/features/admin-signin/

Context files to read:
1. /CONTEXT.md (architecture overview)
2. /front-admin/CONTEXT.md (admin UI constraints)
3. /back-auth/features/email-auth/feature.yaml (authentication contract)
4. /back-auth/features/email-auth/api.py (endpoints to call)
5. /front-public/app/features/user-registration/ui/LoginForm.tsx (reference pattern)

Goal: Implement email/password signin for admin dashboard

Changes needed:
- Create front-admin/app/features/admin-signin/ directory
- Add feature.yaml defining routes and UI components
- Create AdminSigninForm.tsx component using Tailwind CSS
- Create Remix route with loader/action calling back-auth/features/email-auth/
- Add route at /admin/signin
- Implement error handling and redirect to dashboard on success
- Follow WCAG 2.1 accessibility standards

Constraints:
- Email/password ONLY (no Google OAuth for admin)
- Must match existing admin UI design system
- Calls existing back-auth/features/email-auth/login endpoint
- All authentication logic stays in back-auth, frontend only handles UI
- Session timeout: 30min inactivity (admin security requirement)

Deliverable: Complete admin-signin feature with UI and Remix integration
```

### Example 2: Implement User Registration Flow (Back-end)

**Scenario**: Enhance user registration with additional validation

```
Working on feature: user-registration (backend)
Location: back-api/features/user-registration/

Context files to read:
1. /CONTEXT.md (service topology)
2. /back-api/CONTEXT.md (service constraints)
3. /back-api/features/user-registration/feature.yaml (current contract)
4. /back-api/features/user-registration/domain.py (business logic)
5. /back-api/features/user-registration/infrastructure.py (service integration)
6. /shared/contracts/user-registration/feature.yaml (shared contract)

Goal: Add additional validation rules to registration process

Changes needed:
- Update domain.py to add email domain validation
- Update infrastructure.py to check user doesn't already exist (via back-postgres)
- Add validation for disposable email domains
- Return clear error messages for validation failures

Integration points:
- back-postgres: Query user_repository to check existing users
- back-redis: Check rate limiting for registration attempts
- shared/contracts: Update schemas if adding new fields

Constraints:
- No database calls directly in domain.py - use infrastructure.py
- Password validation happens in back-auth, not here
- Registration creates unverified users (email verification separate)
- Must respect feature.yaml contract versioning

Deliverable: Updated domain.py and infrastructure.py with enhanced validation
```

### Example 3: Add Admin User Creation Feature

**Scenario**: Allow admins to create user accounts directly (bypass normal registration)

```
Working on feature: admin-user-creation
Location: front-admin/app/features/admin-user-creation/

Context files to read:
1. /CONTEXT.md (architecture and security)
2. /front-admin/CONTEXT.md (admin constraints)
3. /back-api/features/user-registration/ (registration pattern to follow)
4. /shared/contracts/user-registration/feature.yaml (user data contract)

Goal: Create UI for admins to create user accounts directly

Changes needed:
- Create front-admin/app/features/admin-user-creation/ directory
- Add feature.yaml for routes and UI
- Create UserCreationForm.tsx with admin-specific fields
- Create Remix action to call back-api/features/user-registration/ endpoint
- Add confirmation modal for user creation
- Show success/error toast notifications
- Audit trail logging for admin actions

Security requirements:
- Requires admin authentication (check session)
- Created users should be pre-verified (skip email verification)
- Generate temporary password and send via secure channel
- Log all admin user creation events for audit
- Validate admin permissions before allowing creation

Dependencies:
- Calls back-api/features/user-registration/ for actual user creation
- May need new endpoint in back-api for admin-created users
- back-postgres: Stores user with verified=true flag

Deliverable: Complete admin user creation feature with security controls
```

### Example 4: Cross-Service Integration (Registration + Authentication)

**Scenario**: Integrate registration with automatic signin after email verification

```
Working on feature: registration-auto-signin (integration)
Locations:
- back-api/features/user-registration/ (verification handling)
- back-auth/features/email-auth/ (token issuance)
- front-public/app/features/user-registration/ (UI flow)

Context files to read:
1. /CONTEXT.md (service topology and communication patterns)
2. /back-api/features/user-registration/feature.yaml
3. /back-auth/features/email-auth/feature.yaml
4. /shared/contracts/user-registration/feature.yaml
5. /front-public/app/features/user-registration/routes/verify.tsx

Goal: Auto-signin users after email verification

Integration flow:
1. User clicks verification link → front-public/routes/verify.tsx
2. Frontend calls back-api/user-registration/verify
3. back-api marks user verified in back-postgres
4. back-api calls back-auth/email-auth to generate tokens
5. back-auth returns JWT access + refresh tokens
6. back-api returns tokens to frontend
7. Frontend stores tokens and redirects to dashboard

Changes needed:
- back-api/infrastructure.py: Add call to back-auth after verification
- back-auth: Add internal endpoint for trusted token generation
- front-public/routes/verify.tsx: Handle token storage and redirect
- Update feature.yaml dependencies in both services

Security considerations:
- Verification links are single-use with expiration
- Tokens generated only after successful verification
- Rate limit verification attempts
- Log all verification events

Dependencies:
- back-api depends on back-auth@1.2.0 (add to feature.yaml)
- Shared contract needs token response schema

Deliverable: Implementation notes for both services + frontend with clear integration points
```

### Important Notes

1. **Agent Scope**: This agent handles ALL user lifecycle operations:
   - Registration (account creation) → back-api
   - Authentication (signin/login) → back-auth
   - User data → back-postgres, back-cassandra
   - UI → front-public, front-admin

2. **Service Separation**: The agent understands:
   - Registration ≠ Authentication (different services)
   - Database operations delegated to data services
   - Frontend only handles UI and form submission

3. **Reference Implementations**: Agent can reference:
   - front-public/app/features/user-registration/ (LoginForm, RegistrationForm)
   - back-api/features/user-registration/ (registration pattern)
   - back-auth/features/email-auth/ (authentication pattern)

4. **Security Awareness**: Agent enforces:
   - bcrypt + HaveIBeenPwned for passwords
   - JWT tokens with proper expiration
   - CSRF protection, rate limiting
   - Admin-specific security constraints

This agent is your specialist for anything related to users: creating them, authenticating them, managing their data across all services and frontends.