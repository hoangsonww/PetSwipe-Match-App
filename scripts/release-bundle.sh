#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
OUT_DIR="${OUT_DIR:-dist/deployment}"

fail() {
  echo "❌ $1"
  exit 1
}

info() {
  echo "• $1"
}

command -v docker >/dev/null 2>&1 || fail "docker is not installed"
command -v kubectl >/dev/null 2>&1 || fail "kubectl is not installed"

[[ -f "$ENV_FILE" ]] || fail "Missing ${ENV_FILE}. Copy .env.production.example to ${ENV_FILE} and fill in real values."

info "Running deployment preflight"
bash scripts/deploy-preflight.sh "$ENV_FILE"

info "Preparing output directory"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

info "Rendering Docker Compose production config"
docker compose \
  --env-file "$ENV_FILE" \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  config > "${OUT_DIR}/docker-compose.rendered.yaml"

info "Rendering Kubernetes production manifest"
kubectl kustomize k8s/overlays/production > "${OUT_DIR}/k8s-production.yaml"

if command -v shasum >/dev/null 2>&1; then
  info "Generating bundle checksums"
  shasum -a 256 "${OUT_DIR}/docker-compose.rendered.yaml" "${OUT_DIR}/k8s-production.yaml" > "${OUT_DIR}/SHA256SUMS"
fi

cat > "${OUT_DIR}/README.txt" <<EOF
PetSwipe deployment bundle

Files:
- docker-compose.rendered.yaml
- k8s-production.yaml
- SHA256SUMS (if shasum is available)

Source inputs:
- ${ENV_FILE}
- docker-compose.yml
- docker-compose.prod.yml
- k8s/overlays/production

This bundle was generated after the repo preflight checks completed successfully.
EOF

info "Release bundle created at ${OUT_DIR}"
