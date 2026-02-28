---
name: k8s-hardening-and-render
description: Kubernetes-local workflow for manifest hardening, renderability, overlays, quotas, network policies, and rollout safety in PetSwipe. Use when working inside k8s and the task is specifically about manifest correctness or production posture.
---

Use this skill for Kubernetes work inside `k8s/`.

## Workflow

1. Start from the touched manifest and its place in base or production overlay.
2. Check renderability first.
3. Evaluate security, rollout safety, resource policy, and operator clarity.
4. Keep README and deployment docs aligned when the operator flow changes.

Read `references/k8s-checklist.md`.
