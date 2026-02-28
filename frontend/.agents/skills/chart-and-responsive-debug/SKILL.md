---
name: chart-and-responsive-debug
description: Frontend-local workflow for PetSwipe chart overflow, tooltip, dark mode text, clipping, and responsive layout issues inside frontend pages and shared chart components. Use when working in frontend and the issue is specifically about charts or mobile layout behavior.
---

Use this skill for chart and responsive-debug work inside `frontend/`.

## Workflow

1. Start from the page or component that is visibly wrong.
2. Trace whether the problem comes from page layout, chart container sizing, tooltip styling, or label rendering.
3. Check mobile and dark mode behavior before finalizing.
4. Prefer changes that improve the shared chart system rather than patching a single chart unnecessarily.

Read `references/chart-debug-checklist.md`.
