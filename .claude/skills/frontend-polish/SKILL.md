---
name: frontend-polish
description: Workflow for high-quality PetSwipe frontend work across pages, layout, navigation, charts, responsive behavior, and visual refinement.
---

Use this skill for page redesigns, responsive fixes, chart/UI issues, navbar changes, and other frontend polish work.

## Workflow

1. Start from the touched page and identify shared components it depends on.
2. Check desktop and mobile behavior before and after changes.
3. Prefer strengthening the current design system over introducing unrelated patterns.
4. Watch for chart overflow, tooltip readability, clipped visuals, and navbar breakage.
5. Validate with targeted `npx eslint` inside `frontend/`.

## Repo-Specific Guidance

- Pages live under `frontend/pages/`.
- Shared layout and navigation live under `frontend/components/`.
- Charts should use the shared chart primitives rather than one-off tooltip logic.
- This repo values polished, intentional interfaces over generic defaults.

If the task is large, use the `frontend-ux-specialist` subagent for isolated analysis.

@references/ui-checklist.md
