---
name: backend-api-change
description: Workflow for safe PetSwipe backend/API changes across Express routes, controllers, services, entities, migrations, and API docs.
---

Use this skill for backend endpoint changes, auth changes, entity updates, migrations, and service-layer work.

## Workflow

1. Identify the route, controller, service, entity, and migration impact.
2. Keep request/response behavior explicit.
3. Check whether Swagger/OpenAPI exposure needs to change.
4. Check whether health/readiness or startup behavior is affected.
5. Validate with build/tests appropriate to the touched area.

## Repo-Specific Guidance

- `backend/src/app.ts` is the central runtime and docs surface.
- Health endpoints at `/health` and `/ready` matter for deployment.
- Swagger is exposed at `/api-docs.json` and `/docs`.
- Route/controller/service/entity drift is a common source of regressions.

If the task is deep or risky, use the `backend-api-specialist` subagent first.

@references/api-checklist.md
