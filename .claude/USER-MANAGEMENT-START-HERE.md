# USER-MANAGEMENT Feature - START HERE

**Quick Start Guide for Future Development Sessions**

---

## 📋 Copy This Prompt to Start Working

```
I need to work on the USER-MANAGEMENT feature in the FRONT-ADMIN application.

Please read the following context files in order:
1. CLAUDE_CONTEXT.md
2. .claude/agents/CROSS_SERVICE_FEATURES.md
3. .claude/agents/user-management.yaml
4. .claude/plans/user-management-implementation.md
5. .claude/plans/user-management-cassandra-addendum.md
6. front-admin/CONTEXT.md
7. back-api/CONTEXT.md
8. back-auth/CONTEXT.md
9. back-postgres/CONTEXT.md
10. back-cassandra/CONTEXT.md

After reading these files, you will understand:
- The overall project architecture
- Cross-service feature development patterns
- The user-management feature requirements
- The complete implementation plan
- Service-specific guidelines

The user-management feature is a cross-service admin feature that allows administrators to:
- View paginated lists of users
- Search and filter users
- View detailed user information
- Edit user profiles
- Assign and manage user roles
- Control user status (active/inactive/suspended)
- Perform bulk operations
- Export user data

Current implementation status: SKELETON EXISTS in front-admin, backend not yet implemented.

Please confirm you understand the architecture and are ready to work on this feature. Then, let's start with Phase 1.
```

---

## 📁 What You Need to Know

### Files Created for This Feature

1. **`.claude/agents/user-management.yaml`**
   - Specialized agent that understands the feature architecture
   - Service responsibilities and boundaries
   - Implementation order
   - Security constraints

2. **`.claude/plans/user-management-implementation.md`**
   - Complete 7-phase implementation plan
   - Detailed task lists for each phase
   - API endpoints documentation
   - Data models
   - Testing strategy

3. **`.claude/prompts/user-management-starter.md`**
   - Starting prompts for each phase
   - Troubleshooting prompts
   - Checkpoint verification prompts
   - Emergency recovery prompts

4. **`.claude/USER-MANAGEMENT-SUMMARY.md`**
   - Overview of the entire feature
   - Current status
   - Success criteria

---

## 🎯 Implementation Phases

| Phase | Focus | Time Estimate | Files to Create/Modify |
|-------|-------|---------------|------------------------|
| **1. Foundation** | Shared models & contracts | 1-2 hours | `shared/models/user.py`<br>`shared/contracts/user-management/feature.yaml` |
| **2. Data Layer** | Repository enhancements | 2-3 hours | `back-postgres/repositories/user_repository.py`<br>`back-cassandra/repositories/audit_repository.py` |
| **3. Auth Layer** | Role management | 2-3 hours | `back-auth/features/user-management/*` |
| **4. Business API** | Orchestration & endpoints | 3-4 hours | `back-api/features/user-management/*` |
| **5. Frontend** | Admin UI components | 4-6 hours | `front-admin/app/features/user-management/*` |
| **6. Testing** | Integration & E2E tests | 2-3 hours | Test files across all services |
| **7. Documentation** | Docs & deployment | 1-2 hours | Service CONTEXT.md files, user guides |

**Total Estimate**: 15-20 hours across 5 sessions

---

## 🚀 Quick Start Steps

1. **Copy the prompt above** and paste it in a new Claude Code session

2. **Wait for Claude to read all context files** (this takes a moment)

3. **Claude will confirm understanding** and be ready to start Phase 1

4. **Follow the phases in order** - don't skip ahead!

---

## 📊 Current Status

### ✅ Done (Planning)
- Agent definition created
- Implementation plan created
- Starting prompts created
- Architecture defined

### ❌ To Do (Implementation)
- Phase 1: Shared models and contracts
- Phase 2: Repository enhancements
- Phase 3: Authentication layer
- Phase 4: Business API
- Phase 5: Admin frontend
- Phase 6: Testing
- Phase 7: Documentation

**Next Step**: Phase 1 - Foundation & Contracts

---

## 🔑 Key Architectural Principles

When implementing, always remember:

1. **Service Boundaries**
   - Frontend: UI only, NO business logic
   - back-api: Orchestration, NO database logic
   - back-auth: Authentication/authorization only
   - back-postgres: Data persistence only

2. **Data Flow**
   - Frontend → back-api → back-auth + back-postgres
   - Never skip layers

3. **Security**
   - All endpoints require admin JWT
   - All actions are audited
   - Prevent self-privilege-escalation
   - Invalidate sessions on role/status change

4. **Implementation Order**
   - Shared → Data → Auth → API → Frontend
   - Test each layer before moving on

---

## 📚 Reference Documents

### For Planning
- `.claude/plans/user-management-implementation.md` - Full implementation plan
- `.claude/USER-MANAGEMENT-SUMMARY.md` - Feature overview

### For Architecture
- `.claude/agents/user-management.yaml` - Agent definition
- `.claude/agents/CROSS_SERVICE_FEATURES.md` - Cross-service patterns
- `CLAUDE_CONTEXT.md` - Project overview

### For Implementation
- Service-specific `CONTEXT.md` files - Guidelines for each service
- `.claude/prompts/user-management-starter.md` - Phase-specific prompts

---

## 🆘 Need Help?

### During Implementation

**If you get stuck**, use troubleshooting prompts from:
`.claude/prompts/user-management-starter.md`

**If you lose context**, use emergency recovery prompt from:
`.claude/prompts/user-management-starter.md`

### Between Sessions

**To resume work**, use phase-specific prompts from:
`.claude/prompts/user-management-starter.md`

**To verify progress**, use checkpoint prompts from:
`.claude/prompts/user-management-starter.md`

---

## ✨ Success Criteria

The feature is complete when:

- [ ] Admins can view paginated user lists
- [ ] Admins can search and filter users
- [ ] Admins can view user details
- [ ] Admins can edit user information
- [ ] Admins can manage roles
- [ ] Admins can control user status
- [ ] Admins can perform bulk operations
- [ ] All actions are audited
- [ ] Sessions invalidate on role/status change
- [ ] Self-privilege-escalation prevented
- [ ] All tests pass (unit, integration, E2E)
- [ ] Documentation complete

---

## 🎬 Let's Get Started!

1. Copy the starting prompt from the top of this file
2. Paste it in your Claude Code session
3. Wait for context to load
4. Begin implementation!

**Good luck!** 🚀

---

**Created**: 2025-11-13
**Status**: Ready for Implementation
**Next Action**: Copy the starting prompt and begin Phase 1
