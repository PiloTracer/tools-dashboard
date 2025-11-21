# User Management Feature - Starting Prompt

Use this prompt to begin or resume work on the user-management feature in future sessions.

---

## Complete Starting Prompt

```
I need to work on the USER-MANAGEMENT feature in the FRONT-ADMIN application.

Please read the following context files in order:
1. CLAUDE_CONTEXT.md
2. .claude/agents/CROSS_SERVICE_FEATURES.md
3. .claude/agents/user-management.yaml
4. .claude/plans/user-management-implementation.md
5. .claude/plans/user-management-cassandra-addendum.md
6. front-admin/CLAUDE_CONTEXT.md
7. back-api/CLAUDE_CONTEXT.md
8. back-auth/CLAUDE_CONTEXT.md
9. back-postgres/CLAUDE_CONTEXT.md
10. back-cassandra/CLAUDE_CONTEXT.md

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

Please confirm you understand the architecture and are ready to work on this feature.
```

---

## Quick Resume Prompts

### For Specific Phases

**Phase 1 - Foundation & Contracts:**
```
Work on USER-MANAGEMENT feature, Phase 1: Foundation & Contracts.

Read:
1. .claude/agents/user-management.yaml
2. .claude/plans/user-management-implementation.md (Phase 1 section)

Focus on:
- Creating shared models in shared/models/user.py
- Creating shared contract in shared/contracts/user-management/feature.yaml
```

**Phase 2 - Data Layer:**
```
Work on USER-MANAGEMENT feature, Phase 2: Data Layer.

Read:
1. .claude/agents/user-management.yaml
2. .claude/plans/user-management-implementation.md (Phase 2 section)
3. back-postgres/CLAUDE_CONTEXT.md

Focus on:
- Enhancing user_repository.py with search/filter/pagination
- Creating audit_repository.py for audit logging
```

**Phase 3 - Authentication Layer:**
```
Work on USER-MANAGEMENT feature, Phase 3: Authentication Layer.

Read:
1. .claude/agents/user-management.yaml
2. .claude/plans/user-management-implementation.md (Phase 3 section)
3. back-auth/CLAUDE_CONTEXT.md

Focus on:
- Implementing back-auth/features/user-management/
- Role assignment endpoints
- Session invalidation logic
```

**Phase 4 - Business API:**
```
Work on USER-MANAGEMENT feature, Phase 4: Business API.

Read:
1. .claude/agents/user-management.yaml
2. .claude/plans/user-management-implementation.md (Phase 4 section)
3. back-api/CLAUDE_CONTEXT.md

Focus on:
- Implementing back-api/features/user-management/
- User listing, detail, update endpoints
- Business logic and orchestration
```

**Phase 5 - Admin Frontend:**
```
Work on USER-MANAGEMENT feature, Phase 5: Admin Frontend.

Read:
1. .claude/agents/user-management.yaml
2. .claude/plans/user-management-implementation.md (Phase 5 section)
3. front-admin/CLAUDE_CONTEXT.md

Focus on:
- Implementing UI components in front-admin/app/features/user-management/ui/
- Implementing Remix routes in front-admin/app/features/user-management/routes/
- User table, detail view, edit form
```

**Phase 6 - Integration & Testing:**
```
Work on USER-MANAGEMENT feature, Phase 6: Integration & Testing.

Read:
1. .claude/agents/user-management.yaml
2. .claude/plans/user-management-implementation.md (Phase 6 section)

Focus on:
- Integration testing across all services
- E2E testing for critical flows
- Security testing
- Performance optimization
```

**Phase 7 - Documentation & Deployment:**
```
Work on USER-MANAGEMENT feature, Phase 7: Documentation & Deployment.

Read:
1. .claude/agents/user-management.yaml
2. .claude/plans/user-management-implementation.md (Phase 7 section)

Focus on:
- Updating service CLAUDE_CONTEXT.md files
- Creating user documentation
- Deployment preparation
- Rollback planning
```

---

## Troubleshooting Prompts

### If you encounter issues

