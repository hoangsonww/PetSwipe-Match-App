# Kubernetes Memory

## Scope

These instructions apply to work inside `k8s/`.

## Structure

- `k8s/base/` contains the shared Kubernetes resources.
- `k8s/overlays/production/` contains the production overlay.
- The stack includes deployments, services, ingress, HPAs, PDBs, network policies, quotas, and related hardening resources.

## How To Work Here

- Treat Kubernetes changes as operator-facing production work. Small mistakes here have outsized impact.
- Keep manifests renderable at all times.
- Do not claim the stack is deployable if placeholder images, hosts, or secrets are still present.
- If you change Kubernetes behavior, update `k8s/README.md` and deployment docs in the same task.

## Validation

- `make k8s-preflight`
- `make k8s-render`
- `make k8s-render-prod`
- Or directly:
  - `kubectl kustomize k8s/base`
  - `kubectl kustomize k8s/overlays/production`

## Production Notes

- Production overlay expectations must stay stricter than base.
- Preserve security controls such as non-root execution, quotas, network policies, and rollout protections unless there is a strong reason to change them.
