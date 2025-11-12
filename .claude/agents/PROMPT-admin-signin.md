# Ready-to-Use Prompt: Admin Signin Implementation with RBAC

## Copy this entire prompt and paste it into Claude Code:

---

I need to implement email/password signin for the admin dashboard (front-admin) with role-based access control (RBAC) and automatic default admin user creation.

**STEP 1: Read these context files in this exact order:**

1. `.claude/agents/user-registration.yaml` - Read the entire `system_prompt` section to understand the architecture
2. `.claude/agents/user-registration-feature-context.md` - Full architectural context
3. `CONTEXT.md` - Project architecture overview
4. `front-admin/CONTEXT.md` - Admin UI constraints and standards
5. `back-auth/features/email-auth/feature.yaml` - Authentication contract
6. `back-auth/features/email-auth/api.py` - Authentication endpoints
7. `back-postgres/repositories/user_repository.py` - User database operations
8. `shared/models/user.py` - User data model
9. `front-public/app/features/user-registration/ui/LoginForm.tsx` - Reference implementation to follow

**STEP 2: After reading ALL context files, implement the following:**

```
Working on feature: admin-signin + RBAC system
Services: front-admin, back-auth, back-postgres, shared
Locations:
- front-admin/app/features/admin-signin/ (UI)
- back-auth/features/email-auth/ (authentication updates)
- back-postgres/repositories/user_repository.py (database operations)
- shared/models/user.py (data models)
- Database seed/migration for default admin

Goal: Implement email/password signin for admin dashboard with role-based access control

CRITICAL ARCHITECTURE UNDERSTANDING (from agent context):
- This is AUTHENTICATION (signin), NOT registration
- Authentication logic lives in: back-auth/features/email-auth/
- DO NOT modify or create code in back-api (that's for registration)
- Admin interface: email/password ONLY (no Google OAuth, no social login)
- Frontend (front-admin): Only UI and form handling - NO business logic
- Backend endpoint to call: POST /auth/email/login (in back-auth)
```

**RBAC Requirements (NEW):**

**1. User Roles Definition**

Define these roles in the system:
- **`admin`**: Full system access, can access front-admin dashboard
  - Permissions: All operations (users, applications, settings, etc.)
  - Can create/edit/delete users
  - Can approve applications
  - Access to admin dashboard

- **`customer`**: Regular user, can access front-public interface
  - Permissions: Own profile, own subscriptions, own data
  - Can register, login, manage own account
  - Access to public dashboard only
  - Cannot access admin dashboard

- **Future roles** (define structure for extensibility):
  - `moderator`: Content moderation
  - `support`: Customer support access
  - `developer`: API access with elevated permissions

**2. User Permissions (Granular)**

Use permission-based system for fine-grained control:
- `users.read`, `users.write`, `users.delete`
- `applications.read`, `applications.write`, `applications.approve`
- `subscriptions.manage`, `payments.process`
- `system.settings`, `system.audit`

**Role → Permission mapping:**
- `admin`: All permissions
- `customer`: `users.read` (own), `subscriptions.manage` (own), `applications.read` (own)

**3. Database Schema Updates**

Update `shared/models/user.py`:
```python
@dataclass(slots=True)
class User:
    id: str
    email: str
    status: str
    role: str  # NEW: 'admin' | 'customer' | 'moderator' | 'support'
    permissions: list[str]  # NEW: ['users.read', 'users.write', ...]
    created_at: str
    updated_at: str
```

Update `back-postgres/repositories/user_repository.py`:
- Add methods: `create_user(email, password_hash, role, permissions)`
- Add method: `update_role(user_id, role)`
- Add method: `get_user_with_role(user_id)`
- Ensure all queries include `role` and `permissions` fields

PostgreSQL schema (create migration or seed script):
```sql
-- Add to existing users table
ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'customer';
ALTER TABLE users ADD COLUMN permissions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Create index for role-based queries
CREATE INDEX idx_users_role ON users(role);
```

**4. Default Admin User Creation**

Create a system initialization script/migration:

Location: `back-postgres/seeds/create_default_admin.py` or similar

Requirements:
- Runs on system startup (Docker entrypoint or migration)
- Creates default admin user if it doesn't exist
- Uses environment variables for credentials (NEVER hardcode)
- Logs creation event

```python
# Pseudocode for seed script
import os
import bcrypt

async def create_default_admin():
    admin_email = os.getenv('DEFAULT_ADMIN_EMAIL', 'admin@example.com')
    admin_password = os.getenv('DEFAULT_ADMIN_PASSWORD', 'Admin123!ChangeMeNow')

    # Check if admin already exists
    existing_admin = await user_repository.find_by_email(admin_email)
    if existing_admin:
        print(f"Admin user already exists: {admin_email}")
        return

    # Hash password
    password_hash = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt())

    # Create admin user
    admin_user = await user_repository.create_user(
        email=admin_email,
        password_hash=password_hash,
        role='admin',
        permissions=['*'],  # All permissions
        status='verified'  # Pre-verified admin
    )

    print(f"✅ Default admin user created: {admin_email}")
    print(f"⚠️  IMPORTANT: Change the default password immediately!")

    return admin_user
```

