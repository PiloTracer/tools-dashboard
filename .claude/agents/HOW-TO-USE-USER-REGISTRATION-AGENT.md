# How to Use the User Registration Agent (with RBAC)

## Overview

This guide shows you exactly how to invoke the user-registration subagent to implement features like admin signin with role-based access control (RBAC), user registration, authentication flows, and user management with roles and permissions.

## Files in This Directory

1. **user-registration.yaml** - Agent configuration with system prompt and architectural knowledge
2. **user-registration-feature-context.md** - Detailed context about user lifecycle features
3. **user-registration-agent-initial-directions.md** - Documentation and example scenarios
4. **HOW-TO-USE-USER-REGISTRATION-AGENT.md** - This file (usage instructions)
5. **PROMPT-admin-signin.md** - Ready-to-use prompt for admin signin with RBAC
6. **QUICK-START.md** - 30-second quick start guide

## What's New: Role-Based Access Control (RBAC)

The agent now implements a complete RBAC system:

**User Roles:**
- `admin` - Full system access (front-admin dashboard)
- `customer` - Regular user (front-public interface)
- `moderator`, `support`, `developer` - Future roles (extensible)

**Key Features:**
- Default admin user created automatically on system startup
- Users have roles and granular permissions
- Admin panel only accessible to users with `admin` role
- Customer users default to `customer` role on registration
- JWT tokens include role claims for verification
- Environment-configurable default admin credentials

## Method 1: Direct Prompt with Context Loading (Recommended)

### Step 1: Start Your Claude Code Session

```bash
cd /mnt/d/Projects/EPIC/tools-dashboard
claude code
```

### Step 2: Provide the Prompt with Context

**RECOMMENDED: Use the ready-made prompt from `PROMPT-admin-signin.md`**

The easiest way is to tell Claude:

```
Read and execute the complete prompt from: .claude/agents/PROMPT-admin-signin.md
```

**OR** copy and paste this complete prompt to implement admin signin with RBAC:

```
I need to implement email/password signin for the admin dashboard (front-admin) with role-based access control and default admin user creation.

IMPORTANT: First read these context files in this exact order:
1. .claude/agents/user-registration.yaml (agent configuration - read the system_prompt section)
2. .claude/agents/user-registration-feature-context.md (architectural context)
3. CONTEXT.md (project architecture)
4. front-admin/CONTEXT.md (admin UI constraints)
5. back-auth/features/email-auth/feature.yaml (authentication contract)
6. back-auth/features/email-auth/api.py (endpoints to call)
7. back-postgres/repositories/user_repository.py (user database operations)
8. shared/models/user.py (user data model)
9. front-public/app/features/user-registration/ui/LoginForm.tsx (reference implementation)

After reading all context files, implement this feature:

Working on feature: admin-signin + RBAC system
Services: front-admin, back-auth, back-postgres, shared

Goal: Implement admin signin with role-based access control

RBAC Requirements:
1. User Roles: 'admin' (full access), 'customer' (public users)
2. User Model: Add 'role' and 'permissions' fields to shared/models/user.py
3. Database: Update PostgreSQL schema with role and permissions columns
4. Default Admin: Create seed script that creates admin user on system startup
   - Email: Configurable via DEFAULT_ADMIN_EMAIL env var
   - Password: Configurable via DEFAULT_ADMIN_PASSWORD env var
   - Role: 'admin'
   - Permissions: ['*'] (all permissions)
5. New Registrations: Default to role='customer'
6. Login Response: Include user role and permissions in JWT token
7. Frontend Validation: Verify user has 'admin' role before allowing access

Requirements from agent context:
- This is AUTHENTICATION (signin), NOT registration
- Authentication logic is in back-auth/features/email-auth/ (DO NOT modify back-api)
- Admin interface uses email/password ONLY (no Google OAuth)
- Frontend only handles UI - all auth logic stays in back-auth
- Must call existing endpoint: POST /auth/email/login

Changes needed:
1. Update shared/models/user.py with role and permissions fields
2. Update back-postgres/repositories/user_repository.py with role CRUD methods
3. Create back-postgres/seeds/create_default_admin.py seed script
4. Update back-auth/features/email-auth/api.py to return user role
5. Create front-admin/app/features/admin-signin/ directory structure
6. Create feature.yaml with routes and UI components
7. Create AdminSigninForm.tsx using Tailwind CSS
8. Create Remix route with role verification:
   - loader: Check authentication and admin role
   - action: Handle login and verify role='admin'
9. Add route at /admin/signin
10. Reject login if user role is not 'admin'

Constraints:
- Email/password ONLY (no social login for admin)
- Customer users CANNOT access admin panel
- JWT tokens MUST include role claim
- Default admin credentials from environment variables (NEVER hardcode)
- All authentication logic stays in back-auth

Security requirements:
- Default admin password must be changeable via .env
- Warn admin to change default password on first login
- CSRF protection on form
- Rate limiting (enforced by Kong gateway)
- Role cannot be modified by users (only via admin user-management)

Please implement this complete RBAC system following the architectural patterns from the context files.
```

