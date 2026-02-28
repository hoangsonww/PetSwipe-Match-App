---
name: planner-and-insights-pages
description: PetSwipe workflow for adoption-planner and insights page work, including comparison cards, gauges, charts, metrics, and recommendation panels. Use when changes focus on adoption-planner.tsx, insights.tsx, or the relationship between liked pets, readiness, and swipe analytics.
---

Use this skill for the planner and insights product surfaces.

## Workflow

1. Start from the touched page and identify the data it derives from profile, swipes, likes, or pet records.
2. Preserve decision-support value, not just layout.
3. Check card density, pagination, gauge readability, chart overflow, and mobile responsiveness.
4. Keep recommendation text useful and specific rather than decorative.
5. If the work changes how these pages are described, update docs and screenshots references as needed.

## Repo-Specific Guidance

- `frontend/pages/adoption-planner.tsx` is a decision-support page, not a browse page.
- `frontend/pages/insights.tsx` is a swipe analytics dashboard with charts and recommendations.
- Shared chart behavior still routes through `frontend/components/ui/chart.tsx`.

Read `references/planner-insights-checklist.md`.
