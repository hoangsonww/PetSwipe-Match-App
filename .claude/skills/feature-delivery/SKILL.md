---
name: feature-delivery
description: End-to-end workflow for shipping PetSwipe features cleanly across frontend, backend, docs, and validation.
---

Use this skill when the user wants a feature implemented, expanded, or refactored across one or more parts of the app.

## Workflow

1. Inspect the affected area before proposing structure.
2. Decide whether the task is frontend-only, backend-only, infra-only, docs-only, or cross-cutting.
3. Keep the change coherent across code, navigation, data flow, and docs.
4. Validate with the smallest reliable command set for the touched area.
5. Update docs when the task changes user-visible behavior, APIs, or deployment posture.

## Delegation

If the task is broad, delegate focused analysis to the matching subagent:

- `frontend-ux-specialist`
- `backend-api-specialist`
- `infra-deployment-auditor`
- `docs-curator`
- `petswipe-reviewer`

## PetSwipe Rules

- Frontend work should preserve the existing Pages Router structure.
- Backend work should keep routes, controllers, services, entities, and docs aligned.
- Infra work should be validated with render and preflight commands, not claimed complete on inspection alone.
- Doc updates should be made in the same task when behavior changes.

@references/repo-map.md
@references/validation.md