Environment variables (add to `.env` or docker-compose):
```bash
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=Admin123!ChangeMeNow
```

**5. Authentication Flow Updates**

Update `back-auth/features/email-auth/api.py`:
- Login endpoint should return user role and permissions
- Verify role before allowing admin dashboard access

Response format:
```json
{
  "access_token": "jwt-token",
  "refresh_token": "refresh-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "admin",
    "permissions": ["users.read", "users.write", "..."]
  }
}
```

**6. Frontend Role Checks**

front-admin signin must:
- Check if user has `role === 'admin'` after successful login
- If role is NOT admin, reject login with clear message: "Access denied. Admin role required."
- Store role in session/cookie for subsequent requests
- Frontend layout should verify admin role on every protected route

front-public registration:
- All new users default to `role: 'customer'`
- Cannot self-assign admin role
- Admin must manually upgrade users to admin

**Implementation Requirements:**

**1. Directory Structure**
Create: `front-admin/app/features/admin-signin/`
```
admin-signin/
├── feature.yaml
├── routes/
│   └── index.tsx
└── ui/
    └── AdminSigninForm.tsx
```

**2. feature.yaml**
Define:
- Feature name: admin-signin
- Version: 1.0.0
- Routes: /admin/signin → routes/index.tsx
- UI components: ui/AdminSigninForm.tsx

**3. AdminSigninForm.tsx**
- Reference: `front-public/app/features/user-registration/ui/LoginForm.tsx`
- Technology: React 18, TypeScript, Tailwind CSS
- Fields: Email (required), Password (required)
- Button: "Sign In"
- NO social login buttons (email/password only)
- Client-side validation: email format, password not empty
- Display server errors clearly
- WCAG 2.1 compliant: proper labels, keyboard navigation, ARIA attributes
- Match admin design system (check other front-admin components)

**4. routes/index.tsx (Remix Route)**
- Loader function:
  - Check if user already authenticated (check session/cookies)
  - If authenticated: redirect to /admin/dashboard
  - If not: render signin form

