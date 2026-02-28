---
name: navigation-and-page-structure
description: PetSwipe navigation workflow for navbar changes, icon-only links, mobile menu behavior, route placement, and page discoverability. Use when work changes the navbar, mobile navigation, page ordering, or the relationship between key user-facing pages.
---

Use this skill for navigation and page-structure work.

## Workflow

1. Identify the affected route, page, and navigation surface.
2. Check both desktop and mobile navigation behavior.
3. Preserve consistent ordering and discoverability between related pages.
4. If the change is icon-only or compact, verify tooltips and mobile equivalents still make sense.
5. Update docs if the page lineup or major product surface changes.

## Repo-Specific Guidance

- `frontend/components/Navbar.tsx` is the primary shared navigation surface.
- The app has multiple non-trivial page surfaces now, including `map`, `insights`, `adoption-planner`, `liked-swipes`, and `my-pets`.
- Mobile navbar quality matters because overflow has already been a recurring problem in this repo.

Read `references/navigation-checklist.md`.
