---
name: feature-delivery
description: End-to-end PetSwipe delivery workflow for implementing or extending features across frontend, backend, docs, and validation. Use when a task spans user-visible behavior, API behavior, navigation, or multiple parts of the repository and needs a coherent change rather than a single isolated edit.
---

Use this skill when implementing or expanding a feature in PetSwipe.

## Workflow

1. Inspect the affected area before proposing structure.
2. Decide whether the task is frontend-only, backend-only, infra-only, docs-only, or cross-cutting.
3. Keep the change coherent across code, navigation, API behavior, validation, and docs.
4. Validate with the smallest reliable command set for the touched area.
5. Update docs when the task changes user-visible behavior, APIs, or deployment posture.

## Delegation

If the task is broad, spawn the matching specialist agent:

- `frontend_ux`
- `backend_api`
- `infra_auditor`
- `docs_curator`
- `reviewer`

## PetSwipe Rules

- Frontend work should preserve the Next.js Pages Router structure.
- Backend work should keep routes, controllers, services, entities, and docs aligned.
- Infra work should be validated with render and preflight commands, not claimed complete on inspection alone.
- Doc updates should be made in the same task when behavior changes.

Read `references/repo-map.md` for structure and `references/validation.md` for command guidance.
