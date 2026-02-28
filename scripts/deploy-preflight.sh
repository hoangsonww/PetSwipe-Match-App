#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${1:-.env.production}"
TF_ENV="${TF_ENV:-production}"

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

info "Checking required tools"
command -v docker >/dev/null 2>&1 || fail "docker is not installed"
command -v kubectl >/dev/null 2>&1 || warn "kubectl not found; Kubernetes render checks will be skipped"
command -v terraform >/dev/null 2>&1 || warn "terraform not found; Terraform validation will be skipped"

info "Checking production env file"
[[ -f "$ENV_FILE" ]] || fail "Missing ${ENV_FILE}. Copy .env.production.example and fill in real values."

required_vars=(
  BACKEND_IMAGE
  BACKEND_TAG
  FRONTEND_IMAGE
  FRONTEND_TAG
  NEXT_PUBLIC_API_URL
  JWT_SECRET
  DB_HOST
  DB_PORT
  DB_USER
  DB_PASS
  DB_NAME
  POSTGRES_USER
  POSTGRES_PASSWORD
  POSTGRES_DB
  GRAFANA_PASSWORD
)

for var_name in "${required_vars[@]}"; do
  if ! grep -Eq "^${var_name}=" "$ENV_FILE"; then
    fail "${ENV_FILE} is missing ${var_name}"
  fi
done

if grep -Eq 'replace-me|your-org|example\.com|long-random-secret' "$ENV_FILE"; then
  fail "${ENV_FILE} still contains placeholder values"
fi

info "Rendering Docker Compose production config"
docker compose --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.prod.yml config >/dev/null

if command -v kubectl >/dev/null 2>&1; then
  info "Running Kubernetes manifest preflight"
  bash scripts/k8s-preflight.sh
fi

if command -v terraform >/dev/null 2>&1; then
  if [[ -f "terraform/backend.hcl" && -f "terraform/environments/${TF_ENV}.tfvars" ]]; then
    info "Running Terraform operator preflight"
    bash scripts/terraform-preflight.sh "${TF_ENV}"
  else
    warn "Terraform operator files are not present. Copy terraform/backend.hcl.example and terraform/environments/${TF_ENV}.tfvars.example if you plan to deploy the AWS Terraform stack."
  fi
fi

info "Preflight checks completed"
