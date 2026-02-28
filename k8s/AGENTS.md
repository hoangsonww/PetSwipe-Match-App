## Kubernetes Expectations

These instructions apply inside `k8s/`.

## Structure

- `k8s/base/` contains the shared manifest set.
- `k8s/overlays/production/` contains the production overlay.

## Working Agreements

- Keep manifests renderable at all times.
- Treat placeholder hosts, image names, and secrets as deploy blockers until replaced with real values.
- Preserve security and reliability controls unless there is a clear reason to change them.
- Update Kubernetes and deployment docs when operator workflow changes.

## Validation

- `make k8s-preflight`
- `make k8s-render`
- `make k8s-render-prod`
