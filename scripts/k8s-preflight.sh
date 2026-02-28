#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "❌ $1"
  exit 1
}

warn() {
  echo "⚠️  $1"
}

info() {
  echo "• $1"
}

command -v kubectl >/dev/null 2>&1 || fail "kubectl is not installed"

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

info "Checking for plaintext AWS access keys in Kubernetes secrets"
if grep -Eq 'AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY' "$PROD_RENDER"; then
  warn "Production manifests still include long-lived AWS credential keys in Secret resources. Prefer workload identity such as IRSA when deploying on EKS."
fi

info "Kubernetes preflight checks completed"
