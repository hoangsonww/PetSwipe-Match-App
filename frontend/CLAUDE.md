# Frontend Memory

## Scope

These instructions apply to work inside `frontend/`.

## Frontend Architecture

- The app uses the Next.js Pages Router with page entrypoints in `frontend/pages/`.
- Global providers live in `frontend/pages/_app.tsx`.
- Shared layout and navigation live in `frontend/components/Layout.tsx` and `frontend/components/Navbar.tsx`.
- Shared charts go through `frontend/components/ui/chart.tsx`.
- The design system is a mix of Tailwind utilities and shadcn-style UI primitives in `frontend/components/ui/`.

## How To Work Here

- Preserve existing navigation patterns and shared component usage unless the task is a deliberate redesign.
- Reuse the shared chart wrapper instead of custom one-off tooltip or legend behavior.
- Prefer changes that keep mobile behavior strong; chart overflow, navbar overflow, and clipped visual elements have already been recurring issues in this repo.
- When editing pages, check whether the navbar, charts, cards, and spacing still hold up on narrow screens.
- If you touch user-facing copy or page structure, consider whether `README.md` screenshots/feature descriptions need to change.

## Validation

- Prefer targeted linting:
  - `cd frontend && npx eslint pages/<file>.tsx`
  - `cd frontend && npx eslint components/<file>.tsx`
- Do not rely solely on `npm run lint` for incremental checks in this repo.

## Frontend Expectations

- Keep tooltips legible in both light and dark mode.
- Avoid transparent chart tooltips.
- Avoid chart and grid overflow on mobile.
- Keep page layouts intentional and polished rather than generic.
- When adding navigation items, verify both desktop and mobile navbar behavior.
