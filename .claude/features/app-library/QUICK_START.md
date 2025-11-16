# App Library - Quick Start Guide

**Last Updated:** 2025-11-15
**Phase 1 Status:** ✅ Complete
**Next Phase:** Phase 2 - Backend API

---

## 📍 Quick Reference

### File Locations

```
📁 Database Schemas
├── back-postgres/schema/007_app_library_tables.sql
├── back-postgres/schema/007_rollback_app_library_tables.sql
└── back-cassandra/schema/005_app_library.cql

📁 Seed Data
└── back-postgres/seeds/dev/007_app_library_seed.sql

📁 Shared Models
├── shared/contracts/app-library/models.py
├── shared/contracts/app-library/feature.yaml
└── shared/contracts/app-library/__init__.py

📁 Documentation
├── .claude/features/app-library/README.md               ← Overview
├── .claude/features/app-library/IMPLEMENTATION_PLAN.md  ← Full plan
├── .claude/features/app-library/DATABASE_SCHEMA.md      ← Schema details
└── .claude/implementations/PHASE_1_*_2025-11-15.md      ← Phase 1 log
```

---

## 🚀 Getting Started

### 1. Apply Database Migrations

```bash
# PostgreSQL
cat back-postgres/schema/007_app_library_tables.sql | \
  docker-compose -f docker-compose.dev.yml exec -T postgresql \
  psql -U user -d main_db

# Cassandra
cat back-cassandra/schema/005_app_library.cql | \
  docker-compose -f docker-compose.dev.yml exec -T cassandra \
  cqlsh
```

### 2. Load Seed Data

```bash
cat back-postgres/seeds/dev/007_app_library_seed.sql | \
  docker-compose -f docker-compose.dev.yml exec -T postgresql \
  psql -U user -d main_db
```

### 3. Verify Installation

```bash
# Check E-Cards app exists
docker-compose -f docker-compose.dev.yml exec -T postgresql \
  psql -U user -d main_db \
  -c "SELECT client_id, client_name, is_active FROM oauth_clients WHERE client_id = 'ecards_a1b2c3d4';"
```

---

## 📊 Database Schema Summary

### PostgreSQL Tables (4 + 1 extended)

| Table | Purpose | Rows (seed) |
|-------|---------|-------------|
| `oauth_clients` | Applications (extended with 3 columns) | 1 |
| `app_access_rules` | Access control | 1 |
| `user_app_preferences` | User favorites/recent | 1 |
| `app_audit_log` | Audit trail | 0 |

### Cassandra Tables (3)

| Table | Purpose | TTL |
|-------|---------|-----|
| `app_launch_events` | Launch tracking | 90 days |
| `app_daily_stats` | Daily aggregations | 2 years |
| `user_app_activity` | User activity | None |

---

## 🔑 E-Cards Test Application

**Development credentials (DO NOT USE IN PRODUCTION):**

```
Client ID:     ecards_a1b2c3d4
Client Secret: dev_secret_do_not_use_in_production
Dev URL:       http://localhost:7300
Prod URL:      https://ecards.epicstudio.com
```

**Redirect URIs:**
- `http://localhost:7300/auth/callback`
- `https://ecards.epicstudio.com/auth/callback`

**Scopes:**
- `profile`
- `email`
- `subscription`

**Access:** All users

---

## 💻 Using Pydantic Models

```python
# Import models
from shared.contracts.app_library import (
    App,
    AppCreate,
    AccessMode,
    UserPreference
)

# Create application
app_data = AppCreate(
    client_name="My App",
    description="App description",
    dev_url="http://localhost:3000",
    redirect_uris=["http://localhost:3000/auth/callback"],
    allowed_scopes=["profile", "email"]
)

# Access control modes
mode = AccessMode.ALL_USERS  # All authenticated users
mode = AccessMode.ONLY_SPECIFIED  # Only specified users
mode = AccessMode.SUBSCRIPTION_BASED  # Based on subscription tier
```

---

## 🔍 Common Queries

### PostgreSQL

```sql
-- Get all active apps
SELECT client_id, client_name, is_active, dev_url
FROM oauth_clients
WHERE is_active = true AND deleted_at IS NULL;

-- Get apps with access rules
SELECT oc.client_name, aar.mode, aar.user_ids
FROM oauth_clients oc
LEFT JOIN app_access_rules aar ON oc.id = aar.app_id
WHERE oc.is_active = true;

-- Get user's favorite apps
SELECT oc.client_name, uap.launch_count, uap.last_launched_at
FROM user_app_preferences uap
JOIN oauth_clients oc ON uap.app_client_id = oc.client_id
WHERE uap.user_id = 1 AND uap.is_favorite = true;
```

### Cassandra

```cql
-- Get launch events for today
SELECT * FROM auth_events.app_launch_events
WHERE app_client_id = 'ecards_a1b2c3d4'
  AND launch_date = '2025-11-15';

-- Get daily stats (last 7 days)
SELECT stat_date, total_launches, successful_launches, failed_launches
FROM auth_events.app_daily_stats
WHERE app_client_id = 'ecards_a1b2c3d4'
  AND stat_date >= '2025-11-08'
  AND stat_date <= '2025-11-15';

-- Get user activity
SELECT app_client_id, total_launches, last_launch_timestamp
FROM auth_events.user_app_activity
WHERE user_id = <uuid>;
```

