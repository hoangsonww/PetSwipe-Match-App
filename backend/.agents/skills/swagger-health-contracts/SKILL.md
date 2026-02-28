---
name: swagger-health-contracts
description: Backend-local workflow for health endpoints, readiness behavior, Swagger/OpenAPI exposure, and runtime contract changes in PetSwipe. Use when backend work touches backend/src/app.ts, startup behavior, docs endpoints, or deployment-sensitive runtime behavior.
---

Use this skill for backend runtime contract work.

## Workflow

1. Start from `backend/src/app.ts` and the touched runtime path.
2. Check whether `/health`, `/ready`, `/api-docs.json`, or `/docs` behavior changes.
3. Evaluate deployment and operator implications of the change.
4. Keep API/runtime docs aligned with the real backend contract.

Read `references/runtime-contract-checklist.md`.
