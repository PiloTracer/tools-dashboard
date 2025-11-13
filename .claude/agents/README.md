# Claude Code Sub-Agent System

## Overview

This directory contains specialized sub-agent configurations for working on specific features or domains within the Tools Dashboard project. Sub-agents help Claude maintain focus on specific architectural boundaries and ensure consistent implementation patterns.

## Directory Structure

```
.claude/agents/
├── README.md                           # This file
├── CROSS_SERVICE_FEATURES.md           # Guide for features spanning multiple services
├── templates/                          # Templates for creating new agents
│   ├── single-service-feature.yaml     # Template for features in one service
│   └── cross-service-feature.yaml      # Template for features across services
│
├── user-registration.yaml              # Example: User lifecycle agent
├── user-registration-feature-context.md
├── HOW-TO-USE-USER-REGISTRATION-AGENT.md
├── PROMPT-admin-signin.md
└── QUICK-START.md
```

## What Are Sub-Agents?

Sub-agents are specialized configurations that:
1. **Focus Claude's attention** on specific services or features
2. **Enforce architectural boundaries** (e.g., "no database logic in back-api")
3. **Provide domain-specific context** (e.g., user lifecycle, payments, notifications)
4. **Maintain consistency** across implementations
5. **Handle cross-service coordination** when features span multiple services

## When to Use Sub-Agents

### Use a Sub-Agent When:
- Implementing a **new feature** that touches multiple files
- Working on a **complex domain** (authentication, payments, subscriptions)
- Need to **maintain architectural boundaries** across services
- Feature spans **multiple services** (frontend + backend + database)
- Want to **ensure consistency** with existing patterns

### Don't Use Sub-Agent For:
- Simple bug fixes in a single file
- Documentation updates
- Configuration changes
- Reading/exploring code

## How to Use Sub-Agents

### Method 1: Using Task Tool (Recommended)

```
Can you implement the subscription management feature? Use the subscription-management sub-agent.
```

Claude will:
1. Load the agent configuration
2. Read the agent's context files
3. Implement following the agent's guidelines

### Method 2: Direct Prompt

```
Please read these files and implement the feature:
1. .claude/agents/subscription-management.yaml
2. .claude/agents/subscription-management-context.md
3. CLAUDE_CONTEXT.md

Then implement subscription tier management in back-api.
```

### Method 3: Using Ready-Made Prompts

Some agents include ready-to-use prompts:
```
Read and execute: .claude/agents/PROMPT-admin-signin.md
```

## Creating a New Sub-Agent

### Step 1: Determine Agent Scope

**Single-Service Feature**:
- Feature lives entirely in one service
- Example: "Export data" in back-workers
- Use template: `templates/single-service-feature.yaml`

**Cross-Service Feature**:
- Feature spans multiple services
- Example: "User registration" (front-public + back-api + back-auth + back-postgres)
- Use template: `templates/cross-service-feature.yaml`

### Step 2: Copy and Customize Template

```bash
# For single-service feature
cp .claude/agents/templates/single-service-feature.yaml \
   .claude/agents/your-feature-name.yaml

# For cross-service feature
cp .claude/agents/templates/cross-service-feature.yaml \
   .claude/agents/your-feature-name.yaml
```

### Step 3: Fill in Agent Details

Edit the YAML file:
```yaml
name: agent-your-feature-name
type: your-domain-specialist
description: "Brief description of what this agent does"
```

### Step 4: Create Context Document (Optional)

For complex features, create a companion context file:
```bash
touch .claude/agents/your-feature-name-context.md
```

Include:
- Service architecture for this feature
- Data flow diagrams
- Security requirements
- Integration points

### Step 5: Test the Agent

```
Please use the agent-your-feature-name agent to implement [feature description].
```

## Existing Agents

### user-registration.yaml
**Domain**: User lifecycle (registration, authentication, signin)
**Services**: front-public, front-admin, back-api, back-auth, back-postgres, back-cassandra
**Use For**:
- User registration flows
- Authentication implementation
- Login/signin features
- User profile management
- RBAC and role management

**Quick Start**: See `QUICK-START.md`

## Agent Configuration Reference

### YAML Structure

```yaml
name: agent-feature-name
  # Format: agent-{feature-name}
  # Example: agent-user-registration

type: domain-specialist-type
  # Examples: user-lifecycle-specialist, payment-specialist, notification-specialist
  # Describes the domain expertise

description: "Brief description"
  # One-line summary of what this agent handles
  # Example: "Handles all payment processing and subscription management"

tools:
  # List of tools the agent needs
  - read_files
  - write_files
  - search_code
  - execute_command

system_prompt: |
  # The main prompt that guides the agent
  # Include:
  # 1. Critical architecture understanding
  # 2. Service responsibilities
  # 3. Key principles
  # 4. Project structure relevant to this feature
  # 5. Security constraints
  # 6. Implementation guidelines
```

### System Prompt Best Practices

1. **Start with Critical Architecture**:
   ```
   CRITICAL ARCHITECTURE UNDERSTANDING:
   - Service A handles X
   - Service B handles Y
   - NEVER do Z in Service A
   ```

2. **Define Service Boundaries**:
   ```
   SERVICE RESPONSIBILITIES:
   - back-api: Business logic, orchestration
   - back-auth: Authentication ONLY
   - back-postgres: Data persistence
   ```

3. **Include Key Principles**:
   ```
   KEY PRINCIPLES:
   - No database logic in business services
   - No business logic in frontend
   - Always follow security best practices
   ```

