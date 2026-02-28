---
name: frontend-polish
description: PetSwipe frontend workflow for page redesigns, responsive fixes, chart issues, navbar changes, and UI polish in the Next.js frontend. Use when the task is primarily visual, layout-focused, or interaction-focused inside frontend pages and shared UI components.
---

Use this skill for frontend polish work in PetSwipe.

## Workflow

1. Start from the touched page and identify the shared components it depends on.
2. Check desktop and mobile behavior before and after the change.
3. Prefer strengthening the current design system over introducing unrelated patterns.
4. Watch for chart overflow, tooltip readability, clipped visuals, and navbar breakage.
5. Validate with targeted `npx eslint` inside `frontend/`.

## Repo-Specific Guidance

- Pages live under `frontend/pages/`.
- Shared layout and navigation live under `frontend/components/`.
- Charts should use the shared chart primitives rather than one-off tooltip logic.
- This repo values polished, intentional interfaces over generic defaults.

Read `references/ui-checklist.md` before finishing.