- Action function:
  - Receive form submission (email, password)
  - Call backend: `POST http://back-auth:4101/auth/email/login`
  - Request body: `{ email: string, password: string }`
  - On success:
    - Receive JWT tokens (access + refresh)
    - Store in secure httpOnly cookies (use Remix session management)
    - Redirect to /admin/dashboard
  - On error:
    - Return error message to form
    - Display user-friendly error (don't expose security details)

- Component:
  - Render AdminSigninForm
  - Handle form submission
  - Display loading state during submission
  - Show error messages if login fails

**5. Security Requirements**
- CSRF protection: Remix handles this automatically with form actions
- Rate limiting: Enforced by Kong gateway (no changes needed)
- Input validation: Client-side validation before submission
- Error messages: User-friendly, don't expose internal details
  - Good: "Invalid email or password"
  - Bad: "User not found" or "Password incorrect"
- Session timeout: 30 minutes of inactivity (admin requirement)
- Token storage: Secure httpOnly cookies, not localStorage

**6. Integration Points**
- Backend endpoint: `back-auth/features/email-auth/` → POST /auth/email/login
- DO NOT create new endpoints
- DO NOT modify back-auth code
- ONLY create frontend UI that calls existing endpoint

**7. Design System**
- Use Tailwind CSS (same as other admin features)
- Reference: `front-admin/app/features/user-management/` for styling patterns
- Responsive: mobile-first design
- Dark mode support if admin UI has it

**Constraints:**
- Email/password ONLY (absolutely no social login options)
- Must use existing `back-auth/features/email-auth/login` endpoint
- All authentication logic stays in back-auth - frontend is UI ONLY
- No business logic in AdminSigninForm.tsx or routes/index.tsx
- Follow Remix patterns (loaders/actions, no useEffect for data fetching)
- TypeScript strict mode
- No direct database access from frontend

**Acceptance Criteria:**

**RBAC System:**
- [ ] User model includes `role` and `permissions` fields
- [ ] Database schema updated with role and permissions columns
- [ ] Default admin user created on system startup
- [ ] Default admin credentials configurable via environment variables
- [ ] Admin user has role='admin' and permissions=['*']
- [ ] New registrations default to role='customer'
- [ ] Login endpoint returns user role and permissions in response

**Admin Signin:**
- [ ] Admin can signin with email/password
- [ ] Form validates inputs before submission
- [ ] Displays clear error messages on invalid credentials
- [ ] **Verifies user has 'admin' role after successful login**
- [ ] **Rejects login if user role is not 'admin' with message: "Access denied. Admin role required."**
- [ ] Redirects to /admin/dashboard on success (only for admin role)
- [ ] Stores tokens AND role securely in httpOnly cookies
- [ ] Session expires after 30min inactivity
- [ ] Keyboard accessible (can tab through form, enter to submit)
- [ ] Screen reader friendly (proper ARIA labels)
- [ ] Matches admin UI design system
- [ ] No console errors
- [ ] TypeScript compiles without errors

**Security:**
- [ ] Default admin password displays warning to change on first login
- [ ] Roles cannot be modified by users (only by admin via user-management)
- [ ] Customer users cannot access /admin routes
- [ ] JWT tokens include role claim for verification

**Testing Checklist:**

**RBAC Tests:**
1. **First-time startup**: Default admin user created with credentials from .env
2. **Default admin login**: Can login with DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD
3. **Customer user login to admin**: Customer tries to login to /admin/signin → Access denied message
4. **Admin role verification**: Admin user has role='admin' in database
5. **Customer role assignment**: New registrations have role='customer' in database
6. **JWT includes role**: Decode JWT token and verify it contains role claim
7. **Permissions returned**: Login response includes user.permissions array

**Admin Signin Tests:**
1. Signin with valid admin credentials → Success, redirect to dashboard
2. Signin with invalid email → Error message displayed
3. Signin with wrong password → Error message displayed
4. **Signin as customer to admin panel** → "Access denied. Admin role required."
5. Keyboard navigation works (Tab, Enter)
6. Screen reader announces form labels and errors
7. Mobile responsive (test on small screen)
8. No business logic in frontend files
9. Only calls back-auth endpoint (not back-api)
10. **Role stored in session/cookie** after successful login

**Integration Tests:**
1. Start fresh database → Default admin created automatically
2. Login as default admin → Success
3. Create new user via front-public → Has role='customer'
4. Try to login to admin with customer account → Denied
5. Admin changes customer role to 'admin' via user-management → Can now login to admin

Please implement this feature following the architectural patterns and security constraints from the context files you read.

---

## After Implementation

Once Claude completes the implementation:

1. **Review the RBAC implementation**:
   - Check `shared/models/user.py` - Verify `role` and `permissions` fields added
   - Check `back-postgres/repositories/user_repository.py` - Verify CRUD methods for roles
   - Check `back-postgres/seeds/create_default_admin.py` - Verify seed script exists
   - Check database migration/schema - Verify role and permissions columns added

2. **Review the admin signin code**:
   - Check `front-admin/app/features/admin-signin/feature.yaml`
   - Review `ui/AdminSigninForm.tsx` for UI code
   - Review `routes/index.tsx` for Remix loader/action with role verification
   - Check `back-auth/features/email-auth/api.py` - Verify returns user role

3. **Verify service separation**:
   - Ensure it calls `back-auth/features/email-auth/login`
   - Ensure NO code tries to modify `back-api`
   - Ensure NO business logic in frontend

4. **Configure environment variables**:
   Add to `.env` or `docker-compose.dev.yml`:
   ```bash
   DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
   DEFAULT_ADMIN_PASSWORD=ChangeMe123!Secure
   ```

5. **Test the RBAC feature**:
   ```bash
   # Clean start with fresh database
   docker compose -f docker-compose.dev.yml down --volumes
   docker compose -f docker-compose.dev.yml up --build

   # Check logs for default admin creation
   docker compose -f docker-compose.dev.yml logs back-postgres | grep "Default admin"

   # Navigate to admin signin
   # http://localhost:8082/admin/signin

   # Test 1: Login with default admin credentials
   # Email: admin@yourdomain.com (from .env)
   # Password: ChangeMe123!Secure (from .env)
   # Expected: Success → Redirect to /admin/dashboard

   # Test 2: Create a customer user via front-public registration
   # Then try to login to /admin/signin with customer credentials
   # Expected: "Access denied. Admin role required."

   # Test 3: Check database
   # docker exec -it <postgres-container> psql -U <user> -d <db>
   # SELECT email, role, permissions FROM users;
   # Expected: Default admin has role='admin', new users have role='customer'
   ```

6. **Verify JWT tokens include role**:
   ```bash
   # Login and capture JWT token
   # Decode at jwt.io or with jwt-cli
   # Verify token payload includes:
   # {
   #   "user_id": "...",
   #   "email": "...",
   #   "role": "admin",  # ← Should be present
   #   "permissions": ["*"],  # ← Should be present
   #   ...
   # }
   ```

7. **Common issues**:
   - **Claude forgets RBAC**: Emphasize "User must have role and permissions fields"
   - **No default admin created**: Check seed script runs on startup (Docker entrypoint)
   - **Customer can access admin**: Verify role check in routes/index.tsx loader
   - **JWT missing role**: Update back-auth token generation to include role claim
   - **Social login appears**: Remind "email/password ONLY for admin"
   - **Back-api modified**: Redirect to back-auth only

8. **Security checklist**:
   - [ ] Default admin password is in .env (not hardcoded)
   - [ ] Warning displayed on first login to change password
   - [ ] Customer users cannot access /admin/* routes
   - [ ] Role field is not editable by users (only via admin user-management)
   - [ ] Permissions are stored in database (not client-side)
   - [ ] JWT tokens are signed and verified
