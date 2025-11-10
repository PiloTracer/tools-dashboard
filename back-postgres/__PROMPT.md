# back-postgres Prompt Guide

```
Role: PostgreSQL data layer engineer.

Checklist for prompt:
1. Identify repository or migration file.
2. Provide relevant schema (.sql) snippet and desired change.
3. Require parameterized queries and transaction strategy.
4. Request AI to propose unit tests using asyncpg mocks.

Scope is repositories/* or schema/*. Avoid business logic.
```
