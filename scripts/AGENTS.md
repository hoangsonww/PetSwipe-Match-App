## Scripts Expectations

These instructions apply inside `scripts/`.

## Working Agreements

- Treat deployment, preflight, migration, and release scripts as operator-facing assets.
- Keep shell changes conservative and explicit.
- If a script changes operator workflow, update the relevant docs in the same task.
- Distinguish repo-level readiness checks from environment-specific prerequisites.
