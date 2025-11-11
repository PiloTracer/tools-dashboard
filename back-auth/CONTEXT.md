## Authentication Service (FastAPI)

**Technology**: FastAPI with Authlib, PyJWT, TOTP implementation  
**Purpose**: Handles all authentication methods (Google, email, 2FA) and issues JWT tokens  
**Key Components**:
- OAuth2/OpenID Connect providers
- Email + password registration with CSRF protection
- Email verification workflow with signed links
- TOTP generation/validation (Google Authenticator)
- Session management
- Password security (bcrypt, breach detection)

**AI Context Guidelines**:
1. All tokens must use DPoP (Demonstrating Proof-of-Possession)
2. Never store plaintext passwords - use bcrypt
3. Rate limiting is enforced at API gateway level
4. Each authentication method must be a separate feature

**Critical Security Constraints**:
- All tokens expire in 15 minutes (access) / 7 days (refresh)
- Refresh tokens are single-use with rotation
- All sensitive operations require re-authentication
- Passwords must be checked against HaveIBeenPwned API
