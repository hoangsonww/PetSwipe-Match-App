#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_NAME="${1:-production}"
BACKEND_FILE="terraform/backend.hcl"
TFVARS_FILE="terraform/environments/${ENV_NAME}.tfvars"

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

command -v terraform >/dev/null 2>&1 || fail "terraform is not installed"

info "Checking Terraform operator files for ${ENV_NAME}"
[[ -f "$BACKEND_FILE" ]] || fail "Missing ${BACKEND_FILE}. Copy terraform/backend.hcl.example and fill in real values."
[[ -f "$TFVARS_FILE" ]] || fail "Missing ${TFVARS_FILE}. Copy terraform/environments/${ENV_NAME}.tfvars.example and fill in real values."

if grep -Eqi 'replace-me|example\.com|REPLACE_ME|123456789012' "$BACKEND_FILE" "$TFVARS_FILE"; then
  fail "Terraform operator files still contain placeholder values"
fi

info "Checking Terraform formatting"
terraform -chdir=terraform fmt -check >/dev/null || warn "terraform fmt reported formatting differences"

info "Checking Terraform configuration syntax"
terraform -chdir=terraform validate >/dev/null || warn "terraform validate did not complete cleanly; run terraform init first with real backend access"

info "Terraform preflight checks completed"
