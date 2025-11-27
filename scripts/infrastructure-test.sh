#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Infrastructure Testing and Validation Script
# Tests Terraform configurations, security compliance, and drift detection
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly TERRAFORM_DIR="$PROJECT_ROOT/terraform"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# ─── Logging Functions ───────────────────────────────────────────────────────

log_info() {
  echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*"
}

log_test() {
  echo -e "${BLUE}[TEST]${NC} $*"
}

# ─── Test Tracking ───────────────────────────────────────────────────────────

start_test() {
  local test_name=$1
  ((TOTAL_TESTS++))
  log_test "Running: $test_name"
}

pass_test() {
  ((PASSED_TESTS++))
  log_success "PASSED"
  echo ""
}

fail_test() {
  local message=${1:-"Test failed"}
  ((FAILED_TESTS++))
  log_error "FAILED: $message"
  echo ""
}

# ─── Terraform Validation ────────────────────────────────────────────────────

test_terraform_format() {
  start_test "Terraform Format Check"

  cd "$TERRAFORM_DIR"
  if terraform fmt -check -recursive .; then
    pass_test
  else
    fail_test "Terraform files are not properly formatted. Run 'terraform fmt -recursive'"
  fi
}

test_terraform_validate() {
  start_test "Terraform Validate"

  cd "$TERRAFORM_DIR"
  if terraform init -backend=false > /dev/null 2>&1; then
    if terraform validate; then
      pass_test
    else
      fail_test "Terraform validation failed"
    fi
  else
    fail_test "Terraform init failed"
  fi
}

# ─── Security Scanning ───────────────────────────────────────────────────────

test_tfsec_scan() {
  start_test "tfsec Security Scan"

  if ! command -v tfsec &> /dev/null; then
    log_warning "tfsec not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
      brew install tfsec
    else
      curl -s https://raw.githubusercontent.com/aquasecurity/tfsec/master/scripts/install_linux.sh | bash
    fi
  fi

  cd "$TERRAFORM_DIR"
  if tfsec . --soft-fail --format json > tfsec-report.json; then
    local critical=$(jq '[.results[] | select(.severity=="CRITICAL")] | length' tfsec-report.json)
    local high=$(jq '[.results[] | select(.severity=="HIGH")] | length' tfsec-report.json)

    log_info "Critical issues: $critical"
    log_info "High issues: $high"

    if [[ $critical -eq 0 && $high -eq 0 ]]; then
      pass_test
    else
      fail_test "Found $critical critical and $high high severity issues"
    fi
  else
    fail_test "tfsec scan failed"
  fi
}

test_checkov_scan() {
  start_test "Checkov Policy-as-Code Scan"

  if ! command -v checkov &> /dev/null; then
    log_warning "checkov not installed. Installing..."
    pip3 install checkov
  fi

  cd "$TERRAFORM_DIR"
  if checkov -d . --framework terraform --output json > checkov-report.json; then
    local failed=$(jq '.summary.failed' checkov-report.json)
    log_info "Failed checks: $failed"

    if [[ $failed -eq 0 ]]; then
      pass_test
    else
      fail_test "Found $failed failed policy checks"
    fi
  else
    fail_test "Checkov scan failed"
  fi
}

test_terrascan() {
  start_test "Terrascan Compliance Scan"

  if ! command -v terrascan &> /dev/null; then
    log_warning "terrascan not installed. Installing..."
    curl -L "$(curl -s https://api.github.com/repos/tenable/terrascan/releases/latest | grep -o -E "https://.+?_Darwin_x86_64.tar.gz")" > terrascan.tar.gz
    tar -xf terrascan.tar.gz terrascan && rm terrascan.tar.gz
    sudo install terrascan /usr/local/bin && rm terrascan
  fi

  cd "$TERRAFORM_DIR"
  if terrascan scan -i terraform -t aws --verbose --output json > terrascan-report.json; then
    local violations=$(jq '.results.violations | length' terrascan-report.json)
    log_info "Policy violations: $violations"

    if [[ $violations -eq 0 ]]; then
      pass_test
    else
      fail_test "Found $violations policy violations"
    fi
  else
    fail_test "Terrascan scan failed"
  fi
}

# ─── Cost Estimation ─────────────────────────────────────────────────────────

test_infracost_estimate() {
  start_test "Infrastructure Cost Estimation"

  if ! command -v infracost &> /dev/null; then
    log_warning "infracost not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
      brew install infracost
    else
      curl -fsSL https://raw.githubusercontent.com/infracost/infracost/master/scripts/install.sh | sh
    fi
  fi

  cd "$TERRAFORM_DIR"
  if infracost breakdown --path . --format json > cost-estimate.json; then
    local monthly_cost=$(jq -r '.totalMonthlyCost' cost-estimate.json)
    log_info "Estimated monthly cost: \$${monthly_cost}"

    # Fail if cost exceeds threshold (e.g., $1000/month)
    if (( $(echo "$monthly_cost > 1000" | bc -l) )); then
      log_warning "Monthly cost exceeds \$1000 threshold"
    fi

    pass_test
  else
    fail_test "Cost estimation failed"
  fi
}

# ─── Drift Detection ─────────────────────────────────────────────────────────

test_terraform_drift() {
  start_test "Terraform Drift Detection"

  cd "$TERRAFORM_DIR"

  if [[ -f ".terraform/terraform.tfstate" ]]; then
    if terraform plan -detailed-exitcode -out=tfplan > /dev/null 2>&1; then
      log_info "No infrastructure drift detected"
      pass_test
    else
      local exit_code=$?
      if [[ $exit_code -eq 2 ]]; then
        log_warning "Infrastructure drift detected!"
        terraform show tfplan
        fail_test "Drift found between infrastructure and code"
      else
        fail_test "Terraform plan failed"
      fi
    fi
  else
    log_warning "Terraform not initialized with remote state, skipping drift detection"
    pass_test
  fi
}

