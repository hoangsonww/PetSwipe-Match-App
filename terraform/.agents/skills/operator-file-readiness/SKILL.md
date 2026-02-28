---
name: operator-file-readiness
description: Terraform-local workflow for backend.hcl, tfvars examples, operator bootstrap, and plan/apply readiness in PetSwipe. Use when working inside terraform and the task is about making the Terraform workflow clearer, safer, or more deployable.
---

Use this skill for operator-readiness work inside `terraform/`.

## Workflow

1. Start from the touched Terraform file or operator template.
2. Check whether real operator files are still required and clearly documented.
3. Keep init, preflight, and plan/apply guidance aligned.
4. Prefer explicit guardrails over implicit assumptions.

Read `references/operator-readiness-checklist.md`.
