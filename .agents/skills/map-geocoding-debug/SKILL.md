---
name: map-geocoding-debug
description: PetSwipe map and geocoding workflow for diagnosing map page issues, geocode request volume, cache behavior, API proxy behavior, CORS issues, and location-related UI regressions. Use when the task mentions the map page, geocoding, location results, or geocode performance.
---

Use this skill for map and geocoding issues.

## Workflow

1. Start from `frontend/pages/map.tsx`.
2. Trace how location strings are generated, normalized, cached, and rendered.
3. Check whether the frontend is calling the local proxy or an external geocoder directly.
4. Check request amplification, duplicate queries, fallback queries, and cache-miss behavior.
5. Validate any fixes without introducing responsive or chart-like overflow regressions on the page.

## Repo-Specific Guidance

- The map page and the frontend geocode API route are the primary touchpoints.
- Request explosion and low-signal fallback queries are a known class of issue in this repo.
- CORS or upstream slowness should be treated separately from local query-generation bugs.

If the issue is large, spawn `map_debugger` first.

Read `references/map-debug-checklist.md`.
