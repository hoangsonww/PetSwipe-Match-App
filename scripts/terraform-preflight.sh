#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "${ROOT_DIR}/scripts/lib/preflight-common.sh"

ENV_NAME="${1:-production}"
BACKEND_FILE="terraform/backend.hcl"
TFVARS_FILE="terraform/environments/${ENV_NAME}.tfvars"
ENFORCE_TERRAFORM_SECURITY_SCANNERS="${ENFORCE_TERRAFORM_SECURITY_SCANNERS:-false}"

require_command terraform "terraform is not installed"

info "Checking Terraform operator files for ${ENV_NAME}"
require_file "$BACKEND_FILE" "Missing ${BACKEND_FILE}. Copy terraform/backend.hcl.example and fill in real values."
require_file "$TFVARS_FILE" "Missing ${TFVARS_FILE}. Copy terraform/environments/${ENV_NAME}.tfvars.example and fill in real values."

if grep -Eqi 'replace-me|example\.com|REPLACE_ME|123456789012' "$BACKEND_FILE" "$TFVARS_FILE"; then
  fail "Terraform operator files still contain placeholder values"
fi

info "Checking backend.hcl required settings"
backend_keys=(bucket key region encrypt dynamodb_table kms_key_id)
for key in "${backend_keys[@]}"; do
  grep -Eq "^[[:space:]]*${key}[[:space:]]*=" "$BACKEND_FILE" || fail "${BACKEND_FILE} is missing '${key}'"
done
grep -Eq '^[[:space:]]*encrypt[[:space:]]*=[[:space:]]*true' "$BACKEND_FILE" || fail "${BACKEND_FILE} must set encrypt = true"

backend_key_path="$(sed -nE 's/^[[:space:]]*key[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' "$BACKEND_FILE" | tail -n 1)"
[[ -n "$backend_key_path" ]] || fail "Unable to parse terraform backend key path from ${BACKEND_FILE}"
if [[ "$backend_key_path" != "${ENV_NAME}/"* ]]; then
  fail "backend.hcl key should be namespaced by environment. Expected prefix '${ENV_NAME}/', got '${backend_key_path}'."
fi

info "Checking ${TFVARS_FILE} required settings"
required_tfvars=(
  project
  environment
  aws_region
  vpc_id
  subnet_ids
  security_group_ids
  db_username
  db_password
  acm_certificate_arn
  alert_email
  db_multi_az
  ecs_desired_count
  ecs_min_capacity
  ecs_max_capacity
)

for key in "${required_tfvars[@]}"; do
  grep -Eq "^[[:space:]]*${key}[[:space:]]*=" "$TFVARS_FILE" || fail "${TFVARS_FILE} is missing '${key}'"
done

expected_env_value="$ENV_NAME"
if [[ "$ENV_NAME" == "development" ]]; then
  expected_env_value="dev"
fi

env_value="$(sed -nE 's/^[[:space:]]*environment[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' "$TFVARS_FILE" | tail -n 1)"
[[ "$env_value" == "$expected_env_value" ]] || fail "${TFVARS_FILE} environment must be '${expected_env_value}', found '${env_value:-<empty>}'"

if [[ "$ENV_NAME" == "production" ]]; then
  grep -Eq '^[[:space:]]*db_multi_az[[:space:]]*=[[:space:]]*true' "$TFVARS_FILE" || fail "production requires db_multi_az = true"
fi

db_password="$(sed -nE 's/^[[:space:]]*db_password[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' "$TFVARS_FILE" | tail -n 1)"
assert_min_length "$db_password" 16 "db_password"

alert_email="$(sed -nE 's/^[[:space:]]*alert_email[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' "$TFVARS_FILE" | tail -n 1)"
[[ -n "$alert_email" ]] || fail "alert_email must not be empty"
[[ "$alert_email" != *"example.com" ]] || fail "alert_email cannot use example.com in ${TFVARS_FILE}"

ecs_min_capacity="$(sed -nE 's/^[[:space:]]*ecs_min_capacity[[:space:]]*=[[:space:]]*([0-9]+).*/\1/p' "$TFVARS_FILE" | tail -n 1)"
ecs_max_capacity="$(sed -nE 's/^[[:space:]]*ecs_max_capacity[[:space:]]*=[[:space:]]*([0-9]+).*/\1/p' "$TFVARS_FILE" | tail -n 1)"
[[ -n "$ecs_min_capacity" && -n "$ecs_max_capacity" ]] || fail "Unable to parse ECS capacity values in ${TFVARS_FILE}"
(( ecs_max_capacity >= ecs_min_capacity )) || fail "ecs_max_capacity must be >= ecs_min_capacity"
if [[ "$ENV_NAME" == "production" ]]; then
  (( ecs_min_capacity >= 2 )) || fail "production requires ecs_min_capacity >= 2"
fi

backend_permissions="$(stat -f "%OLp" "$BACKEND_FILE" 2>/dev/null || stat -c "%a" "$BACKEND_FILE" 2>/dev/null || true)"
if [[ -n "$backend_permissions" ]]; then
  perm_numeric="${backend_permissions: -3}"
  group_digit="${perm_numeric:1:1}"
  world_digit="${perm_numeric:2:1}"
  if (( (group_digit & 2) != 0 || (world_digit & 2) != 0 )); then
    warn "${BACKEND_FILE} appears group/world writable (${backend_permissions}). Restrict permissions for operator secrets."
  fi
fi

info "Checking Terraform formatting"
terraform -chdir=terraform fmt -check -recursive >/dev/null || fail "terraform fmt reported formatting differences"

info "Initializing Terraform for local validation"
terraform -chdir=terraform init -backend=false -input=false >/dev/null

info "Checking Terraform configuration syntax"
terraform -chdir=terraform validate -var-file="environments/${ENV_NAME}.tfvars" >/dev/null || fail "terraform validate failed"

if is_truthy "$ENFORCE_TERRAFORM_SECURITY_SCANNERS"; then
  info "Running optional Terraform security scanners"
  command -v tfsec >/dev/null 2>&1 || fail "ENFORCE_TERRAFORM_SECURITY_SCANNERS=true requires tfsec to be installed"
  tfsec terraform --minimum-severity HIGH >/dev/null || fail "tfsec reported high/critical findings"
fi

success "Terraform preflight checks completed"
