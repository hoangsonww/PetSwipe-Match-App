---
name: docs-sync
description: PetSwipe documentation sync workflow for README, ARCHITECTURE, deployment docs, Kubernetes docs, and Terraform docs. Use when code or infra changes require documentation updates or when docs appear stale relative to the repository.
---

Use this skill when documentation needs to stay aligned with the repository.

## Workflow

1. Identify the source of truth in the code or infra first.
2. Update every doc that materially describes the changed behavior.
3. Prefer exact commands, exact paths, and exact limitations.
4. Remove stale claims instead of layering new text on top of them.

## High-Value Targets

- `README.md`
- `ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/DEVOPS_GUIDE.md`
- `k8s/README.md`
- `terraform/README.md`

Read `references/doc-matrix.md` to decide which docs need changes.
