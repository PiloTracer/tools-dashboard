# Claude Code Session Starters

Quick reference for starting productive Claude Code sessions based on your task.

## General Orientation

```
Read CLAUDE_CONTEXT.md
```

Use when:
- Starting fresh
- General questions
- Exploring codebase
- Bug fixes
- Documentation

---

## General

### Generic starter
```
Please read:
1. CLAUDE_CONTEXT.md
2. .claude/CONVENTIONS.md

Then fix the errors and document in .claude/fixes/
```

## Service-Specific Work

### Frontend Work (Public App)
```
Please read:
1. CLAUDE_CONTEXT.md
2. front-public/CONTEXT.md

I want to work on the public frontend.
```

### Frontend Work (Admin Dashboard)
```
Please read:
1. CLAUDE_CONTEXT.md
2. front-admin/CONTEXT.md

I want to work on the admin dashboard.
```

### Backend API Work
```
Please read:
1. CLAUDE_CONTEXT.md
2. back-api/CONTEXT.md

I want to work on the business API.
```

### Authentication Work
```
Please read:
1. CLAUDE_CONTEXT.md
2. back-auth/CONTEXT.md

I want to work on authentication.
```

### Database Work (PostgreSQL)
```
Please read:
1. CLAUDE_CONTEXT.md
2. back-postgres/CONTEXT.md

I want to work on PostgreSQL repositories.
```

### Database Work (Cassandra)
```
Please read:
1. CLAUDE_CONTEXT.md
2. back-cassandra/CONTEXT.md

I want to work on Cassandra repositories.
```

### Worker/Background Tasks
```
Please read:
1. CLAUDE_CONTEXT.md
2. back-workers/CONTEXT.md

I want to work on background jobs.
```

---

## Feature Implementation

### New Single-Service Feature
```
Please read:
1. CLAUDE_CONTEXT.md
2. {service}/CONTEXT.md
3. .claude/agents/README.md
4. .claude/agents/templates/single-service-feature.yaml

Help me implement a new {feature-name} feature in {service}.
Requirements:
- {requirement 1}
- {requirement 2}
```

### New Cross-Service Feature
```
Please read:
1. CLAUDE_CONTEXT.md
2. .claude/agents/CROSS_SERVICE_FEATURES.md
3. .claude/agents/templates/cross-service-feature.yaml

Help me implement {feature-name} across these services:
- {service-1}
- {service-2}
- {service-3}

Requirements:
- {requirement 1}
- {requirement 2}
```

---

## Using Existing Agents

### User Lifecycle (Registration, Auth, Profile)
```
Please read:
1. CLAUDE_CONTEXT.md
2. .claude/agents/user-registration.yaml

Help me implement {user lifecycle task}.
```

### Custom Agent
```
Please read:
1. CLAUDE_CONTEXT.md
2. .claude/agents/{your-agent}.yaml

Help me implement {task}.
```

---

## Creating a New Agent

```
Please read:
1. CLAUDE_CONTEXT.md
2. .claude/agents/README.md
3. .claude/agents/templates/{single or cross}-service-feature.yaml

Help me create a new agent for {domain/feature area}.
```

---

## Common Scenarios

### "I want to add a user-facing feature"
```
Please read:
1. CLAUDE_CONTEXT.md
2. .claude/agents/CROSS_SERVICE_FEATURES.md

I want to add a user-facing feature: {feature description}

Help me:
1. Identify which services to touch
2. Plan the implementation
3. Implement the feature
```

### "I need to fix a bug in {service}"
```
Please read:
1. CLAUDE_CONTEXT.md
2. {service}/CONTEXT.md

There's a bug in {service}: {bug description}
```

### "I want to understand how {feature} works"
```
Please read CLAUDE_CONTEXT.md

Then explore the codebase and explain how {feature} works.
```

### "I need to add tests for {feature}"
```
Please read:
1. CLAUDE_CONTEXT.md
2. {service}/CONTEXT.md

Help me add tests for {feature} in {service}.
```

### "I want to deploy the application"
```
Please read:
1. CLAUDE_CONTEXT.md
2. STACK_OPERATIONS.md

Help me deploy the application to {environment}.
```

---

## Pro Tips

1. **Be specific about your goal** - Claude works better with clear objectives
2. **Reference the right context** - More context = better understanding
3. **Mention constraints** - "Only modify frontend" or "Must maintain backward compatibility"
4. **Ask for planning first** - "Plan the implementation before coding"
5. **Request reviews** - "Review my approach before implementing"

---

## Quick Copy-Paste

**Most Common (80% of sessions):**
```
Please read CLAUDE_CONTEXT.md and confirm you understand the project structure
```

**For Feature Work:**
```
Please read:
1. CLAUDE_CONTEXT.md
2. .claude/agents/CROSS_SERVICE_FEATURES.md

I want to implement {feature}
```

**For Service-Specific Work:**
```
Please read:
1. CLAUDE_CONTEXT.md
2. {service}/CONTEXT.md

I want to work on {service}
```
