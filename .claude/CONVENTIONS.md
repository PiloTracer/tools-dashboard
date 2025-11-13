# Claude Code Conventions

This document defines organizational conventions for Claude Code sessions to keep the project clean and organized.

---

## File Organization

### Where to Put Generated Documentation

Claude Code generates various documentation files during sessions. Follow these conventions:

#### `.claude/` Directory Structure

```
.claude/
├── CONVENTIONS.md              # This file - organizational rules
├── SESSION_STARTERS.md         # Quick-start commands for sessions
├── agents/                     # Sub-agent configurations
│   ├── README.md
│   ├── CROSS_SERVICE_FEATURES.md
│   ├── templates/
│   └── {agent-name}.yaml
├── fixes/                      # Error fixes and bug reports
│   ├── ERROR_FIXES_YYYY-MM-DD.md
│   └── BUG_FIX_{bug-name}_YYYY-MM-DD.md
├── implementations/            # Feature implementation logs
│   ├── FEATURE_{feature-name}_YYYY-MM-DD.md
│   └── IMPLEMENTATION_{feature}_YYYY-MM-DD.md
├── decisions/                  # Architecture decision records (ADRs)
│   ├── ADR-001-{decision-name}.md
│   └── ADR-002-{decision-name}.md
└── plans/                      # Implementation plans
    ├── PLAN_{feature-name}_YYYY-MM-DD.md
    └── REFACTOR_PLAN_{area}_YYYY-MM-DD.md
```

---

## File Naming Conventions

### Error Fixes
```
.claude/fixes/ERROR_FIXES_YYYY-MM-DD.md
.claude/fixes/BUG_FIX_{descriptive-name}_YYYY-MM-DD.md
```

**Examples:**
- `.claude/fixes/ERROR_FIXES_2025-11-13.md`
- `.claude/fixes/BUG_FIX_hydration-errors_2025-11-13.md`

**When to create:**
- After fixing production errors
- After fixing critical bugs
- After resolving console errors
- After debugging session

**Contents:**
- List of errors fixed
- Root causes
- Solutions applied
- Files modified
- Verification steps
- What remains (if any)

---

### Feature Implementation Logs
```
.claude/implementations/FEATURE_{feature-name}_YYYY-MM-DD.md
.claude/implementations/IMPLEMENTATION_{feature}_YYYY-MM-DD.md
```

**Examples:**
- `.claude/implementations/FEATURE_user-registration_2025-11-13.md`
- `.claude/implementations/IMPLEMENTATION_subscription-management_2025-11-13.md`

**When to create:**
- After implementing a new feature
- After completing a major enhancement
- After significant refactoring

**Contents:**
- Feature overview
- Implementation approach
- Files created/modified
- Testing strategy
- How to use the feature
- Known limitations

---

### Architecture Decision Records (ADRs)
```
.claude/decisions/ADR-{number}-{decision-name}.md
```

**Examples:**
- `.claude/decisions/ADR-001-use-cassandra-for-events.md`
- `.claude/decisions/ADR-002-separate-auth-service.md`

**When to create:**
- When making significant architectural decisions
- When choosing between multiple approaches
- When establishing new patterns

**Contents:**
- Context
- Decision
- Consequences
- Alternatives considered
- Status (proposed, accepted, deprecated, superseded)

---

### Implementation Plans
```
.claude/plans/PLAN_{feature-name}_YYYY-MM-DD.md
.claude/plans/REFACTOR_PLAN_{area}_YYYY-MM-DD.md
```

**Examples:**
- `.claude/plans/PLAN_subscription-management_2025-11-13.md`
- `.claude/plans/REFACTOR_PLAN_authentication_2025-11-13.md`

**When to create:**
- Before starting complex features
- Before major refactoring
- When planning multi-service changes

**Contents:**
- Goals
- Approach
- Services affected
- Step-by-step plan
- Risk assessment
- Rollback strategy

---

## Instructions for Claude Code

### When Creating Documentation Files

**ALWAYS** place documentation in the appropriate `.claude/` subdirectory:

1. **Error fixes and bug reports** → `.claude/fixes/`
2. **Feature implementations** → `.claude/implementations/`
3. **Architecture decisions** → `.claude/decisions/`
4. **Implementation plans** → `.claude/plans/`

**NEVER** place these files in the project root unless explicitly requested.

### File Naming

**ALWAYS** include the date in the filename:
- Format: `YYYY-MM-DD`
- Example: `2025-11-13`

**ALWAYS** use descriptive names:
- ✅ `ERROR_FIXES_2025-11-13.md`
- ✅ `FEATURE_progressive-profiling_2025-11-13.md`
- ❌ `fixes.md`
- ❌ `feature1.md`