### Why This Works

1. **Explicit Context Loading**: The prompt tells Claude exactly which files to read and in what order
2. **Agent Knowledge Integration**: By reading `user-registration.yaml`, Claude loads the system prompt with architectural understanding
3. **Feature Context**: The `user-registration-feature-context.md` provides the complete architecture
4. **Reference Implementations**: Points to existing code patterns to follow
5. **Clear Requirements**: Specifies exactly what needs to be built

## Method 2: Using Claude Code Task Tool (If Available)

If Claude Code supports custom agents via the Task tool:

```bash
claude code
```

Then in the conversation:

```
Use the Task tool to invoke a specialized agent for this task:

Task: Implement admin signin feature for front-admin
Agent Type: user-lifecycle-specialist
Context Files:
- .claude/agents/user-registration-feature-context.md
- CONTEXT.md
- front-admin/CONTEXT.md
- back-auth/features/email-auth/

Specifications:
[Same requirements as Method 1]
```

## Method 3: Create a Slash Command (Reusable)

Create `.claude/commands/admin-signin.md`:

```markdown
# Admin Signin Implementation

Read context files in this order:
1. .claude/agents/user-registration.yaml (system prompt)
2. .claude/agents/user-registration-feature-context.md (architecture)
3. CONTEXT.md
4. front-admin/CONTEXT.md
5. back-auth/features/email-auth/feature.yaml
6. back-auth/features/email-auth/api.py
7. front-public/app/features/user-registration/ui/LoginForm.tsx

Implement admin signin feature at front-admin/app/features/admin-signin/

Requirements:
- Email/password only (no social login)
- Call back-auth/features/email-auth/login endpoint
- Reference LoginForm.tsx pattern from front-public
- Match admin UI design system
- WCAG 2.1 accessibility
- 30min session timeout
- Follow all security constraints from user-registration.yaml
```

Then use it:
```
/admin-signin
```

## Verification Checklist

After Claude implements the feature, verify:

**RBAC Implementation:**
- [ ] `shared/models/user.py` updated with `role` and `permissions` fields
- [ ] `back-postgres/repositories/user_repository.py` has role CRUD methods
- [ ] Seed script created: `back-postgres/seeds/create_default_admin.py`
- [ ] Database schema updated with role and permissions columns
- [ ] Default admin credentials configurable via environment variables
- [ ] Default admin user created on first startup
- [ ] New registrations default to `role='customer'`
- [ ] JWT tokens include role and permissions claims

**Admin Signin Feature:**
- [ ] New directory created: `front-admin/app/features/admin-signin/`
- [ ] Contains: `feature.yaml`, `routes/index.tsx`, `ui/AdminSigninForm.tsx`
- [ ] Form calls `back-auth/features/email-auth/login` (NOT back-api)
- [ ] **Loader verifies user has `role='admin'` before allowing access**
- [ ] **Action rejects login if user role is not 'admin'**
- [ ] Uses Remix loader/action pattern
- [ ] Tailwind CSS styling matches admin design
- [ ] Accessible (keyboard navigation, ARIA labels)
- [ ] Error handling displays user-friendly messages
- [ ] Success redirects to admin dashboard (only for admin role)
- [ ] No business logic in frontend (only UI)
- [ ] Follows security constraints (CSRF, validation, etc.)

**Testing:**
- [ ] Start fresh database → Default admin created
- [ ] Login with default admin credentials → Success
- [ ] Create customer user → Has `role='customer'` in database
- [ ] Try to login to admin panel with customer account → Access denied
- [ ] JWT token decoded includes role and permissions

## Common Issues and Solutions

### Issue: Claude forgets to implement RBAC

**Solution**: Emphasize in your prompt:
```
CRITICAL: Implement complete RBAC system:
1. Update User model with role and permissions
2. Create default admin user seed script
3. Verify role='admin' before allowing access
4. Include role in JWT tokens
```

### Issue: Default admin user not created on startup