---

## 🛠️ Development Commands

### Rollback Migration

```bash
cat back-postgres/schema/007_rollback_app_library_tables.sql | \
  docker-compose -f docker-compose.dev.yml exec -T postgresql \
  psql -U user -d main_db
```

### View Tables

```bash
# PostgreSQL
docker-compose -f docker-compose.dev.yml exec -T postgresql \
  psql -U user -d main_db -c "\dt"

# Cassandra
docker-compose -f docker-compose.dev.yml exec -T cassandra \
  cqlsh -e "DESCRIBE TABLES IN auth_events;"
```

### Check Data

```bash
# Count apps
docker-compose -f docker-compose.dev.yml exec -T postgresql \
  psql -U user -d main_db \
  -c "SELECT COUNT(*) FROM oauth_clients;"

# Count launch events
docker-compose -f docker-compose.dev.yml exec -T cassandra \
  cqlsh -e "SELECT COUNT(*) FROM auth_events.app_launch_events WHERE app_client_id = 'ecards_a1b2c3d4' AND launch_date = '2025-11-15';"
```

---

## 📋 API Endpoints (Phase 2)

**Public Endpoints:**
- `GET /api/oauth-clients` - List apps
- `GET /api/oauth-clients/:id` - Get app
- `POST /api/user/app-preferences` - Update preferences
- `POST /api/user/app-preferences/:id/toggle-favorite` - Toggle favorite

**Admin Endpoints:**
- `GET /api/admin/app-library` - List all (admin)
- `POST /api/admin/app-library` - Create app
- `PUT /api/admin/app-library/:id` - Update app
- `DELETE /api/admin/app-library/:id` - Delete app
- `POST /api/admin/app-library/:id/regenerate-secret` - Regenerate secret
- `POST /api/admin/app-library/:id/access` - Update access rules
- `GET /api/admin/app-library/:id/usage` - Get usage stats
- `GET /api/admin/app-library/:id/audit-log` - Get audit log

*Note: These endpoints will be implemented in Phase 2*

---

## 🐛 Troubleshooting

### Issue: Migration fails with "table already exists"

**Solution:** Rollback first, then re-apply
```bash
cat back-postgres/schema/007_rollback_app_library_tables.sql | \
  docker-compose -f docker-compose.dev.yml exec -T postgresql psql -U user -d main_db
```

### Issue: Seed data fails with "users table doesn't exist"

**Solution:** Ensure back-auth service has created users table, or create manually:
```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL
);
INSERT INTO users (email) VALUES ('admin@example.com');
```

### Issue: Cassandra "Cannot mix COUNTER and non-counter columns"

**Solution:** This is already fixed. We use INT instead of COUNTER.

### Issue: Access control not working

**Check:**
1. Access rule exists for the app
2. User ID matches what's in the rule
3. Mode is correct (all_users, only_specified, etc.)

```sql
SELECT * FROM app_access_rules aar
JOIN oauth_clients oc ON aar.app_id = oc.id
WHERE oc.client_id = 'ecards_a1b2c3d4';
```

---

## 📚 Additional Resources

### Documentation
- **Overview:** `.claude/features/app-library/README.md`
- **User Stories:** `.claude/features/app-library/USER_STORIES.md`
- **Technical Spec:** `.claude/features/app-library/TECHNICAL_SPEC.md`
- **Database Schema:** `.claude/features/app-library/DATABASE_SCHEMA.md`
- **Implementation Plan:** `.claude/features/app-library/IMPLEMENTATION_PLAN.md`

### Phase Logs
- **Phase 1:** `.claude/implementations/PHASE_1_APP_LIBRARY_FOUNDATION_2025-11-15.md`

### External Dependencies
- **Auto-Auth:** `.claude/features/auto-auth.md`
- **OAuth Integration:** `.claude/features/auto-auth/guide-app-library.md`

---

## ✅ Phase 1 Checklist

- [x] PostgreSQL schema created
- [x] Cassandra schema created
- [x] Pydantic models defined
- [x] Feature contract written
- [x] Seed data created
- [x] All migrations tested
- [x] Documentation completed

**Phase 1 Status:** ✅ **COMPLETE**

**Ready for:** Phase 2 - Backend API

---

## 🚦 Next Steps

### For Claude Code Session

```
I need to start Phase 2 of the APP-LIBRARY feature (Backend API).

Please read:
1. CLAUDE_CONTEXT.md
2. .claude/features/app-library/IMPLEMENTATION_PLAN.md
3. .claude/implementations/PHASE_1_APP_LIBRARY_FOUNDATION_2025-11-15.md

I'm ready to begin Phase 2, Day 1: Repository Layer.
```

### For Manual Implementation

1. Start with `back-api/features/app-library/infrastructure.py`
2. Implement AppRepository with CRUD operations
3. Follow the implementation plan in detail
4. Write tests as you go

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-15
**Status:** Complete

**Location:** `.claude/features/app-library/QUICK_START.md`
