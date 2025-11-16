# App Library Feature - Starting Prompt

Use this prompt to begin or resume work on the app-library feature in future sessions.

---

## Complete Starting Prompt

```
I need to work on the APP-LIBRARY feature in the TOOLS-DASHBOARD platform.

Please read the following context files in order:
1. CLAUDE_CONTEXT.md
2. .claude/CONVENTIONS.md
3. .claude/features/app-library/README.md
4. .claude/features/app-library/USER_STORIES.md
5. .claude/features/app-library/TECHNICAL_SPEC.md
6. .claude/features/app-library/DATABASE_SCHEMA.md
7. .claude/features/app-library/IMPLEMENTATION_PLAN.md
8. .claude/features/auto-auth.md (dependency)
9. .claude/features/auto-auth/guide-app-library.md

After reading these files, you will understand:
- The overall project architecture
- App-library feature requirements and user stories
- Technical architecture and API design
- Database schema (PostgreSQL, Cassandra, Redis)
- Step-by-step implementation plan
- Integration with auto-auth feature

The app-library feature is a cross-service feature that allows:
- **Users** to browse and launch integrated external applications with automatic OAuth authentication
- **Admins** to manage application registry, control user access, and view usage analytics
- **External apps** to integrate with the platform using OAuth 2.0 and API keys

Current implementation status: PLANNING COMPLETE, READY FOR DEVELOPMENT

Please confirm you understand the architecture and are ready to work on this feature.
```

---

## Quick Resume Prompts

### For Specific Phases

**Phase 1 - Foundation & Contracts:**
```
Work on APP-LIBRARY feature, Phase 1: Foundation & Contracts.

Read:
1. .claude/features/app-library/IMPLEMENTATION_PLAN.md (Phase 1 section)
2. .claude/features/app-library/DATABASE_SCHEMA.md
3. .claude/features/app-library/TECHNICAL_SPEC.md (Data Models section)

Focus on:
- Creating PostgreSQL schema (apps, access rules, user preferences)
- Creating Cassandra schema (launch events, usage stats)
- Defining shared Pydantic models
- Writing migration scripts
- Creating seed data for E-Cards app
```

**Phase 2 - Backend API:**
```
Work on APP-LIBRARY feature, Phase 2: Backend API.

Read:
1. .claude/features/app-library/IMPLEMENTATION_PLAN.md (Phase 2 section)
2. .claude/features/app-library/TECHNICAL_SPEC.md (API Endpoints section)
3. back-api/CONTEXT.md

Focus on:
- Implementing repository layer (PostgreSQL, Cassandra)
- Implementing domain logic (business rules, access control)
- Creating FastAPI endpoints (public and admin)
- Writing unit tests
```

**Phase 3 - Admin Interface:**
```
Work on APP-LIBRARY feature, Phase 3: Admin Interface.

Read:
1. .claude/features/app-library/IMPLEMENTATION_PLAN.md (Phase 3 section)
2. .claude/features/app-library/USER_STORIES.md (Admin stories)
3. .claude/features/app-library/TECHNICAL_SPEC.md (Frontend Components section)
4. front-admin/CONTEXT.md

Focus on:
- Building admin application list view
- Building app creation/edit forms
- Implementing access control UI
- Implementing secret display/regeneration
```

**Phase 4 - User Library:**
```
Work on APP-LIBRARY feature, Phase 4: User Library.

Read:
1. .claude/features/app-library/IMPLEMENTATION_PLAN.md (Phase 4 section)
2. .claude/features/app-library/USER_STORIES.md (User stories)
3. .claude/features/app-library/TECHNICAL_SPEC.md (Frontend Components section)
4. .claude/features/auto-auth/guide-app-library.md
5. front-public/CONTEXT.md

Focus on:
- Building app library dashboard
- Implementing app cards with OAuth launch
- Integrating with auto-auth feature
- Implementing favorites and recently used
```

**Phase 5 - Analytics & Polish:**
```
Work on APP-LIBRARY feature, Phase 5: Analytics & Polish.

Read:
1. .claude/features/app-library/IMPLEMENTATION_PLAN.md (Phase 5 section)
2. .claude/features/app-library/USER_STORIES.md (Usage analytics)

Focus on:
- Implementing usage tracking (Cassandra)
- Building usage analytics dashboard (admin)
- Performance optimization (caching, indexes)
- Comprehensive testing (unit, integration, e2e)
- Documentation updates
```

---

## Troubleshooting Prompts

