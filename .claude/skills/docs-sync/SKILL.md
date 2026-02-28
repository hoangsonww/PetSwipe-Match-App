---
name: docs-sync
description: Workflow for keeping PetSwipe documentation aligned with the current codebase, deployment stack, and product surfaces.
---

Use this skill when code or infra changes need matching documentation updates, or when docs look stale.

## Workflow

1. Identify the source of truth in the code or infra first.
2. Update every doc that materially describes the changed behavior.
3. Prefer exact commands, exact paths, and exact dates/limitations where relevant.
4. Remove stale claims instead of layering new text on top of them.

## High-Value Targets

- `README.md`
- `ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/DEVOPS_GUIDE.md`
- `k8s/README.md`
- `terraform/README.md`

Use the `docs-curator` subagent when the scope is large or spans multiple docs.

@references/doc-matrix.md