### When to Create Each Type

| Situation | File Type | Location |
|-----------|-----------|----------|
| Fixed errors/bugs | `ERROR_FIXES_*.md` or `BUG_FIX_*.md` | `.claude/fixes/` |
| Implemented feature | `FEATURE_*.md` or `IMPLEMENTATION_*.md` | `.claude/implementations/` |
| Made architecture decision | `ADR-*.md` | `.claude/decisions/` |
| Created implementation plan | `PLAN_*.md` or `REFACTOR_PLAN_*.md` | `.claude/plans/` |
| General session notes | `SESSION_NOTES_*.md` | `.claude/` |

---

## Example Session Workflow

### Scenario 1: Fixing Errors

```
User: "Fix these console errors"

Claude:
1. Fixes the errors
2. Creates: .claude/fixes/ERROR_FIXES_2025-11-13.md
3. Documents what was fixed
```

### Scenario 2: Implementing Feature

```
User: "Implement subscription management"

Claude:
1. Plans implementation
2. Creates: .claude/plans/PLAN_subscription-management_2025-11-13.md
3. Implements the feature
4. Creates: .claude/implementations/FEATURE_subscription-management_2025-11-13.md
```

### Scenario 3: Making Architecture Decision

```
User: "Should we use Cassandra or PostgreSQL for events?"

Claude:
1. Analyzes both options
2. Makes recommendation
3. Creates: .claude/decisions/ADR-003-use-cassandra-for-events.md
```

---

## Cleaning Up Old Files

### Retention Guidelines

**Keep Forever:**
- Architecture Decision Records (ADRs)
- Major feature implementations
- Critical bug fixes

**Archive After 90 Days:**
- Minor bug fixes
- Small implementations
- Session notes

**Archive Location:**
```
.claude/archive/YYYY/MM/
```

### How to Archive

```bash
# Create archive directory
mkdir -p .claude/archive/2025/11/

# Move old files
mv .claude/fixes/ERROR_FIXES_2025-11-13.md .claude/archive/2025/11/
```

---

## Root-Level Documentation

Some files should remain at the root level:

### Keep at Root
- `README.md` - Project overview (user-facing)
- `CLAUDE_CONTEXT.md` - Main context file
- `DEVELOPER_SETUP.md` - Setup instructions
- `STACK_OPERATIONS.md` - Operations guide
- `CONTRIBUTING.md` - Contribution guidelines
- `CHANGELOG.md` - Version history

### Move to `.claude/`
- Session notes
- Fix reports
- Implementation logs
- Planning documents
- Claude-specific documentation

---

## Benefits of This Organization

1. **Clean Root Directory**
   - Only essential files visible
   - Easier to navigate

2. **Easy to Find**
   - All Claude documentation in one place
   - Clear naming conventions

3. **Historical Record**
   - Track changes over time
   - See what was fixed when

4. **Better Git Diffs**
   - Claude docs separated from code
   - Easier code reviews

5. **Future Sessions**
   - Claude can reference past fixes
   - Learn from previous decisions

---

## Git Considerations

### What to Commit

**ALWAYS commit:**
- `.claude/CONVENTIONS.md` (this file)
- `.claude/SESSION_STARTERS.md`
- `.claude/agents/` (all agent configs)
- `.claude/decisions/` (architecture decisions)

**OPTIONALLY commit:**
- `.claude/fixes/` (depends on team preference)
- `.claude/implementations/` (depends on team preference)
- `.claude/plans/` (depends on team preference)

**NEVER commit:**
- `.claude/archive/` (use `.gitignore`)
- Temporary session files
- Personal notes

### .gitignore Recommendations

Add to `.gitignore`:
```
.claude/archive/
.claude/temp/
.claude/SESSION_NOTES_*.md
```

---

## Quick Reference

**Error Fixed?** → `.claude/fixes/ERROR_FIXES_YYYY-MM-DD.md`

**Feature Built?** → `.claude/implementations/FEATURE_{name}_YYYY-MM-DD.md`

**Decision Made?** → `.claude/decisions/ADR-{number}-{name}.md`

**Planning Feature?** → `.claude/plans/PLAN_{name}_YYYY-MM-DD.md`

**General Notes?** → `.claude/SESSION_NOTES_YYYY-MM-DD.md`

---

## Updating This Document

When adding new conventions:

1. Update the appropriate section
2. Add examples
3. Update the quick reference
4. Commit the changes

---

**Last Updated:** 2025-11-13
**Version:** 1.0.0