### If you encounter issues

**Architecture Questions:**
```
I'm working on APP-LIBRARY and have questions about the architecture.

Read:
1. CLAUDE_CONTEXT.md
2. .claude/features/app-library/TECHNICAL_SPEC.md
3. .claude/features/auto-auth.md

Question: [Your question here]
```

**Service Boundary Confusion:**
```
I'm working on APP-LIBRARY and unclear about service boundaries.

Should [functionality] go in:
- back-api (business logic)?
- back-postgres (data layer)?
- back-auth (authentication)?
- front-public (user UI)?
- front-admin (admin UI)?

Context: [Describe the functionality]
```

**Auto-Auth Integration Issues:**
```
I'm working on APP-LIBRARY OAuth integration and encountering issues.

Read:
1. .claude/features/auto-auth.md
2. .claude/features/auto-auth/guide-app-library.md
3. .claude/features/app-library/TECHNICAL_SPEC.md (Security section)

Issue: [Describe the OAuth integration issue]
```

**Testing Issues:**
```
I'm working on APP-LIBRARY tests and encountering issues.

Read:
1. .claude/features/app-library/IMPLEMENTATION_PLAN.md (Testing Strategy section)
2. .claude/features/app-library/TECHNICAL_SPEC.md

Issue: [Describe the testing issue]
```

**Database Schema Questions:**
```
I'm working on APP-LIBRARY database schema and have questions.

Read:
1. .claude/features/app-library/DATABASE_SCHEMA.md
2. .claude/features/app-library/TECHNICAL_SPEC.md (Data Models section)

Question: [Your database question]
```

---

## Context Refresh

If you've been working on other features and need to refresh your understanding:

```
I need to resume work on APP-LIBRARY feature after working on other tasks.

Please re-read:
1. .claude/features/app-library/README.md
2. .claude/features/app-library/IMPLEMENTATION_PLAN.md

Then check the current implementation status:
- What phase are we in?
- What's been implemented so far?
- What's the next task?
- What files have been created/modified?

Provide a brief status summary and recommend next steps.
```

---

## Implementation Checkpoints

Use these prompts to verify progress at key milestones:

**After Phase 1:**
```
I've completed Phase 1 (Foundation & Contracts) of APP-LIBRARY.

Please verify:
- PostgreSQL schema created (apps, access_rules, user_prefs, audit_log)
- Cassandra schema created (launch_events, daily_stats, user_activity)
- Shared Pydantic models defined
- Migration scripts work (up and down)
- Seed data loads successfully (E-Cards app)
- feature.yaml contracts exist

Confirm readiness for Phase 2.
```

**After Phase 2:**
```
I've completed Phase 2 (Backend API) of APP-LIBRARY.

Please verify:
- Repository layer implemented (PostgreSQL, Cassandra)
- Domain logic implemented (all access control modes)
- Public API endpoints work (/api/oauth-clients, etc.)
- Admin API endpoints work (/api/admin/app-library/*, etc.)
- Access control evaluation logic correct
- Unit tests pass (> 80% coverage)

Confirm readiness for Phase 3.
```

**After Phase 3:**
```
I've completed Phase 3 (Admin Interface) of APP-LIBRARY.

Please verify:
- Admin app list displays correctly
- App creation form works (generates client_id and client_secret)
- Client_secret displayed only once
- App edit form works
- Access control UI works (all modes: all_users, all_except, only_specified, subscription_based)
- Delete confirmation works
- All admin flows end-to-end functional

Confirm readiness for Phase 4.
```

**After Phase 4:**
```
I've completed Phase 4 (User Library) of APP-LIBRARY.

Please verify:
- User library dashboard displays apps
- App cards render correctly
- OAuth launch flow works (integrates with auto-auth)
- Favorites toggle works
- Recently used section displays correctly
- Responsive design works (desktop, tablet, mobile)
- Access control respected (users only see allowed apps)

Confirm readiness for Phase 5.
```

**After Phase 5 (Final):**
```
I've completed Phase 5 (Analytics & Polish) of APP-LIBRARY.

Please perform final verification:
- Usage tracking works (events recorded in Cassandra)
- Usage analytics dashboard displays correctly (admin)
- Performance optimizations in place (caching, indexes)
- All tests pass (unit, integration, e2e)
- Documentation complete
- Deployment checklist ready

Confirm feature is ready for deployment.
```

---

## Emergency Recovery

If you lose context mid-implementation:

