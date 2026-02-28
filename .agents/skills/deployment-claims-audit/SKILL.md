---
name: deployment-claims-audit
description: PetSwipe workflow for checking whether deployment, production-readiness, or enterprise-grade claims are actually supported by repo evidence. Use when editing deployment docs, infra summaries, or any task that makes strong statements about readiness.
---

Use this skill when a task involves strong readiness or deployability claims.

## Workflow

1. Gather repo evidence first: manifests, scripts, preflight checks, docs, and operator templates.
2. Separate repo-side capability from environment-side prerequisites.
3. Remove or qualify claims that the repo does not yet support end to end.
4. Prefer exact blockers over vague caution language.
5. Update all affected docs consistently.

## PetSwipe Guidance

- This repo has strong deployment artifacts, but still depends on real operator inputs for full deployment.
- Distinguish "renderable and preflighted" from "fully deployable in a real environment."
- Strong language like "enterprise-grade" should only appear with matching evidence.

Read `references/readiness-rubric.md`.
