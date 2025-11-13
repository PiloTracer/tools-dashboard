# Developer Quick Reference

## 🚀 Getting Started

### Prerequisites Checklist
- [ ] Docker & Docker Compose installed
- [ ] Node.js 18+ (optional, for local frontend dev)
- [ ] Python 3.11+ (optional, for local backend dev)
- [ ] `/etc/hosts` entry for `epicdev.com` → `127.0.0.1`

### Initial Setup (5 minutes)
```bash
# 1. Copy and configure environment
cp .env.example .env.dev
# Edit .env.dev - set JWT_SECRET_KEY, admin credentials

# 2. Start all services
docker-compose -f docker-compose.dev.yml up -d

# 3. Wait for health checks (watch for "healthy" status)
docker-compose -f docker-compose.dev.yml ps

# 4. Access the app
# Public: http://epicdev.com/app/
# Admin: http://epicdev.com/admin/
```

---

## 📋 Common Tasks

### Running the Stack

#### Start Everything
```bash
docker-compose -f docker-compose.dev.yml up -d
```

#### Start Specific Services
```bash
docker-compose -f docker-compose.dev.yml up -d front-public back-auth postgresql redis cassandra
```

#### Stop Everything
```bash
docker-compose -f docker-compose.dev.yml down
```

#### Stop and Remove Volumes (⚠️ DATA LOSS)
```bash
docker-compose -f docker-compose.dev.yml down -v
```

---

### Frontend Development

#### Rebuild Front-Public
```bash
# Inside container
docker-compose -f docker-compose.dev.yml exec front-public npm run build

# Then restart
docker-compose -f docker-compose.dev.yml restart front-public
```

#### Install New npm Package
```bash
docker-compose -f docker-compose.dev.yml exec front-public npm install <package-name>
# Restart to apply changes
docker-compose -f docker-compose.dev.yml restart front-public
```

#### Watch Logs in Real-Time
```bash
docker-compose -f docker-compose.dev.yml logs -f front-public
```

#### TypeScript Type Check
```bash
docker-compose -f docker-compose.dev.yml exec front-public npx tsc --noEmit
```

---

### Backend Development

#### Rebuild Back-Auth
```bash
docker-compose -f docker-compose.dev.yml restart back-auth
# Code changes auto-reload with volume mounts in dev
```

#### Install New Python Package
```bash
# Add to requirements.txt first, then:
docker-compose -f docker-compose.dev.yml exec back-auth pip install -r requirements.txt
```

#### Run Database Migrations (Example)
```bash
docker-compose -f docker-compose.dev.yml exec back-auth alembic upgrade head
```

#### Python Shell (for debugging)
```bash
docker-compose -f docker-compose.dev.yml exec back-auth python
```

---

### Database Operations

#### PostgreSQL

##### Connect to psql
```bash
docker-compose -f docker-compose.dev.yml exec postgresql psql -U user -d main_db
```

##### Common Queries
```sql
-- List all users
SELECT id, email, is_email_verified, created_at FROM users;

-- Check active sessions
SELECT user_id, created_at FROM sessions ORDER BY created_at DESC LIMIT 10;

-- Drop all tables (⚠️ DESTRUCTIVE)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

##### Backup Database
```bash
docker-compose -f docker-compose.dev.yml exec postgresql pg_dump -U user main_db > backup.sql
```

##### Restore Database
```bash
cat backup.sql | docker-compose -f docker-compose.dev.yml exec -T postgresql psql -U user -d main_db
```

---

#### Cassandra

##### Connect to cqlsh
```bash
docker-compose -f docker-compose.dev.yml exec cassandra cqlsh
```

##### Common CQL Commands
```sql
-- Use keyspace
USE tools_dashboard;

-- List tables
DESCRIBE TABLES;

-- View auth events for user
SELECT * FROM auth_events_by_user WHERE user_id = 1 LIMIT 10;

-- Drop table (⚠️ DESTRUCTIVE)
DROP TABLE auth_events_by_user;
```

---

#### Redis

##### Connect to redis-cli
```bash
docker-compose -f docker-compose.dev.yml exec redis redis-cli
```

##### Common Commands
```bash
# List all keys
KEYS *

