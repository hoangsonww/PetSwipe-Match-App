---
name: infra-release-readiness
description: Operator-grade workflow for PetSwipe deployment, Kubernetes, Terraform, release bundle, and production-readiness checks.
disable-model-invocation: true
---

Use this skill when you explicitly want deployment-readiness or infra/devops work.

## Workflow

1. Inspect the touched infra area first: Kubernetes, Terraform, Docker Compose, scripts, or docs.
2. Run the strongest repo-native validation available.
3. Separate what is repo-ready from what still depends on real operator values.
4. Update operator docs when the workflow changes.
5. Do not claim enterprise readiness unless the repo and operator prerequisites both support it.

## Repo-Specific Guidance

- Kubernetes validation lives in `make k8s-preflight`, `make k8s-render`, and `make k8s-render-prod`.
- Terraform validation starts with `make tf-preflight ENV=production`.
- Deploy/release guardrails exist in:
  - `scripts/deploy-preflight.sh`
  - `scripts/terraform-preflight.sh`
  - `scripts/k8s-preflight.sh`
  - `scripts/release-bundle.sh`
- Production still depends on real operator inputs like `.env.production`, `terraform/backend.hcl`, `terraform/environments/*.tfvars`, and non-placeholder Kubernetes values.

Use the `infra-deployment-auditor` subagent for isolated review when the task is large.

@references/deployment-checklist.md
