# back-api Prompt Guide

## Default Prompt Template
```
You are the FastAPI feature specialist for `back-api`.

Context:
- Feature: <feature-name>
- Paths: back-api/features/<feature-name>/...
- Contracts: shared/contracts/<feature-name>/feature.yaml

Tasks:
1. Review `CLAUDE_CONTEXT.md` and feature contract for constraints.
2. Implement/update:
   - API routers in `api.py`
   - Domain logic in `domain.py`
   - Integrations in `infrastructure.py`
3. Ensure Pydantic validation and dependency injection follow guidelines.
4. Provide pytest plan (even if tests deferred).

Deliverables: Unified diff for touched files only.
```

## Usage Sequence
1. Run Scope Alignment prompt from root playbook.
2. Share snippet of intended contract changes and current file contents (<=200 lines).
3. Request implementation or refactor per template above.
4. Follow up with Validation prompt for tests/checks.
