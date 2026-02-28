## Frontend Expectations

These instructions apply inside `frontend/`.

## Architecture

- This app uses the Next.js Pages Router.
- Page entrypoints live in `frontend/pages/`.
- Shared layout and navigation live in `frontend/components/Layout.tsx` and `frontend/components/Navbar.tsx`.
- Shared chart behavior lives in `frontend/components/ui/chart.tsx`.

## Working Agreements

- Preserve existing shared component patterns unless the task is a deliberate redesign.
- Check desktop and mobile behavior for any layout, chart, navbar, or page structure change.
- Reuse shared chart primitives and shared navigation instead of introducing one-off implementations.
- Keep tooltip and chart text legible in both light and dark mode.
- Avoid overflow, clipping, and wrapping regressions on smaller screens.

## Validation

- Preferred: `cd frontend && npx eslint <touched files>`
- Build when needed: `cd frontend && npm run build`

## Documentation

- If user-facing pages, navigation, or workflows change, make sure top-level docs still describe the product accurately.
