# App Library - Implementation Plan

**Feature:** Application Library with Auto-Authentication
**Version:** 1.0.0
**Last Updated:** 2025-11-15
**Status:** Planning Phase
**Estimated Timeline:** 5 weeks

---

## Table of Contents

1. [Overview](#overview)
2. [Implementation Phases](#implementation-phases)
3. [Phase-by-Phase Breakdown](#phase-by-phase-breakdown)
4. [Testing Strategy](#testing-strategy)
5. [Deployment Plan](#deployment-plan)
6. [Risk Assessment](#risk-assessment)

---

## Overview

### Implementation Approach

The app-library feature will be implemented using an **incremental, layer-by-layer** approach:

1. **Foundation First:** Database schema and shared models
2. **Backend Second:** Business logic and API endpoints
3. **Admin UI Third:** Administrative management interface
4. **User UI Fourth:** End-user library dashboard
5. **Polish & Optimize:** Analytics, testing, performance tuning

### Principles

- **Follow Feature-Centered Architecture:** Code organized by feature, not layer
- **Leverage Existing Infrastructure:** Build on auto-auth feature
- **Test-Driven:** Write tests alongside implementation
- **Incremental Deployment:** Deploy in phases, feature-flag new functionality
- **Documentation First:** Update docs before/during implementation

---

## Implementation Phases

### Phase 1: Foundation & Contracts (Week 1)
**Goal:** Create database schema and shared models
**Duration:** 5 days
**Prerequisites:** Auto-auth feature must be implemented

### Phase 2: Backend API (Week 2)
**Goal:** Implement business logic and REST API endpoints
**Duration:** 5 days
**Prerequisites:** Phase 1 complete

### Phase 3: Admin Interface (Week 3)
**Goal:** Build admin console for app management
**Duration:** 5 days
**Prerequisites:** Phase 2 complete

### Phase 4: User Library (Week 4)
**Goal:** Build user-facing app library dashboard
**Duration:** 5 days
**Prerequisites:** Phase 2 complete (can run parallel with Phase 3)

### Phase 5: Analytics & Polish (Week 5)
**Goal:** Usage analytics, testing, optimization
**Duration:** 5 days
**Prerequisites:** Phases 3 & 4 complete

---

## Phase-by-Phase Breakdown

### Phase 1: Foundation & Contracts

#### Objectives

- [ ] Create PostgreSQL schema for apps, access rules, preferences
- [ ] Create Cassandra schema for launch events and usage stats
- [ ] Define shared Pydantic models
- [ ] Create feature.yaml contracts
- [ ] Write database migration scripts
- [ ] Create seed data for E-Cards app

#### Tasks

**Day 1: Database Schema (PostgreSQL)**

```bash
# Create migration file
touch back-postgres/migrations/007_create_app_library_tables.sql

# Tasks:
- Create apps table
- Create app_access_rules table
- Create user_app_preferences table
- Create app_audit_log table
- Create indexes
- Create update triggers
- Add constraints
```

**Files to Create:**
- `back-postgres/migrations/007_create_app_library_tables.sql`
- `back-postgres/migrations/007_rollback_app_library_tables.sql`

**Day 2: Database Schema (Cassandra)**

```bash
# Create schema file
touch back-cassandra/schema/005_app_library.cql

# Tasks:
- Create app_launch_events table
- Create app_daily_stats table
- Create user_app_activity table
- Create indexes
```

**Files to Create:**
- `back-cassandra/schema/005_app_library.cql`

**Day 3: Shared Models**

```bash
# Create shared models
mkdir -p shared/contracts/app-library
touch shared/contracts/app-library/models.py
touch shared/contracts/app-library/feature.yaml
```

**Models to Define:**
- `App` (application model)
- `AppCreate` (creation DTO)
- `AppUpdate` (update DTO)
- `AccessRule` (access control)
- `UserPreference` (favorites/recent)
- `UsageStats` (analytics)

**Files to Create:**
- `shared/contracts/app-library/models.py`
- `shared/contracts/app-library/feature.yaml`
- `shared/contracts/app-library/__init__.py`

**Day 4: Seed Data**

```bash
# Create seed data for E-Cards app
touch back-postgres/seeds/dev/007_app_library_seed.sql
```

**Seed Data:**
- E-Cards application
- Default access rule (all users)
- Sample user preferences (for testing)

**Files to Create:**
- `back-postgres/seeds/dev/007_app_library_seed.sql`

**Day 5: Testing & Documentation**

```bash
# Test migrations
docker-compose -f docker-compose.dev.yml exec postgresql psql -U user -d main_db -f /migrations/007_create_app_library_tables.sql

# Test seed data
docker-compose -f docker-compose.dev.yml exec postgresql psql -U user -d main_db -f /seeds/dev/007_app_library_seed.sql
```

**Tasks:**
- Test migrations (up and down)
- Verify seed data
- Document any issues
- Update CONTEXT.md files

---

### Phase 2: Backend API

#### Objectives

- [ ] Implement repository layer (PostgreSQL, Cassandra)
- [ ] Implement domain logic (business rules)
- [ ] Create FastAPI endpoints
- [ ] Implement access control logic
- [ ] Write unit tests

#### Tasks

**Day 1: Repository Layer (PostgreSQL)**

```bash
# Create infrastructure layer
mkdir -p back-api/features/app-library
touch back-api/features/app-library/infrastructure.py
```

**Repositories to Implement:**
- `AppRepository` - CRUD for apps
- `AccessRuleRepository` - Access control rules
- `UserPreferenceRepository` - User favorites/recent
- `AuditLogRepository` - Audit trail

**Files to Create:**
- `back-api/features/app-library/infrastructure.py`

**Day 2: Domain Logic**

```bash
# Create domain layer
touch back-api/features/app-library/domain.py
```

**Business Logic Functions:**
- `get_available_apps(user_id)` - Get apps user can access
- `get_app_by_id(app_id)` - Get single app
- `create_app(app_data)` - Create new app
- `update_app(app_id, app_data)` - Update app
- `delete_app(app_id)` - Soft delete app
- `check_user_access(user_id, app_id)` - Access control check
- `update_access_control(app_id, rules)` - Update access rules
- `toggle_favorite(user_id, app_id)` - Toggle favorite
- `record_launch(user_id, app_id)` - Record launch event

**Files to Create:**
- `back-api/features/app-library/domain.py`

**Day 3: API Endpoints (Public)**

```bash
# Create API routes
touch back-api/features/app-library/api.py
touch back-api/features/app-library/feature.yaml
```

**Public Endpoints:**
- `GET /api/oauth-clients` - List apps
- `GET /api/oauth-clients/:id` - Get app details
- `POST /api/user/app-preferences` - Update preferences

**Files to Create:**
- `back-api/features/app-library/api.py` (public endpoints)
- `back-api/features/app-library/feature.yaml`

**Day 4: API Endpoints (Admin)**

**Admin Endpoints:**
- `POST /api/admin/app-library` - Create app
- `PUT /api/admin/app-library/:id` - Update app
- `DELETE /api/admin/app-library/:id` - Delete app
- `PATCH /api/admin/app-library/:id/status` - Toggle active status
- `POST /api/admin/app-library/:id/access` - Update access rules
- `GET /api/admin/app-library/:id/usage` - Get usage stats

**Files to Update:**
- `back-api/features/app-library/api.py` (add admin endpoints)

**Day 5: Unit Tests**

```bash
# Create tests
mkdir -p back-api/features/app-library/tests
touch back-api/features/app-library/tests/test_domain.py
touch back-api/features/app-library/tests/test_api.py
touch back-api/features/app-library/tests/test_infrastructure.py
```

**Test Coverage:**
- Domain logic (all access modes)
- Repository operations
- API endpoints (success & error cases)
- Access control evaluation

**Files to Create:**
- `back-api/features/app-library/tests/test_domain.py`
- `back-api/features/app-library/tests/test_api.py`
- `back-api/features/app-library/tests/test_infrastructure.py`

---

### Phase 3: Admin Interface

#### Objectives

- [ ] Build app management list view
- [ ] Build app creation form
- [ ] Build app edit form
- [ ] Build access control UI
- [ ] Implement secret display/regeneration

#### Tasks

**Day 1: Admin Routes Setup**

```bash
# Create admin feature structure
mkdir -p front-admin/app/features/app-library/routes
mkdir -p front-admin/app/features/app-library/ui
mkdir -p front-admin/app/features/app-library/utils
```

**Routes to Create:**
- `index.tsx` - List all apps
- `new.tsx` - Create new app
- `$id.tsx` - Edit app
- `$id.access.tsx` - Manage access control
- `$id.usage.tsx` - View usage stats

**Files to Create:**
- `front-admin/app/features/app-library/routes/index.tsx` (skeleton)
- `front-admin/app/features/app-library/routes/new.tsx` (skeleton)
- `front-admin/app/features/app-library/routes/$id.tsx` (skeleton)
- `front-admin/app/features/app-library/feature.yaml`

**Day 2: App List & Components**

**Components to Build:**
- `AppList.tsx` - DataTable showing all apps
- `AppStatusBadge.tsx` - Active/Inactive badge
- `DeleteConfirmation.tsx` - Delete confirmation modal

**Files to Create:**
- `front-admin/app/features/app-library/ui/AppList.tsx`
- `front-admin/app/features/app-library/ui/AppStatusBadge.tsx`
- `front-admin/app/features/app-library/ui/DeleteConfirmation.tsx`

**Day 3: App Creation Form**

**Components to Build:**
- `AppForm.tsx` - Create/Edit form component
- `SecretDisplay.tsx` - Display client_secret once
- `RedirectUriInput.tsx` - Array input for redirect URIs

**Utilities to Create:**
- `client-id-generator.ts` - Generate unique client IDs
- `secret-generator.ts` - Generate client secrets
- `validation.ts` - Zod validation schemas

**Files to Create:**
- `front-admin/app/features/app-library/ui/AppForm.tsx`
- `front-admin/app/features/app-library/ui/SecretDisplay.tsx`
- `front-admin/app/features/app-library/ui/RedirectUriInput.tsx`
- `front-admin/app/features/app-library/utils/client-id-generator.ts`
- `front-admin/app/features/app-library/utils/secret-generator.ts`
- `front-admin/app/features/app-library/utils/validation.ts`

**Day 4: Access Control UI**

**Components to Build:**
- `AccessControl.tsx` - Access mode selector
- `UserSearch.tsx` - Search users for access rules
- `SubscriptionTierSelector.tsx` - Select subscription tiers

**Files to Create:**
- `front-admin/app/features/app-library/ui/AccessControl.tsx`
- `front-admin/app/features/app-library/ui/UserSearch.tsx`
- `front-admin/app/features/app-library/ui/SubscriptionTierSelector.tsx`
- `front-admin/app/features/app-library/routes/$id.access.tsx` (implement)

**Day 5: Integration & Testing**

**Tasks:**
- Connect all components to API
- Test CRUD operations end-to-end
- Test access control modes
- Test client_secret generation and display
- Fix bugs and polish UI

---

### Phase 4: User Library

#### Objectives

- [ ] Build app library dashboard
- [ ] Implement app cards
- [ ] Integrate OAuth launch flow
- [ ] Implement favorites & recently used

#### Tasks

**Day 1: User Routes Setup**

```bash
# Create user-facing feature structure
mkdir -p front-public/app/features/app-library/routes
mkdir -p front-public/app/features/app-library/ui
mkdir -p front-public/app/features/app-library/utils
```

**Routes to Create:**
- `index.tsx` - Main library dashboard

**Files to Create:**
- `front-public/app/features/app-library/routes/index.tsx` (skeleton)
- `front-public/app/features/app-library/feature.yaml`

**Day 2: App Card Components**

**Components to Build:**
- `AppCard.tsx` - Individual app card
- `AppGrid.tsx` - Responsive grid layout
- `EmptyState.tsx` - No apps available
- `LoadingState.tsx` - Loading skeleton

**Files to Create:**
- `front-public/app/features/app-library/ui/AppCard.tsx`
- `front-public/app/features/app-library/ui/AppGrid.tsx`
- `front-public/app/features/app-library/ui/EmptyState.tsx`
- `front-public/app/features/app-library/ui/LoadingState.tsx`

**Day 3: OAuth Launch Integration**

**Components to Build:**
- `AppLauncher.tsx` - OAuth launch handler

**Utilities to Create:**
- `oauth.ts` - OAuth helper functions (from auto-auth guide)
- `app-filter.ts` - Client-side filtering
- `app-sort.ts` - Sorting utilities

**Files to Create:**
- `front-public/app/features/app-library/ui/AppLauncher.tsx`
- `front-public/app/features/app-library/utils/app-filter.ts`
- `front-public/app/features/app-library/utils/app-sort.ts`

**Note:** OAuth utilities (`oauth.ts`, `pkce.ts`) should already exist from auto-auth feature integration

**Day 4: Favorites & Recently Used**

**Components to Build:**
- `FavoriteButton.tsx` - Toggle favorite
- `RecentSection.tsx` - Recently used apps section
- `FavoriteSection.tsx` - Favorite apps section

**Files to Create:**
- `front-public/app/features/app-library/ui/FavoriteButton.tsx`
- `front-public/app/features/app-library/ui/RecentSection.tsx`
- `front-public/app/features/app-library/ui/FavoriteSection.tsx`

**Day 5: Integration & Testing**

**Tasks:**
- Connect library to API
- Test OAuth launch flow
- Test favorites toggle
- Test recently used display
- Responsive design testing
- Accessibility testing
- Cross-browser testing

---

### Phase 5: Analytics & Polish

#### Objectives

- [ ] Implement usage tracking
- [ ] Build usage analytics dashboard (admin)
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation updates

#### Tasks

**Day 1: Usage Tracking**

```bash
# Create Cassandra repository for usage events
touch back-api/features/app-library/cassandra_repository.py
```

**Tracking Implementation:**
- Record launch events in Cassandra
- Aggregate daily stats (background job)
- Update user_app_preferences

**Files to Create:**
- `back-api/features/app-library/cassandra_repository.py`
- `back-workers/jobs/aggregate_app_stats.py` (background job)

**Day 2: Analytics Dashboard**

**Components to Build:**
- `UsageChart.tsx` - Time-series chart
- `UsageStats.tsx` - Summary statistics
- `UsageTable.tsx` - Detailed breakdown

**Files to Create:**
- `front-admin/app/features/app-library/ui/UsageChart.tsx`
- `front-admin/app/features/app-library/ui/UsageStats.tsx`
- `front-admin/app/features/app-library/ui/UsageTable.tsx`
- `front-admin/app/features/app-library/routes/$id.usage.tsx` (implement)

**Day 3: Performance Optimization**

**Tasks:**
- Implement Redis caching
- Optimize database queries
- Add database indexes (if missing)
- Lazy load app logos
- Implement pagination (if needed)
- Bundle size optimization

**Day 4: Comprehensive Testing**

**Integration Tests:**
- End-to-end user flows
- Admin workflows
- OAuth integration
- Access control scenarios
- Error handling

**Files to Create:**
- `tests/e2e/app-library-user-flow.spec.ts`
- `tests/e2e/app-library-admin-flow.spec.ts`
- `tests/integration/app-library-oauth.spec.ts`

**Day 5: Documentation & Deployment Prep**

**Documentation Updates:**
- Update `CLAUDE_CONTEXT.md`
- Update service CONTEXT.md files
- Create user guide
- Create admin guide
- Update API documentation

**Deployment Checklist:**
- Environment variables configured
- Migrations tested in staging
- Seed data prepared
- Monitoring configured
- Rollback plan documented

**Files to Create/Update:**
- `.claude/features/app-library/USER_GUIDE.md`
- `.claude/features/app-library/ADMIN_GUIDE.md`
- `.claude/implementations/FEATURE_app-library_2025-11-15.md`

---

## Testing Strategy

### Unit Tests

**Backend (`back-api/features/app-library/tests/`):**
```bash
pytest back-api/features/app-library/tests/
```

**Coverage Target:** > 80%

**Key Test Areas:**
- Domain logic (all access modes)
- Repository CRUD operations
- Access control evaluation
- Client ID generation
- Secret generation

### Integration Tests

**API Endpoints:**
```bash
pytest tests/integration/test_app_library_api.py
```

**Scenarios:**
- Create app → Verify in database
- Update app → Verify changes
- Delete app → Verify soft delete
- Get apps for user → Verify access control
- Launch app → Verify OAuth flow initiation

### End-to-End Tests

**User Flows (Playwright/Cypress):**
```bash
npm run test:e2e
```

**Scenarios:**
1. **User Views Library:**
   - Login → Navigate to /app/library → See apps → Click app → OAuth flow

2. **Admin Creates App:**
   - Login as admin → Navigate to /admin/app-library → Click "Add App" → Fill form → Submit → See client_secret → Close → Verify app in list

3. **Admin Sets Access Control:**
   - Login as admin → Edit app → Set "only specified users" → Add user → Save → Verify user sees app → Verify other user doesn't see app

4. **User Favorites App:**
   - Login → Navigate to library → Click favorite → Verify favorite section → Refresh page → Verify persists

### Performance Tests

**Load Testing:**
```bash
# Use Apache Bench or k6
k6 run performance-tests/app-library-load.js
```

**Scenarios:**
- 100 concurrent users loading library
- 50 concurrent app launches (OAuth flow)
- 20 concurrent admin operations

**Target Metrics:**
- p95 response time < 200ms (library load)
- p95 response time < 3s (OAuth flow)
- No errors under normal load

---

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review approved
- [ ] Database migrations tested in staging
- [ ] Seed data prepared
- [ ] Environment variables configured
- [ ] Monitoring dashboards created
- [ ] Rollback plan documented
- [ ] Team trained on new feature

### Deployment Steps

**Step 1: Database Migrations**

```bash
# Run PostgreSQL migrations
docker-compose -f docker-compose.dev.yml exec postgresql \
  psql -U user -d main_db -f /migrations/007_create_app_library_tables.sql

# Run Cassandra schema
docker-compose -f docker-compose.dev.yml exec cassandra \
  cqlsh -f /schema/005_app_library.cql

# Apply seed data
docker-compose -f docker-compose.dev.yml exec postgresql \
  psql -U user -d main_db -f /seeds/dev/007_app_library_seed.sql
```

**Step 2: Deploy Backend**

```bash
# Rebuild back-api service
docker-compose -f docker-compose.dev.yml build back-api

# Restart back-api
docker-compose -f docker-compose.dev.yml restart back-api

# Verify health
curl http://localhost:8100/health
```

**Step 3: Deploy Frontend**

```bash
# Rebuild front-admin
docker-compose -f docker-compose.dev.yml build front-admin
docker-compose -f docker-compose.dev.yml restart front-admin

# Rebuild front-public
docker-compose -f docker-compose.dev.yml build front-public
docker-compose -f docker-compose.dev.yml restart front-public

# Verify
curl http://localhost:4100/health
curl http://localhost:4101/health
```

**Step 4: Smoke Tests**

```bash
# Test admin endpoints
curl -X GET http://localhost:8100/api/admin/app-library \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# Test public endpoints
curl -X GET http://localhost:8100/api/oauth-clients
```

**Step 5: Monitoring**

- Check application logs
- Verify metrics in dashboard
- Monitor error rates
- Check database performance

### Rollback Plan

**If deployment fails:**

```bash
# 1. Rollback database migrations
docker-compose -f docker-compose.dev.yml exec postgresql \
  psql -U user -d main_db -f /migrations/007_rollback_app_library_tables.sql

# 2. Rollback code
git revert <commit-hash>
git push

# 3. Rebuild and restart services
docker-compose -f docker-compose.dev.yml build
docker-compose -f docker-compose.dev.yml up -d

# 4. Verify rollback successful
curl http://localhost:8100/health
```

---

## Risk Assessment

### High Risk

**Risk:** Database migration fails in production
**Mitigation:**
- Test migrations thoroughly in staging
- Have rollback script ready
- Schedule deployment during low-traffic window
- Monitor migration progress closely

**Risk:** OAuth integration breaks existing flows
**Mitigation:**
- Comprehensive testing with auto-auth feature
- Feature flag for app-library (can disable if issues)
- Monitor OAuth error rates closely

### Medium Risk

**Risk:** Performance degradation under load
**Mitigation:**
- Load testing before deployment
- Implement caching strategy
- Monitor database query performance
- Have auto-scaling configured

**Risk:** Access control logic has bugs
**Mitigation:**
- Extensive unit tests for all access modes
- Manual testing of edge cases
- Start with "all users" mode only
- Roll out advanced modes incrementally

### Low Risk

**Risk:** UI/UX issues
**Mitigation:**
- User acceptance testing
- Cross-browser testing
- Responsive design testing
- Gather feedback early

**Risk:** Documentation gaps
**Mitigation:**
- Document as we build
- Peer review documentation
- Create video tutorials
- Maintain FAQ

---

## Success Criteria

### Launch Criteria

- [ ] All acceptance criteria from user stories met
- [ ] All tests passing (> 80% coverage)
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] Accessibility audit passed
- [ ] Documentation complete
- [ ] Team training complete

### Post-Launch Metrics (First 30 Days)

**Adoption:**
- [ ] > 50% of users visit library at least once
- [ ] > 25% of users launch at least one app
- [ ] < 5% error rate on OAuth flows

**Performance:**
- [ ] p95 library load time < 2 seconds
- [ ] p95 OAuth completion time < 3 seconds
- [ ] 99.9% uptime

**Admin Usage:**
- [ ] At least 3 new apps registered
- [ ] Access control used on at least 1 app

---

## Timeline Summary

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Foundation | 1 week | Week 1 | Week 1 |
| Phase 2: Backend API | 1 week | Week 2 | Week 2 |
| Phase 3: Admin UI | 1 week | Week 3 | Week 3 |
| Phase 4: User Library | 1 week | Week 4 | Week 4 |
| Phase 5: Analytics & Polish | 1 week | Week 5 | Week 5 |
| **Total** | **5 weeks** | | |

**Note:** Phases 3 and 4 can run partially in parallel if multiple developers are available.

---

**Document Owner:** Engineering Lead
**Stakeholders:** Product, Design, QA, DevOps
**Next Steps:** Review and approval, assign tasks, begin Phase 1

---

## Appendix: File Checklist

### Files to Create (Complete List)

**Shared Contracts:**
- `shared/contracts/app-library/models.py`
- `shared/contracts/app-library/feature.yaml`
- `shared/contracts/app-library/__init__.py`

**Database:**
- `back-postgres/migrations/007_create_app_library_tables.sql`
- `back-postgres/migrations/007_rollback_app_library_tables.sql`
- `back-postgres/seeds/dev/007_app_library_seed.sql`
- `back-cassandra/schema/005_app_library.cql`

**Back-API:**
- `back-api/features/app-library/feature.yaml`
- `back-api/features/app-library/api.py`
- `back-api/features/app-library/domain.py`
- `back-api/features/app-library/infrastructure.py`
- `back-api/features/app-library/cassandra_repository.py`
- `back-api/features/app-library/__init__.py`
- `back-api/features/app-library/tests/test_domain.py`
- `back-api/features/app-library/tests/test_api.py`
- `back-api/features/app-library/tests/test_infrastructure.py`

**Front-Admin:**
- `front-admin/app/features/app-library/feature.yaml`
- `front-admin/app/features/app-library/routes/index.tsx`
- `front-admin/app/features/app-library/routes/new.tsx`
- `front-admin/app/features/app-library/routes/$id.tsx`
- `front-admin/app/features/app-library/routes/$id.access.tsx`
- `front-admin/app/features/app-library/routes/$id.usage.tsx`
- `front-admin/app/features/app-library/ui/AppList.tsx`
- `front-admin/app/features/app-library/ui/AppForm.tsx`
- `front-admin/app/features/app-library/ui/AppStatusBadge.tsx`
- `front-admin/app/features/app-library/ui/SecretDisplay.tsx`
- `front-admin/app/features/app-library/ui/RedirectUriInput.tsx`
- `front-admin/app/features/app-library/ui/DeleteConfirmation.tsx`
- `front-admin/app/features/app-library/ui/AccessControl.tsx`
- `front-admin/app/features/app-library/ui/UserSearch.tsx`
- `front-admin/app/features/app-library/ui/SubscriptionTierSelector.tsx`
- `front-admin/app/features/app-library/ui/UsageChart.tsx`
- `front-admin/app/features/app-library/ui/UsageStats.tsx`
- `front-admin/app/features/app-library/ui/UsageTable.tsx`
- `front-admin/app/features/app-library/utils/client-id-generator.ts`
- `front-admin/app/features/app-library/utils/secret-generator.ts`
- `front-admin/app/features/app-library/utils/validation.ts`

**Front-Public:**
- `front-public/app/features/app-library/feature.yaml`
- `front-public/app/features/app-library/routes/index.tsx`
- `front-public/app/features/app-library/ui/AppCard.tsx`
- `front-public/app/features/app-library/ui/AppGrid.tsx`
- `front-public/app/features/app-library/ui/AppLauncher.tsx`
- `front-public/app/features/app-library/ui/EmptyState.tsx`
- `front-public/app/features/app-library/ui/LoadingState.tsx`
- `front-public/app/features/app-library/ui/FavoriteButton.tsx`
- `front-public/app/features/app-library/ui/RecentSection.tsx`
- `front-public/app/features/app-library/ui/FavoriteSection.tsx`
- `front-public/app/features/app-library/utils/app-filter.ts`
- `front-public/app/features/app-library/utils/app-sort.ts`

**Documentation:**
- `.claude/features/app-library/README.md`
- `.claude/features/app-library/USER_STORIES.md` ✅
- `.claude/features/app-library/TECHNICAL_SPEC.md` ✅
- `.claude/features/app-library/DATABASE_SCHEMA.md` ✅
- `.claude/features/app-library/IMPLEMENTATION_PLAN.md` ✅
- `.claude/features/app-library/USER_GUIDE.md`
- `.claude/features/app-library/ADMIN_GUIDE.md`
- `.claude/prompts/app-library-starter.md`
- `.claude/implementations/FEATURE_app-library_2025-11-15.md`

**Total Files:** 60+