**Solution**: Ensure seed script runs on container startup:
```
Add to back-postgres Dockerfile or docker-compose:
- Run seeds/create_default_admin.py on startup
- Check if admin exists before creating
- Use environment variables for credentials
```

### Issue: Customer users can access admin panel

**Solution**: Add role verification in loader:
```
In front-admin routes/index.tsx loader:
if (user.role !== 'admin') {
  throw new Response("Access denied. Admin role required.", { status: 403 });
}
```

### Issue: JWT tokens don't include role

**Solution**: Update token generation in back-auth:
```
Update back-auth/features/email-auth/api.py:
token_payload = {
  "user_id": user.id,
  "email": user.email,
  "role": user.role,  # ADD THIS
  "permissions": user.permissions  # ADD THIS
}
```

### Issue: Claude tries to modify back-api instead of using back-auth

**Solution**: Emphasize in your prompt:
```
CRITICAL: This is AUTHENTICATION (signin), not REGISTRATION.
Authentication = back-auth/features/email-auth/
Registration = back-api/features/user-registration/
For admin signin, use back-auth ONLY.
```

### Issue: Claude creates social login options

**Solution**: Add to prompt:
```
Admin interface requirement: Email/password ONLY.
No Google OAuth, no social login buttons.
Reference LoginForm.tsx but remove all social login code.
```

### Issue: Claude doesn't follow existing patterns

**Solution**: Be explicit about reference files:
```
Read and follow the exact pattern from:
front-public/app/features/user-registration/ui/LoginForm.tsx
Adapt this for admin, but maintain the same structure.
```

### Issue: Hardcoded admin credentials in code

**Solution**: Verify environment variables are used:
```
Check seeds/create_default_admin.py:
admin_email = os.getenv('DEFAULT_ADMIN_EMAIL', 'admin@example.com')
admin_password = os.getenv('DEFAULT_ADMIN_PASSWORD')

NEVER hardcode credentials in source code.
```

## Advanced: Using Agent Context for Other Tasks

The user-registration agent context can handle:

1. **User Registration** (back-api/features/user-registration/)
2. **User Authentication** (back-auth/features/email-auth/)
3. **OAuth Flows** (back-auth/features/google-auth/)
4. **2FA Implementation** (back-auth/features/two-factor/)
5. **Admin User Creation** (new feature in front-admin)
6. **Cross-service integration** (registration + auth flows)

For any of these, use the same method:
1. Read the agent YAML (system prompt)
2. Read the feature context
3. Read relevant CONTEXT.md files
4. Specify the exact feature and location
5. Provide clear requirements

## Example: Full Session for Admin Signin

```bash
# Start Claude Code
cd /mnt/d/Projects/EPIC/tools-dashboard
claude code

# In Claude Code, paste:
I need to implement admin signin. First, read these files:
1. .claude/agents/user-registration.yaml
2. .claude/agents/user-registration-feature-context.md
3. CONTEXT.md
4. front-admin/CONTEXT.md
5. back-auth/features/email-auth/api.py
6. front-public/app/features/user-registration/ui/LoginForm.tsx

Then implement front-admin/app/features/admin-signin/ feature with:
- AdminSigninForm.tsx (email/password only)
- Remix route calling back-auth/features/email-auth/login
- Match admin design system
- Follow all security constraints from agent context

# Claude will read all files and implement the feature
# Review the implementation
# Test the feature
```

## Tips for Best Results

1. **Always load context first**: Start with the agent YAML, then feature context, then project files
2. **Be specific about service boundaries**: Clearly state whether it's registration (back-api) or authentication (back-auth)
3. **Reference existing implementations**: Point to LoginForm.tsx, RegistrationForm.tsx as patterns
4. **Specify security requirements**: Mention WCAG, CSRF, rate limiting explicitly
5. **Use feature-focused language**: "Working on feature: X, Location: Y"
6. **Verify service separation**: Ensure frontend has no business logic

## Summary

**For Admin Signin Implementation:**

1. Read `.claude/agents/user-registration.yaml` (agent system prompt)
2. Read `.claude/agents/user-registration-feature-context.md` (architecture)
3. Read project CONTEXT.md files
4. Read `back-auth/features/email-auth/` (authentication service)
5. Read `front-public/app/features/user-registration/ui/LoginForm.tsx` (reference)
6. Implement `front-admin/app/features/admin-signin/` with email/password signin
7. Call `back-auth/features/email-auth/login` endpoint
8. Follow admin security constraints (no social login, 30min timeout)

This approach ensures Claude has complete architectural context and implements the feature correctly according to your multi-service architecture.
