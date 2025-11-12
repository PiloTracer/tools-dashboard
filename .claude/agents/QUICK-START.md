# Quick Start: Admin Signin with RBAC

## 30-Second Setup

1. **Open Claude Code**
   ```bash
   cd /mnt/d/Projects/EPIC/tools-dashboard
   claude code
   ```

2. **Use the ready-made prompt**
   In Claude Code, type:
   ```
   Read and execute: .claude/agents/PROMPT-admin-signin.md
   ```

3. **Configure environment variables** (add to `.env` or `docker-compose.dev.yml`)
   ```bash
   DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
   DEFAULT_ADMIN_PASSWORD=ChangeMe123!Secure
   ```

4. **Done!** Claude will implement:
   - RBAC system (roles & permissions)
   - Default admin user creation
   - Admin signin UI with role verification

## What Happens

Claude automatically implements:

**1. RBAC Foundation:**
- Updates `shared/models/user.py` with `role` and `permissions` fields
- Updates `back-postgres/repositories/user_repository.py` with role methods
- Creates PostgreSQL migration for role columns
- Creates `back-postgres/seeds/create_default_admin.py` seed script

**2. Default Admin User:**
- Creates admin user on first system startup
- Email: From `DEFAULT_ADMIN_EMAIL` env var
- Password: From `DEFAULT_ADMIN_PASSWORD` env var
- Role: `admin`
- Permissions: `['*']` (all permissions)

**3. Authentication Updates:**
- Updates `back-auth/features/email-auth/api.py` to return user role
- JWT tokens now include role and permissions claims
- Login response includes user object with role

**4. Admin Signin UI:**
- Creates `front-admin/app/features/admin-signin/`
- AdminSigninForm component (email/password only)
- Remix route with role verification
- Rejects login if user role is not 'admin'

**5. Registration Updates:**
- New users via front-public registration default to `role='customer'`
- Customer users cannot access admin panel

## Files in .claude/agents/

```
.claude/agents/
├── user-registration.yaml                          # Agent configuration & system prompt
├── user-registration-feature-context.md            # Architecture context
├── user-registration-agent-initial-directions.md   # Documentation & examples
├── HOW-TO-USE-USER-REGISTRATION-AGENT.md          # Detailed usage guide
├── PROMPT-admin-signin.md                          # Ready-to-use prompt for admin signin
└── QUICK-START.md                                  # This file
```

## What Each File Does

| File | Purpose | When to Read |
|------|---------|--------------|
| **user-registration.yaml** | System prompt with architectural rules | Claude reads this to understand architecture |
| **user-registration-feature-context.md** | Details about user registration/auth features | Claude reads this for feature context |
| **user-registration-agent-initial-directions.md** | Examples and scenarios | You read this to see what's possible |
| **HOW-TO-USE-USER-REGISTRATION-AGENT.md** | Complete usage instructions | You read this to learn how to use the agent |
| **PROMPT-admin-signin.md** | Ready-to-use prompt | You copy/paste this into Claude Code |
| **QUICK-START.md** | This quick reference | You read this to get started fast |

## Usage Pattern

### For Admin Signin (Current Task)

```bash
# 1. Start Claude Code
claude code

# 2. In Claude Code, paste the prompt from:
# .claude/agents/PROMPT-admin-signin.md

# 3. Claude implements the feature
# 4. Review and test
```

### For Other User Lifecycle Tasks

Create similar prompts following this pattern:

```
Step 1: Read context files:
1. .claude/agents/user-registration.yaml
2. .claude/agents/user-registration-feature-context.md
3. CONTEXT.md
4. <relevant service>/CONTEXT.md
5. <relevant feature files>

Step 2: Implement:
Working on feature: <feature-name>
Location: <path>
Goal: <what to build>
Requirements: <specific requirements>
Constraints: <architectural constraints>
```

## Quick Reference: Service Boundaries

**User Registration** (creating accounts)
- Service: `back-api/features/user-registration/`
- Frontend: `front-public/app/features/user-registration/RegistrationForm.tsx`
- Default role: `customer`

**User Authentication** (signin/login)
- Service: `back-auth/features/email-auth/`
- Frontend: `front-public/app/features/user-registration/LoginForm.tsx`
- Admin (MISSING): `front-admin/app/features/admin-signin/` ← **What we're building**
- Returns: JWT tokens with role and permissions

**User Roles & Permissions (NEW)**
- Roles: `admin`, `customer` (+ future: `moderator`, `support`, `developer`)
- Model: `shared/models/user.py` (role, permissions fields)
- Repository: `back-postgres/repositories/user_repository.py`
- Default Admin: Created via `back-postgres/seeds/create_default_admin.py`

**User Data**
- PostgreSQL: `back-postgres/repositories/user_repository.py` (+ role, permissions columns)
- Cassandra: `back-cassandra/repositories/user_ext_repository.py`

## RBAC Quick Facts

**User Roles:**
- `admin` → Full access to front-admin dashboard
- `customer` → Access to front-public only

