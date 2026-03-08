# Kubernetes Deployment

This repository now includes a production-oriented Kubernetes stack under [`k8s/base`](./base).

It is designed for:

- a public `frontend` deployment on `petswipe.example.com`
- a public `backend` deployment on `api.petswipe.example.com`
- managed external dependencies for PostgreSQL, object storage, and secrets rotation
- horizontally scalable stateless workloads with health probes, PodDisruptionBudgets, and HPAs
- non-root runtime hardening with read-only root filesystems and dedicated `/tmp` mounts

## What is included

- `Deployment` + `Service` for frontend and backend
- `Ingress` with TLS placeholders and `nginx` ingress annotations
- `ConfigMap` and `Secret` resources for runtime configuration
- `LimitRange` and `ResourceQuota` resources for namespace guardrails
- `HorizontalPodAutoscaler` resources for both workloads
- `PodDisruptionBudget` resources for safer voluntary disruptions
- `ServiceAccount` resources with API token automount disabled
- ingress and egress `NetworkPolicy` resources that restrict pods to ingress-nginx plus required outbound ports
- a namespace-wide default-deny `NetworkPolicy`
- a dedicated `PriorityClass` for user-facing workloads
- `kustomization.yaml` to support image overrides and environment composition
- `overlays/production` for higher baseline capacity and stable image tags

## Prerequisites

- Kubernetes 1.27+
- NGINX Ingress Controller
- cert-manager
- metrics-server
- container images pushed to a reachable registry
- managed PostgreSQL or another production-ready Postgres endpoint

## Update the placeholders

Before applying:

1. Replace the image names and tags in [`k8s/base/kustomization.yaml`](./base/kustomization.yaml).
2. Replace the hostnames and TLS secret names in [`k8s/base/ingress.yaml`](./base/ingress.yaml).
3. Replace placeholder values in [`k8s/base/backend-configmap.yaml`](./base/backend-configmap.yaml) and [`k8s/base/backend-secret.yaml`](./base/backend-secret.yaml).
4. Set `NEXT_PUBLIC_API_URL` in [`k8s/base/frontend-configmap.yaml`](./base/frontend-configmap.yaml) to your public backend URL.

## Apply

```bash
kubectl apply -k k8s/base
```

Production overlay:

```bash
kubectl apply -k k8s/overlays/production
```

Preflight before apply:

```bash
make k8s-preflight
```

By default, `k8s-preflight` also fails if rendered manifests still include static AWS credential keys (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`). This is intentional to push workload identity patterns such as IRSA. If you have a temporary exception:

```bash
ALLOW_STATIC_AWS_KEYS=true make k8s-preflight
```

## Production notes

- The backend exposes `/health` and `/ready` for Kubernetes probes.
- The frontend uses TCP socket probes so the deployment stays infra-only and does not depend on an app-specific health route.
- The workloads use dedicated service accounts, disable service account token automount, and mount `/tmp` explicitly for read-only root filesystem compatibility.
- The namespace is labeled for Kubernetes Pod Security Admission in `restricted` mode.
- Namespace-level `LimitRange` and `ResourceQuota` resources are included so accidental unbounded workloads do not quietly exhaust the cluster.
- A default-deny network baseline is included; the explicit ingress and egress policies are what reopen required traffic.
- Ingress rate limiting is enabled at the NGINX layer to reduce trivial abuse and burst traffic.
- The container images run as a non-root user.
- The production overlay raises baseline replicas, tightens PDB availability, and switches deployments to `imagePullPolicy: Always` for mutable promotion tags.
- The stack assumes database backups, secret rotation, WAF, CDN, and registry scanning are handled by your cloud platform around the cluster.
- If your ingress controller is not in the `ingress-nginx` namespace, update the ingress `NetworkPolicy` selectors before enforcing them.
- If you use Redis, RabbitMQ, or extra third-party APIs from inside the cluster, extend the egress policies before enforcing them.
- If you standardize on EKS, map the placeholder registry hosts to ECR and use IRSA instead of long-lived AWS keys inside `Secret` resources.
- The repo includes a Kubernetes preflight script that fails if rendered manifests still contain placeholders, mutable `latest` tags, missing probe/resource/security markers, privileged host access settings, missing TLS ingress config, or missing baseline policy objects (`default-deny` NetworkPolicy, `ResourceQuota`, `LimitRange`).