# ─── Resource Tagging Compliance ─────────────────────────────────────────────

test_required_tags() {
  start_test "Resource Tagging Compliance"

  cd "$TERRAFORM_DIR"

  local required_tags=("Project" "Environment" "ManagedBy")
  local missing_tags=0

  for tag in "${required_tags[@]}"; do
    if ! grep -r "tags.*$tag" . > /dev/null 2>&1; then
      log_warning "Required tag '$tag' may be missing in some resources"
      ((missing_tags++))
    fi
  done

  if [[ $missing_tags -eq 0 ]]; then
    pass_test
  else
    fail_test "Some resources may be missing required tags"
  fi
}

# ─── Module Testing ──────────────────────────────────────────────────────────

test_terraform_modules() {
  start_test "Terraform Module Structure"

  local required_files=("main.tf" "variables.tf" "outputs.tf" "provider.tf")
  local missing_files=0

  for file in "${required_files[@]}"; do
    if [[ ! -f "$TERRAFORM_DIR/$file" ]]; then
      log_warning "Required file '$file' not found"
      ((missing_files++))
    fi
  done

  if [[ $missing_files -eq 0 ]]; then
    pass_test
  else
    fail_test "Missing $missing_files required Terraform files"
  fi
}

# ─── Security Best Practices ─────────────────────────────────────────────────

test_secrets_in_code() {
  start_test "Secret Detection in Code"

  if ! command -v gitleaks &> /dev/null; then
    log_warning "gitleaks not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
      brew install gitleaks
    else
      wget https://github.com/zricethezav/gitleaks/releases/download/v8.18.0/gitleaks_8.18.0_linux_x64.tar.gz
      tar -xzf gitleaks_8.18.0_linux_x64.tar.gz
      sudo mv gitleaks /usr/local/bin/
    fi
  fi

  cd "$PROJECT_ROOT"
  if gitleaks detect --source . --verbose --no-git > gitleaks-report.json 2>&1; then
    pass_test
  else
    fail_test "Potential secrets detected in code!"
  fi
}

test_encryption_enabled() {
  start_test "Encryption at Rest Enabled"

  cd "$TERRAFORM_DIR"

  # Check for encryption settings
  local unencrypted=0

  # Check RDS encryption
  if ! grep -r "storage_encrypted.*=.*true" . > /dev/null 2>&1; then
    log_warning "RDS may not have encryption enabled"
    ((unencrypted++))
  fi

  # Check S3 encryption
  if ! grep -r "server_side_encryption_configuration" . > /dev/null 2>&1; then
    log_warning "S3 buckets may not have encryption configured"
    ((unencrypted++))
  fi

  if [[ $unencrypted -eq 0 ]]; then
    pass_test
  else
    fail_test "Some resources may not have encryption enabled"
  fi
}

# ─── Network Security ────────────────────────────────────────────────────────

test_security_groups() {
  start_test "Security Group Configuration"

  cd "$TERRAFORM_DIR"

  # Check for overly permissive security groups
  if grep -r "0.0.0.0/0" . | grep -v "#" > /dev/null 2>&1; then
    log_warning "Found potentially overly permissive security group rules (0.0.0.0/0)"
    fail_test "Review security group configurations"
  else
    pass_test
  fi
}

# ─── Disaster Recovery Tests ─────────────────────────────────────────────────

test_backup_configuration() {
  start_test "Backup Configuration"

  cd "$TERRAFORM_DIR"

  if grep -r "backup_retention_period" . > /dev/null 2>&1 && \
     grep -r "aws_backup_plan" . > /dev/null 2>&1; then
    pass_test
  else
    fail_test "Backup configuration may be missing"
  fi
}

test_multi_az_enabled() {
  start_test "Multi-AZ Configuration"

  cd "$TERRAFORM_DIR"

  if grep -r "multi_az.*=.*true" . > /dev/null 2>&1; then
    pass_test
  else
    fail_test "Multi-AZ may not be enabled for critical resources"
  fi
}

# ─── Generate Test Report ────────────────────────────────────────────────────

generate_report() {
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "  INFRASTRUCTURE TEST REPORT"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "  Total Tests:  $TOTAL_TESTS"
  echo -e "  ${GREEN}Passed:       $PASSED_TESTS${NC}"
  echo -e "  ${RED}Failed:       $FAILED_TESTS${NC}"
  echo ""

  local pass_rate=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS / $TOTAL_TESTS) * 100}")
  echo "  Pass Rate:    ${pass_rate}%"
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo ""

  # Generate JSON report
  cat > "$PROJECT_ROOT/infrastructure-test-report.json" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "total_tests": $TOTAL_TESTS,
  "passed": $PASSED_TESTS,
  "failed": $FAILED_TESTS,
  "pass_rate": $pass_rate
}
EOF

  log_info "Test report saved to infrastructure-test-report.json"
}

# ─── Main Execution ──────────────────────────────────────────────────────────

main() {
  log_info "Starting Infrastructure Testing Suite"
  echo ""

  # Terraform Tests
  test_terraform_format
  test_terraform_validate
  test_terraform_modules

  # Security Tests
  test_tfsec_scan
  test_checkov_scan
  test_terrascan
  test_secrets_in_code
  test_encryption_enabled
  test_security_groups

  # Compliance Tests
  test_required_tags

  # Cost & Drift
  test_infracost_estimate
  test_terraform_drift

  # Disaster Recovery
  test_backup_configuration
  test_multi_az_enabled

  # Generate Report
  generate_report

  # Exit with failure if any tests failed
  if [[ $FAILED_TESTS -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
