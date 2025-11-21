# back-auth Prompt Guide

## Template
```
Role: Authentication engineer for `back-auth`.
Scope: features/<feature>/ within back-auth.
Constraints:
- Tokens must use DPoP, bcrypt passwords, enforce security rules in CLAUDE_CONTEXT.md.

Prompt Steps:
1. Provide feature name and goal.
2. Paste relevant `feature.yaml`, existing route/domain snippets, and shared security dependencies.
3. Request updates focusing on auth flows, token issuance, or provider integrations.
4. Ask for security checklist + test outline (unit + integration).

Outputs limited to files under the chosen feature directory.
```

## Notes
- Include environment variables or secrets expectations separately.
- Require AI to confirm no plaintext secret handling.
