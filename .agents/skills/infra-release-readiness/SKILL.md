---
name: infra-release-readiness
description: PetSwipe infrastructure and deployment workflow for Kubernetes, Terraform, production Docker Compose, release bundle, and preflight validation. Use when the task is explicitly about deployability, production readiness, operator workflow, or infra/devops changes.
---

Use this skill for deployment-readiness and infra/devops work in PetSwipe.

## Workflow

1. Inspect the touched infra area first: Kubernetes, Terraform, Docker Compose, scripts, or docs.
2. Run the strongest repo-native validation available.
3. Separate what is repo-ready from what still depends on real operator values.
4. Update operator docs when the workflow changes.
5. Do not claim enterprise readiness unless the repo and operator prerequisites both support it.

## Repo-Specific Guidance

- Kubernetes validation lives in `make k8s-preflight`, `make k8s-render`, and `make k8s-render-prod`.
- Terraform validation starts with `make tf-preflight ENV=production`.
- Deploy and release guardrails exist in:
  - `scripts/deploy-preflight.sh`
  - `scripts/terraform-preflight.sh`
  - `scripts/k8s-preflight.sh`
  - `scripts/release-bundle.sh`
- Production still depends on real operator inputs like `.env.production`, `terraform/backend.hcl`, `terraform/environments/*.tfvars`, and non-placeholder Kubernetes values.

Read `references/deployment-checklist.md` before concluding.