**Default Admin:**
- Created automatically on first startup
- Email: `DEFAULT_ADMIN_EMAIL` (from .env)
- Password: `DEFAULT_ADMIN_PASSWORD` (from .env)
- ⚠️ Change default password after first login!

**Role Assignment:**
- New registrations: `role='customer'` (automatic)
- Admin promotion: Only via admin user-management feature
- Self-assignment: Not allowed (security)

**Access Control:**
- Admin panel: Requires `role='admin'`
- Public app: All roles allowed
- JWT tokens: Include role claim for verification

## Troubleshooting

**Problem**: Default admin not created on startup

**Solution**:
```bash
# Check if seed script exists
ls back-postgres/seeds/create_default_admin.py

# Check Docker entrypoint runs seed script
# Add to docker-compose.dev.yml or Dockerfile:
command: sh -c "python seeds/create_default_admin.py && <normal startup>"

# Check logs for admin creation
docker compose logs back-postgres | grep "admin"
```

**Problem**: Customer users can access admin panel

**Solution**: Verify role check in routes/index.tsx:
```typescript
// In front-admin/app/features/admin-signin/routes/index.tsx loader:
if (user.role !== 'admin') {
  throw new Response("Access denied. Admin role required.", { status: 403 });
}
```

**Problem**: JWT tokens don't include role

**Solution**: Update back-auth token generation:
```python
# In back-auth/features/email-auth/api.py
token_payload = {
  "user_id": user.id,
  "role": user.role,  # Must include this
  "permissions": user.permissions
}
```

**Problem**: Claude forgets RBAC implementation

**Solution**: Emphasize in prompt:
```
CRITICAL: Must implement RBAC:
1. User model with role field
2. Default admin seed script
3. Role verification in signin
4. JWT includes role
```

**Problem**: Claude tries to modify back-api for authentication

**Solution**: Emphasize in prompt:
```
CRITICAL: Authentication = back-auth (NOT back-api)
Call endpoint: back-auth/features/email-auth/login
```

**Problem**: Claude creates social login buttons

**Solution**: Add to prompt:
```
Email/password ONLY. No social login for admin.
```

## Testing Your Implementation

After Claude completes:

```bash
# 1. Configure environment variables (required!)
echo 'DEFAULT_ADMIN_EMAIL=admin@yourdomain.com' >> .env
echo 'DEFAULT_ADMIN_PASSWORD=ChangeMe123!Secure' >> .env

# 2. Start fresh with clean database
docker compose -f docker-compose.dev.yml down --volumes
docker compose -f docker-compose.dev.yml up --build

# 3. Verify default admin created
docker compose logs back-postgres | grep "Default admin"
# Should see: "✅ Default admin user created: admin@yourdomain.com"

# 4. Test admin login
# Navigate to: http://localhost:8082/admin/signin
# Email: admin@yourdomain.com
# Password: ChangeMe123!Secure
# Expected: Success → Redirect to /admin/dashboard

# 5. Test customer restriction
# Create customer via: http://localhost:8082/app/ (register)
# Try to login at: http://localhost:8082/admin/signin
# Expected: "Access denied. Admin role required."

# 6. Verify database roles
docker exec -it <postgres-container> psql -U <user> -d <db>
# SELECT email, role, permissions FROM users;
# admin@yourdomain.com | admin | ["*"]
# customer@example.com | customer | ["users.read", ...]
```

## Next Steps

1. **Implement admin signin with RBAC** using `PROMPT-admin-signin.md`
2. **Test thoroughly** (default admin, customer restrictions, JWT tokens)
3. **Change default password** on first login
4. **Use the pattern** for other user lifecycle features:
   - Admin user creation with role assignment
   - Role-based access control for all admin features
   - User role management (promote customer to admin)
   - Password reset
   - 2FA setup
   - Audit trail for admin actions

## Need Help?

- **Quick start**: Read this file (QUICK-START.md)
- **Detailed guide**: Read `HOW-TO-USE-USER-REGISTRATION-AGENT.md`
- **Ready prompt**: Use `PROMPT-admin-signin.md`
- **Example scenarios**: Read `user-registration-agent-initial-directions.md`
- **Architecture details**: Read `user-registration-feature-context.md`
- **Agent system prompt**: Read `user-registration.yaml`

## Summary

**To implement admin signin with RBAC RIGHT NOW:**

```bash
# 1. Start Claude Code
cd /mnt/d/Projects/EPIC/tools-dashboard && claude code

# 2. In Claude Code, paste this:
"Read and execute: .claude/agents/PROMPT-admin-signin.md"

# 3. Configure .env
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=ChangeMe123!Secure

# 4. Test
docker compose up --build
# Login at http://localhost:8082/admin/signin
```

**What you get:**
✅ Complete RBAC system (roles & permissions)
✅ Default admin user (configurable via .env)
✅ Admin signin UI with role verification
✅ Customer users restricted from admin panel
✅ JWT tokens with role claims
✅ Database schema with role columns
✅ Seed script for default admin

The agent system ensures Claude implements a production-ready RBAC solution according to your multi-service architecture and security best practices.
