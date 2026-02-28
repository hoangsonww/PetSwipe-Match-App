---
name: testing-and-validation
description: PetSwipe validation workflow for choosing the smallest reliable checks for frontend, backend, infra, docs, and mixed changes. Use when a task needs a concrete validation plan or when the repo's pre-existing lint or type issues make broad validation noisy.
---

Use this skill when validation strategy matters as much as the code change.

## Workflow

1. Identify the touched area and its real blast radius.
2. Choose the smallest reliable checks that validate that area.
3. Prefer targeted checks before broad repo-wide checks.
4. Report clearly what each command validates.
5. Separate new failures from pre-existing repo debt.

## PetSwipe Guidance

- Frontend: prefer targeted `npx eslint` over broad linting when possible.
- Backend: prefer `npm run build` plus targeted tests.
- Infra: prefer render and preflight commands.
- Docs: validate by re-reading commands, paths, and claims against the repo.

If needed, spawn `test_guard` to recommend the validation set before editing.

Read `references/validation-playbook.md`.
