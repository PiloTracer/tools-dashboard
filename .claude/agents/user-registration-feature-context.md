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