**Architecture Questions:**
```
I'm working on USER-MANAGEMENT and have questions about the architecture.

Read:
1. CLAUDE_CONTEXT.md
2. .claude/agents/CROSS_SERVICE_FEATURES.md
3. .claude/agents/user-management.yaml

Question: [Your question here]
```

**Service Boundary Confusion:**
```
I'm working on USER-MANAGEMENT and unclear about service boundaries.

Read:
1. .claude/agents/CROSS_SERVICE_FEATURES.md (Service Boundaries section)
2. .claude/agents/user-management.yaml (Service Responsibilities section)
3. [specific service]/CLAUDE_CONTEXT.md

Question: Should [action] go in [service A] or [service B]?
```

**Testing Issues:**
```
I'm working on USER-MANAGEMENT tests and encountering issues.

Read:
1. .claude/plans/user-management-implementation.md (Testing Strategy section)
2. .claude/agents/user-management.yaml (Testing Strategy section)

Issue: [Describe the testing issue]
```

---

## Context Refresh

If you've been working on other features and need to refresh your understanding:

```
I need to resume work on USER-MANAGEMENT feature after working on other tasks.

Please re-read:
1. .claude/agents/user-management.yaml
2. .claude/plans/user-management-implementation.md

Then check the current implementation status:
- What's been implemented?
- What's the next phase?
- What files have been created/modified?

Provide a brief status summary.
```

---

## Implementation Checkpoints

Use these prompts to verify progress at key milestones:

**After Phase 1:**
```
I've completed Phase 1 (Foundation & Contracts) of USER-MANAGEMENT.

Please verify:
- shared/models/user.py has admin-specific models
- shared/contracts/user-management/feature.yaml exists and is complete
- All models and contracts follow the architecture guidelines

Confirm readiness for Phase 2.
```

**After Phase 2:**
```
I've completed Phase 2 (Data Layer) of USER-MANAGEMENT.

Please verify:
- user_repository.py has search/filter/pagination methods
- audit_repository.py exists and works
- All repository methods follow the repository pattern
- Unit tests pass

Confirm readiness for Phase 3.
```

**After Phase 3:**
```
I've completed Phase 3 (Authentication Layer) of USER-MANAGEMENT.

Please verify:
- back-auth/features/user-management/ is complete
- Role assignment works
- Session invalidation works
- Permission checks are in place
- Auth tests pass

Confirm readiness for Phase 4.
```

**After Phase 4:**
```
I've completed Phase 4 (Business API) of USER-MANAGEMENT.

Please verify:
- back-api/features/user-management/ is complete
- All endpoints work correctly
- Business logic is properly separated
- Audit logging works
- API tests pass

Confirm readiness for Phase 5.
```

**After Phase 5:**
```
I've completed Phase 5 (Admin Frontend) of USER-MANAGEMENT.

Please verify:
- All UI components are implemented
- All routes work correctly
- Frontend follows Remix patterns
- No business logic in frontend
- Frontend tests pass

Confirm readiness for Phase 6.
```

**After Phase 6:**
```
I've completed Phase 6 (Integration & Testing) of USER-MANAGEMENT.

Please verify:
- Integration tests pass
- E2E tests pass
- Security tests pass
- Performance is acceptable
- Audit logging verified

Confirm readiness for Phase 7.
```

**After Phase 7 (Final):**
```
I've completed Phase 7 (Documentation & Deployment) of USER-MANAGEMENT.

Please perform final verification:
- All documentation is complete
- Deployment plan is ready
- Rollback plan exists
- All tests pass
- All success criteria met

Confirm feature is ready for deployment.
```

---

## Emergency Recovery

If you lose context mid-implementation:

```
EMERGENCY: I need to recover context for USER-MANAGEMENT feature.

I was working on: [describe what you were doing]

Please:
1. Read .claude/agents/user-management.yaml
2. Read .claude/plans/user-management-implementation.md
3. Scan the codebase for user-management files
4. Determine current implementation status
5. Identify which phase I'm in
6. Tell me what to do next

Provide a complete status report and next steps.
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

**Created**: 2025-11-13
**Last Updated**: 2025-11-13
