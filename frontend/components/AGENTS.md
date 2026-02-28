## Frontend Components Expectations

These instructions apply inside `frontend/components/`.

## Working Agreements

- Shared component changes can affect many pages; audit call sites before making broad behavior changes.
- Be especially careful with:
  - `Navbar.tsx`
  - `Layout.tsx`
  - `ui/chart.tsx`
  - shared `ui/` primitives
- If a shared component changes mobile layout, dark mode behavior, chart readability, or navigation structure, say so explicitly in the final summary.