4. **List Project Structure**:
   ```
   PROJECT STRUCTURE:
   - back-api/features/feature-name/
     - api.py (FastAPI routes)
     - domain.py (business logic)
     - infrastructure.py (external integrations)
     - feature.yaml (contract)
   ```

5. **Specify Security Requirements**:
   ```
   SECURITY CONSTRAINTS:
   - All sensitive data must be encrypted
   - Rate limiting: X requests per minute
   - Authentication required for all endpoints
   ```

## Cross-Service Features

Features that span multiple services require special coordination. See `CROSS_SERVICE_FEATURES.md` for:
- How to coordinate changes across services
- Shared resource management
- Cross-service dependencies
- Testing strategies
- Rollback procedures

## Feature Scope Examples

### Single-Service Features

**Example 1: Data Export (back-workers)**
- Lives entirely in back-workers service
- No frontend component
- No authentication logic
- Simple agent configuration

**Example 2: Admin Dashboard Widget (front-admin)**
- UI component only
- Calls existing APIs
- No backend changes needed

### Cross-Service Features

**Example 1: User Registration**
```
Services Involved:
✓ front-public    - RegistrationForm.tsx (UI)
✓ back-api        - features/user-registration/ (business logic)
✓ back-auth       - features/email-auth/ (authentication)
✓ back-postgres   - repositories/user_repository.py (data)
✓ back-cassandra  - repositories/user_ext_repository.py (extended data)
✓ shared          - contracts/user-registration/ (contracts)
```

**Example 2: Subscription Management**
```
Services Involved:
✓ front-public    - SubscriptionForm component
✓ front-admin     - SubscriptionManagement component
✓ back-api        - features/subscriptions/ (business logic)
✓ back-postgres   - repositories/subscription_repository.py (data)
✓ back-workers    - tasks/subscription_billing.py (background jobs)
✓ shared          - contracts/subscriptions/ (contracts)
```

## Agent Anti-Patterns

### ❌ Don't Create Agents For:
1. **Too Narrow Scope**: "agent-update-user-email" (just do it directly)
2. **Too Broad Scope**: "agent-entire-backend" (too unfocused)
3. **Service-Level**: "agent-back-api" (use service CONTEXT.md instead)
4. **One-Time Tasks**: "agent-fix-bug-123" (use direct approach)

### ✅ Do Create Agents For:
1. **Feature Domains**: "agent-user-lifecycle" (registration, auth, profile)
2. **Complex Workflows**: "agent-payment-processing" (multiple steps, services)
3. **Cross-Service Features**: "agent-notifications" (email, SMS, push, websocket)
4. **Reusable Patterns**: "agent-crud-generator" (create consistent CRUD features)

## Maintenance

### When to Update an Agent

- Feature contracts change (new endpoints, schemas)
- Security requirements change
- Service boundaries shift
- New services are added to feature scope
- Best practices evolve

### Versioning Agents

Agents don't have explicit versions, but track changes in git:
```bash
git log .claude/agents/user-registration.yaml
```

For major changes, consider:
1. Creating a new agent file
2. Archiving the old one
3. Updating documentation

## Troubleshooting

### Agent Doesn't Follow Guidelines

**Problem**: Claude ignores agent's system prompt.

**Solutions**:
1. Make guidelines more explicit ("NEVER do X" vs "Avoid X")
2. Use "CRITICAL:" prefix for important rules
3. Provide examples in the system prompt
4. Reference specific files and line numbers

### Agent Makes Cross-Boundary Changes

**Problem**: Agent modifies services outside its scope.

**Solutions**:
1. Explicitly list "FORBIDDEN CHANGES" in system prompt
2. Define exact file paths the agent can modify
3. Add verification step in prompts
4. Review agent scope definition

### Agent Forgets Context

**Problem**: Agent seems to forget architectural rules mid-implementation.

**Solutions**:
1. Add reminders throughout system prompt
2. Create companion context document
3. Reference CONTEXT.md files explicitly
4. Use Task tool to maintain agent state

### Feature Spans Unclear Services

**Problem**: Not sure which services a feature should touch.

**Solutions**:
1. Read `CROSS_SERVICE_FEATURES.md`
2. Check existing feature.yaml files for similar features
3. Review service CONTEXT.md files for boundaries
4. Ask in prompt: "Which services should this feature involve?"

## Best Practices

1. **Start Simple**: Begin with single-service agents, expand as needed
2. **Be Explicit**: Clear boundaries prevent cross-contamination
3. **Reference Existing Code**: Point to examples in system prompt
4. **Test Thoroughly**: Verify agent follows guidelines
5. **Document Patterns**: Update context files as patterns emerge
6. **Version Control**: Commit agent files with descriptive messages
7. **Regular Review**: Update agents as architecture evolves

## Examples and Templates

See:
- `templates/single-service-feature.yaml` - Template for single-service features
- `templates/cross-service-feature.yaml` - Template for cross-service features
- `user-registration.yaml` - Full example of cross-service agent
- `CROSS_SERVICE_FEATURES.md` - Detailed guide for cross-service coordination

## Need Help?

1. **Understanding context structure**: Read `/CLAUDE_CONTEXT.md`
2. **Service-specific guidelines**: Read `{service}/CONTEXT.md`
3. **Cross-service features**: Read `CROSS_SERVICE_FEATURES.md`
4. **Creating agents**: Use templates in `templates/`
5. **Using existing agents**: See agent-specific documentation (e.g., `QUICK-START.md`)

## Summary

Sub-agents help you:
- ✅ Maintain architectural boundaries
- ✅ Implement features consistently
- ✅ Coordinate cross-service changes
- ✅ Follow security best practices
- ✅ Avoid common pitfalls

Start with templates, customize for your feature, and test thoroughly!
