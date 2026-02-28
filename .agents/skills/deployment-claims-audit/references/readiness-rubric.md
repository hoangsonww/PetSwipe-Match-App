# Readiness Rubric

## Repo-side evidence

- Renderable Kubernetes manifests
- Terraform bootstrap and env examples
- Preflight scripts
- Release bundle generation
- Operator docs aligned with scripts and manifests

## Environment-side prerequisites

- Real secrets and credentials
- Real DNS and TLS
- Real cloud resources
- Real operator files
- Installed tooling on the runner or operator machine

## Reporting language

- "Repo-side support exists" when artifacts and docs are present
- "Deployable after operator values are supplied" when placeholders remain
- Avoid "fully production ready" unless both repo-side and environment-side requirements are satisfied
