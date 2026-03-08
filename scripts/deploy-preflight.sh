#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "${ROOT_DIR}/scripts/lib/preflight-common.sh"

ENV_FILE="${1:-.env.production}"
TF_ENV="${TF_ENV:-production}"
ALLOW_STATIC_AWS_KEYS="${ALLOW_STATIC_AWS_KEYS:-false}"

info "Checking required tools"
require_command docker "docker is not installed"
command -v kubectl >/dev/null 2>&1 || warn "kubectl not found; Kubernetes render checks will be skipped"
command -v terraform >/dev/null 2>&1 || warn "terraform not found; Terraform validation will be skipped"

info "Checking production env file"
require_file "$ENV_FILE" "Missing ${ENV_FILE}. Copy .env.production.example and fill in real values."

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
  NODE_ENV
  AWS_REGION
)

for var_name in "${required_vars[@]}"; do
  require_non_empty_var "$ENV_FILE" "$var_name"
done

optional_vars=(
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
)

for var_name in "${optional_vars[@]}"; do
  require_var_assignment "$ENV_FILE" "$var_name"
done

if grep -Eqi 'replace-me|your-org|example\.com|long-random-secret|REPLACE_ME' "$ENV_FILE"; then
  fail "${ENV_FILE} still contains placeholder values"
fi

node_env="$(get_env_value "$ENV_FILE" NODE_ENV)"
[[ "$node_env" == "production" ]] || fail "NODE_ENV must be set to production in ${ENV_FILE}"

db_port="$(get_env_value "$ENV_FILE" DB_PORT)"
[[ "$db_port" =~ ^[0-9]+$ ]] || fail "DB_PORT must be a numeric value"

for tag_var in BACKEND_TAG FRONTEND_TAG; do
  tag_value="$(get_env_value "$ENV_FILE" "$tag_var")"
  if [[ "$tag_value" =~ ^(latest|main|master|dev)$ ]]; then
    fail "${tag_var} uses mutable or branch-like value '${tag_value}'. Use an immutable release tag."
  fi
done

api_url="$(get_env_value "$ENV_FILE" NEXT_PUBLIC_API_URL)"
[[ "$api_url" =~ ^https:// ]] || fail "NEXT_PUBLIC_API_URL must use https:// in production"
[[ ! "$api_url" =~ localhost|127\.0\.0\.1 ]] || fail "NEXT_PUBLIC_API_URL cannot target localhost in production"

jwt_secret="$(get_env_value "$ENV_FILE" JWT_SECRET)"
db_pass="$(get_env_value "$ENV_FILE" DB_PASS)"
postgres_pass="$(get_env_value "$ENV_FILE" POSTGRES_PASSWORD)"
grafana_pass="$(get_env_value "$ENV_FILE" GRAFANA_PASSWORD)"

assert_min_length "$jwt_secret" 32 "JWT_SECRET"
assert_min_length "$db_pass" 16 "DB_PASS"
assert_min_length "$postgres_pass" 16 "POSTGRES_PASSWORD"
assert_min_length "$grafana_pass" 16 "GRAFANA_PASSWORD"

aws_access_key_id="$(get_env_value "$ENV_FILE" AWS_ACCESS_KEY_ID || true)"
aws_secret_access_key="$(get_env_value "$ENV_FILE" AWS_SECRET_ACCESS_KEY || true)"

if [[ -n "$aws_access_key_id" || -n "$aws_secret_access_key" ]]; then
  if [[ -z "$aws_access_key_id" || -z "$aws_secret_access_key" ]]; then
    fail "Both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set together when using static credentials"
  fi

  if ! is_truthy "$ALLOW_STATIC_AWS_KEYS"; then
    fail "Static AWS credentials were detected in ${ENV_FILE}. Prefer IAM roles/workload identity. Set ALLOW_STATIC_AWS_KEYS=true only if this is explicitly required."
  fi

  warn "Static AWS credentials are enabled because ALLOW_STATIC_AWS_KEYS=true"
fi

info "Rendering Docker Compose production config"
RENDERED_COMPOSE="$(mktemp)"
trap 'rm -f "$RENDERED_COMPOSE"' EXIT
docker compose --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.prod.yml config > "$RENDERED_COMPOSE"

if grep -Eq 'image: .*:latest([[:space:]]|$)' "$RENDERED_COMPOSE"; then
  fail "Rendered Docker Compose config still contains mutable latest image tags. Pin explicit version tags."
fi

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

success "Preflight checks completed"
