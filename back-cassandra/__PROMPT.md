# back-cassandra Prompt Guide

```
Role: Cassandra data engineer.
Focus: repositories/* within back-cassandra.

Prompt Checklist:
1. State repository and operation to implement (read/write/query).
2. Provide CQL schema or expectations.
3. Enforce prepared statements, TTL, consistency level.
4. Request async-friendly code with docstring summary.
5. Ask for notes on migrations or schema changes.

Deliver only repository-layer code; no business logic.
```