# Get value
GET key_name

# Delete key
DEL key_name

# Flush all data (⚠️ DESTRUCTIVE)
FLUSHALL
```

---

### Debugging

#### View Service Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f back-auth

# Last 100 lines only
docker-compose -f docker-compose.dev.yml logs --tail=100 front-public

# Filter by error level
docker-compose -f docker-compose.dev.yml logs front-public 2>&1 | grep -i error
```

#### Check Service Health
```bash
docker-compose -f docker-compose.dev.yml ps

# Should show "healthy" for services with health checks
```

#### Inspect Service Configuration
```bash
docker-compose -f docker-compose.dev.yml config
```

#### Enter Service Shell
```bash
docker-compose -f docker-compose.dev.yml exec front-public sh
docker-compose -f docker-compose.dev.yml exec back-auth bash
```

#### Restart Individual Service
```bash
docker-compose -f docker-compose.dev.yml restart back-auth
```

#### Force Rebuild (after Dockerfile changes)
```bash
docker-compose -f docker-compose.dev.yml up -d --build back-auth
```

---

### Testing Email

#### Access Mailhog UI
http://localhost:8025

#### Trigger Test Email
```bash
# Register a new user via UI
# Or via API:
curl -X POST http://localhost:8101/user-registration \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -d '{"email":"test@example.com","password":"Test123456!!"}'
```

---

### Nginx Configuration

#### Reload nginx Config (after editing)
```bash
docker-compose -f docker-compose.dev.yml restart nginx-proxy
```

#### Test nginx Config
```bash
docker-compose -f docker-compose.dev.yml exec nginx-proxy nginx -t
```

#### View nginx Access Logs
```bash
docker-compose -f docker-compose.dev.yml logs -f nginx-proxy
```

---

## 🐛 Troubleshooting Guide

### Service Won't Start

**Symptoms**: Container exits immediately or shows "unhealthy"

**Diagnosis**:
```bash
docker-compose -f docker-compose.dev.yml logs <service-name>
```

**Common Causes**:
1. **Port already in use**
   ```bash
   # Find process using port
   lsof -i :8101
   # Kill it
   kill -9 <PID>
   ```

2. **Missing environment variables**
   - Check `.env.dev` is present
   - Verify all required vars are set
   - Check `docker-compose.dev.yml` for `${VAR}` references

3. **Dependency not ready**
   - Check `depends_on` in docker-compose
   - Wait for database health checks
   - PostgreSQL and Cassandra take ~10-30s to start

---

### Database Connection Errors

**Symptoms**: "Connection refused" or "No route to host"

**Solutions**:
1. **Check database is running**:
   ```bash
   docker-compose -f docker-compose.dev.yml ps postgresql cassandra redis
   ```

2. **Wait for health checks**:
   ```bash
   # Should show "healthy"
   docker-compose -f docker-compose.dev.yml ps | grep healthy
   ```

3. **Check connection string in .env.dev**:
   ```
   DATABASE_URL=postgresql+asyncpg://user:pass@postgresql:5432/main_db
   CASSANDRA_CONTACT_POINTS=cassandra
   REDIS_URL=redis://redis:6379/0
   ```

4. **Restart dependent service**:
   ```bash
   docker-compose -f docker-compose.dev.yml restart back-auth
   ```

---

### Frontend Build Errors

**Symptoms**: Page shows old code, 404 on routes, blank screen

**Solutions**:
1. **Clear build and rebuild**:
   ```bash
   docker-compose -f docker-compose.dev.yml exec front-public rm -rf build
   docker-compose -f docker-compose.dev.yml exec front-public npm run build
   docker-compose -f docker-compose.dev.yml restart front-public
   ```

2. **Check for TypeScript errors**:
   ```bash
   docker-compose -f docker-compose.dev.yml exec front-public npx tsc --noEmit
   ```

3. **Reinstall dependencies**:
   ```bash
   docker-compose -f docker-compose.dev.yml exec front-public rm -rf node_modules
   docker-compose -f docker-compose.dev.yml exec front-public npm install
   ```

