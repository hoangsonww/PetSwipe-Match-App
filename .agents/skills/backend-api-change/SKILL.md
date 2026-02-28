---
name: backend-api-change
description: Safe PetSwipe backend workflow for Express route changes, TypeORM entity updates, service changes, migrations, auth adjustments, and API docs updates. Use when work changes backend behavior or data flow and needs route/controller/service/entity coherence.
---

Use this skill for backend/API changes in PetSwipe.

## Workflow

1. Identify the route, controller, service, entity, and migration impact.
2. Keep request and response behavior explicit.
3. Check whether Swagger/OpenAPI exposure needs to change.
4. Check whether health, readiness, or startup behavior is affected.
5. Validate with build/tests appropriate to the touched area.

## Repo-Specific Guidance

- `backend/src/app.ts` is the central runtime and docs surface.
- Health endpoints at `/health` and `/ready` matter for deployment.
- Swagger is exposed at `/api-docs.json` and `/docs`.
- Route/controller/service/entity drift is a common source of regressions.

Read `references/api-checklist.md` before finishing.