```
EMERGENCY: I need to recover context for APP-LIBRARY feature.

I was working on: [describe what you were doing]

Please:
1. Read .claude/features/app-library/README.md
2. Read .claude/features/app-library/IMPLEMENTATION_PLAN.md
3. Scan the codebase for app-library files:
   - shared/contracts/app-library/
   - back-api/features/app-library/
   - front-admin/app/features/app-library/
   - front-public/app/features/app-library/
4. Determine current implementation status
5. Identify which phase I'm in
6. Tell me what to do next

Provide a complete status report and next steps.
```

---

## Phase-Specific Quick Starts

### Phase 1: Database Setup

```
Start Phase 1 of APP-LIBRARY: Database Setup

Tasks:
1. Create PostgreSQL migration: back-postgres/migrations/007_create_app_library_tables.sql
2. Create Cassandra schema: back-cassandra/schema/005_app_library.cql
3. Create shared models: shared/contracts/app-library/models.py
4. Create seed data: back-postgres/seeds/dev/007_app_library_seed.sql
5. Test migrations

Starting with task 1. Ready to proceed.
```

### Phase 2: Backend API

```
Start Phase 2 of APP-LIBRARY: Backend API

Tasks:
1. Create repository layer: back-api/features/app-library/infrastructure.py
2. Create domain logic: back-api/features/app-library/domain.py
3. Create API endpoints: back-api/features/app-library/api.py
4. Create feature.yaml: back-api/features/app-library/feature.yaml
5. Write unit tests

Starting with task 1. Ready to proceed.
```

### Phase 3: Admin UI

```
Start Phase 3 of APP-LIBRARY: Admin Interface

Tasks:
1. Create route structure: front-admin/app/features/app-library/routes/
2. Build app list: ui/AppList.tsx
3. Build app form: ui/AppForm.tsx
4. Build access control UI: ui/AccessControl.tsx
5. Integration testing

Starting with task 1. Ready to proceed.
```

### Phase 4: User Library

```
Start Phase 4 of APP-LIBRARY: User Library

Tasks:
1. Create route structure: front-public/app/features/app-library/routes/
2. Build app cards: ui/AppCard.tsx
3. Integrate OAuth launch: ui/AppLauncher.tsx
4. Implement favorites: ui/FavoriteButton.tsx
5. Integration testing

Starting with task 1. Ready to proceed.
```

### Phase 5: Analytics & Polish

```
Start Phase 5 of APP-LIBRARY: Analytics & Polish

Tasks:
1. Implement usage tracking: cassandra_repository.py
2. Build analytics dashboard: ui/UsageChart.tsx, ui/UsageStats.tsx
3. Performance optimization (caching, indexes)
4. Comprehensive testing
5. Documentation updates

Starting with task 1. Ready to proceed.
```

---

## Notes

- Always start with the complete starting prompt for new sessions
- Use phase-specific prompts when working on a particular phase
- Use checkpoint prompts to verify progress
- Use troubleshooting prompts when stuck
- Use emergency recovery if context is lost
- Keep the implementation plan open for reference

---

## Related Features

**Dependencies:**
- auto-auth feature (MUST be implemented first)
- user-management feature (for user search in access control)
- subscription-management feature (for subscription-based access control)

**Integration Points:**
- OAuth 2.0 authorization server (auto-auth)
- User profile data (user-management)
- Subscription tier data (subscription-management)

---

## Quick Command Reference

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f back-api
docker-compose -f docker-compose.dev.yml logs -f front-admin
docker-compose -f docker-compose.dev.yml logs -f front-public

# Run migrations
docker-compose -f docker-compose.dev.yml exec postgresql \
  psql -U user -d main_db -f /migrations/007_create_app_library_tables.sql

# Run tests
docker-compose -f docker-compose.dev.yml exec back-api pytest
docker-compose -f docker-compose.dev.yml exec front-admin npm test
docker-compose -f docker-compose.dev.yml exec front-public npm test

# Access databases
docker-compose -f docker-compose.dev.yml exec postgresql psql -U user -d main_db
docker-compose -f docker-compose.dev.yml exec cassandra cqlsh
docker-compose -f docker-compose.dev.yml exec redis redis-cli

# Rebuild services
docker-compose -f docker-compose.dev.yml build back-api
docker-compose -f docker-compose.dev.yml restart back-api
```

---

**Created**: 2025-11-15
**Last Updated**: 2025-11-15
**Feature Status**: Planning Complete, Ready for Development