---

### React Hydration Errors

**Symptoms**: Console warning "Hydration failed because the initial UI does not match"

**Causes**:
- Server and client render different HTML
- Using browser-only APIs on server (localStorage, window)
- Conditional rendering based on client-side state

**Solution Pattern**:
```tsx
import { useState, useEffect } from "react";

export function MyComponent() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Always render same HTML on server and initial client render
  if (!hydrated) {
    return <div>Loading...</div>;
  }

  // After hydration, can use client-specific logic
  return <div>{/* dynamic content */}</div>;
}
```

**Reference**: See `StatusIndicator.tsx` and `UserMenu.tsx`

---

### 404 Errors on API Routes

**Symptoms**: `GET /app/features/user-status 404`

**Diagnosis**:
1. **Check nginx routing**:
   ```bash
   curl -I http://epicdev.com/app/features/user-status
   ```

2. **Verify route exists in Remix**:
   - File: `front-public/app/routes/app.features.user-status._index.tsx`
   - Should export `loader` or `action`

3. **Check nginx config**:
   ```nginx
   location /app/ {
       proxy_pass http://front-public:3000;  # Should NOT strip /app/
   }
   ```

4. **Restart nginx**:
   ```bash
   docker-compose -f docker-compose.dev.yml restart nginx-proxy
   ```

---

### Asset Loading (CSS/JS) Fails

**Symptoms**: Unstyled page, "Failed to load resource" in console

**Solutions**:
1. **Check nginx build/ routing**:
   ```bash
   curl -I http://epicdev.com/build/entry.client-HASH.js
   # Should return 200 OK, Content-Type: application/javascript
   ```

2. **Verify vite.config.ts**:
   ```typescript
   export default defineConfig({
     plugins: [
       remix({
         publicPath: "/app/build/",  // For front-public
       }),
     ],
   });
   ```

3. **Rebuild frontend**:
   ```bash
   docker-compose -f docker-compose.dev.yml exec front-public npm run build
   docker-compose -f docker-compose.dev.yml restart front-public
   ```

---

### CORS Errors

**Symptoms**: "Access-Control-Allow-Origin" error in browser

**Note**: Should NOT occur in dev setup - all traffic goes through nginx

**If it does occur**:
1. **Verify you're using nginx URLs**:
   - ✅ http://epicdev.com/app/
   - ❌ http://localhost:4101/

2. **Check nginx CORS headers** (if needed):
   ```nginx
   add_header Access-Control-Allow-Origin *;
   ```

---

### Email Not Sending

**Symptoms**: No email in Mailhog, timeout errors

**Solutions**:
1. **Check Mailhog is running**:
   ```bash
   docker-compose -f docker-compose.dev.yml ps mailhog
   curl http://localhost:8025
   ```

2. **Verify SMTP config in .env.dev**:
   ```
   MAIL_HOST=mailhog
   MAIL_PORT=1025
   MAIL_USE_TLS=false
   ```

3. **Check back-auth logs**:
   ```bash
   docker-compose -f docker-compose.dev.yml logs back-auth | grep -i mail
   ```

---

## 🔧 Configuration Quick Reference

### Key Environment Variables

#### Authentication (.env.dev)
```bash
# JWT
JWT_SECRET_KEY=<generate with: openssl rand -base64 32>
JWT_ALGORITHM=HS256

# Admin User
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=Admin123!ChangeMe

# Session
SESSION_COOKIE_NAME=td_session
SESSION_COOKIE_MAX_AGE=604800  # 7 days
```

#### Database Connections
```bash
DATABASE_URL=postgresql+asyncpg://user:pass@postgresql:5432/main_db
REDIS_URL=redis://redis:6379/0
CASSANDRA_CONTACT_POINTS=cassandra
CASSANDRA_PORT=9042
CASSANDRA_KEYSPACE=tools_dashboard
```

#### OAuth (Google)
```bash
GOOGLE_OAUTH_CLIENT_ID=<from Google Cloud Console>
GOOGLE_OAUTH_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_OAUTH_REDIRECT_URI=http://epicdev.com/app/features/user-registration/verify
GOOGLE_OAUTH_SCOPES=openid email profile
```

