#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "${ROOT_DIR}/scripts/lib/preflight-common.sh"

ALLOW_STATIC_AWS_KEYS="${ALLOW_STATIC_AWS_KEYS:-false}"

require_command kubectl "kubectl is not installed"

info "Rendering Kubernetes base manifests"
BASE_RENDER="$(mktemp)"
PROD_RENDER="$(mktemp)"
trap 'rm -f "$BASE_RENDER" "$PROD_RENDER"' EXIT
kubectl kustomize k8s/base > "$BASE_RENDER"

info "Rendering Kubernetes production overlay"
kubectl kustomize k8s/overlays/production > "$PROD_RENDER"

info "Checking rendered manifests for placeholder values"
PLACEHOLDER_PATTERN='your-org|example\.com|replace-me|replace-with-a-long-random-secret|postgres\.internal\.example\.com'
if grep -Eqi "$PLACEHOLDER_PATTERN" "$BASE_RENDER" "$PROD_RENDER"; then
  fail "Rendered Kubernetes manifests still contain placeholder values. Update k8s/base image names, ingress hosts, configmaps, and secrets before deployment."
fi

info "Checking for mutable image tags in production"
if grep -Eq 'image: .*:latest' "$PROD_RENDER"; then
  fail "Production overlay still renders mutable latest image tags. Pin stable or immutable release tags before deployment."
fi

info "Checking deployment-level runtime hardening"
deployment_count="$(grep -c '^kind: Deployment$' "$PROD_RENDER" || true)"
(( deployment_count > 0 )) || fail "No Deployment resources found in the production render"

required_markers=(
  "readinessProbe:"
  "livenessProbe:"
  "startupProbe:"
  "resources:"
  "allowPrivilegeEscalation: false"
  "readOnlyRootFilesystem: true"
  "runAsNonRoot: true"
  "imagePullPolicy: Always"
)

for marker in "${required_markers[@]}"; do
  marker_count="$(grep -c "$marker" "$PROD_RENDER" || true)"
  if (( marker_count < deployment_count )); then
    fail "Expected at least ${deployment_count} '${marker}' entries in the production render, found ${marker_count}"
  fi
done

info "Checking for insecure Kubernetes fields"
if grep -Eq 'hostNetwork: true|hostPID: true|hostIPC: true|privileged: true' "$PROD_RENDER"; then
  fail "Production manifests contain insecure host access or privileged container settings"
fi

info "Checking service exposure types"
if grep -Eq 'type: (NodePort|LoadBalancer)' "$PROD_RENDER"; then
  fail "Production manifests expose a Service as NodePort/LoadBalancer. Use Ingress with ClusterIP services."
fi

info "Checking required baseline policy resources"
grep -Eq 'kind: NetworkPolicy' "$PROD_RENDER" || fail "No NetworkPolicy resources were rendered in production"
grep -Eq 'name: default-deny-all' "$PROD_RENDER" || fail "default-deny-all NetworkPolicy is missing from production render"
grep -Eq 'kind: ResourceQuota' "$PROD_RENDER" || fail "ResourceQuota is missing from production render"
grep -Eq 'kind: LimitRange' "$PROD_RENDER" || fail "LimitRange is missing from production render"
grep -Eq 'pod-security\.kubernetes\.io/enforce: restricted' "$PROD_RENDER" || fail "Namespace is not enforcing Pod Security restricted mode"

info "Checking ingress TLS"
grep -Eq '^kind: Ingress$' "$PROD_RENDER" || fail "Ingress resource is missing from production render"
grep -Eq '^[[:space:]]+tls:' "$PROD_RENDER" || fail "Ingress TLS configuration is missing from production render"

info "Checking for plaintext AWS access keys in Kubernetes secrets"
if grep -Eq 'AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY' "$PROD_RENDER"; then
  if is_truthy "$ALLOW_STATIC_AWS_KEYS"; then
    warn "Static AWS credential keys are present in rendered manifests because ALLOW_STATIC_AWS_KEYS=true"
  else
    fail "Rendered production manifests still include AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY. Prefer workload identity such as IRSA."
  fi
fi

success "Kubernetes preflight checks completed"