#### Email (Mailhog for dev)
```bash
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_SENDER=noreply@tools-dashboard.com
MAIL_USE_TLS=false
```

---

### Port Reference

| Service | Internal Port | External Port | Access URL |
|---------|---------------|---------------|------------|
| nginx | 80 | 80 | http://epicdev.com |
| front-public | 3000 | 4101 | Via nginx at /app/ |
| front-admin | 3000 | 4100 | Via nginx at /admin/ |
| back-api | 8000 | 8100 | Via nginx at /api/ |
| back-auth | 8001 | 8101 | Via nginx at /auth/ |
| back-websockets | 8010 | 8102 | Via nginx at /ws/ |
| feature-registry | 8005 | 8105 | Internal only |
| PostgreSQL | 5432 | 55432 | localhost:55432 |
| Redis | 6379 | 6380 | localhost:6380 |
| Cassandra | 9042 | 39142 | localhost:39142 |
| Mailhog UI | 8025 | 8025 | http://localhost:8025 |

**Rule**: Always access apps via nginx (port 80) in development to avoid CORS issues.

---

## 📝 Code Patterns

### Adding a New Feature (Backend)

1. **Create feature directory**:
   ```bash
   mkdir -p back-auth/features/my-feature
   cd back-auth/features/my-feature
   ```

2. **Create feature files**:
   ```python
   # api.py
   from fastapi import APIRouter
   router = APIRouter(prefix="/my-feature", tags=["my-feature"])

   @router.get("/")
   async def get_feature():
       return {"message": "Hello from my-feature"}

   # domain.py
   def my_business_logic():
       pass

   # infrastructure.py
   # DB calls, external APIs

   # __init__.py
   from .api import router
   __all__ = ["router"]
   ```

3. **Register in main.py**:
   ```python
   from features.my_feature import router as my_feature_router
   app.include_router(my_feature_router)
   ```

4. **Create feature.yaml**:
   ```yaml
   name: my-feature
   version: 1.0.0
   description: My new feature
   ```

---

### Adding a New Remix Route (Frontend)

1. **Create route file**:
   ```tsx
   // app/routes/app.my-route._index.tsx
   import { json, type LoaderFunctionArgs } from "@remix-run/node";
   import { useLoaderData } from "@remix-run/react";

   export async function loader({ request }: LoaderFunctionArgs) {
     return json({ data: "Hello" });
   }

   export default function MyRoute() {
     const { data } = useLoaderData<typeof loader>();
     return <div>{data}</div>;
   }
   ```

2. **Rebuild**:
   ```bash
   docker-compose -f docker-compose.dev.yml exec front-public npm run build
   docker-compose -f docker-compose.dev.yml restart front-public
   ```

3. **Access**: http://epicdev.com/app/my-route

---

## 🎓 Learning Resources

### Remix Docs
- **Routing**: https://remix.run/docs/en/main/file-conventions/routes
- **Loaders/Actions**: https://remix.run/docs/en/main/route/loader
- **Forms**: https://remix.run/docs/en/main/components/form

### FastAPI Docs
- **Routers**: https://fastapi.tiangolo.com/tutorial/bigger-applications/
- **Dependencies**: https://fastapi.tiangolo.com/tutorial/dependencies/
- **Background Tasks**: https://fastapi.tiangolo.com/tutorial/background-tasks/

### Docker Compose
- **Reference**: https://docs.docker.com/compose/compose-file/
- **Networking**: https://docs.docker.com/compose/networking/

---

## 🆘 Getting Help

1. **Check logs first**: `docker-compose -f docker-compose.dev.yml logs <service>`
2. **Search documentation**: This file, `CLAUDE_CONTEXT.md`, service `CONTEXT.md` files
3. **Check recent fixes**: `FIXES_APPLIED_*.md`, `CONSOLE_ERRORS_FIXED_*.md`
4. **Ask Claude Code**: Reference this guide in your prompt

---

**Last Updated**: 2025-11-12
**Maintained by**: Development team
