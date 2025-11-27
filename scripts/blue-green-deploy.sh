#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Blue-Green Deployment Script for PetSwipe
# Performs zero-downtime deployments with instant rollback capability
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Environment variables (with defaults)
: "${AWS_REGION:=us-east-1}"
: "${PROJECT:=petswipe}"
: "${ENVIRONMENT:=production}"
: "${IMAGE_TAG:=latest}"
: "${HEALTH_CHECK_INTERVAL:=10}"
: "${HEALTH_CHECK_TIMEOUT:=300}"
: "${SMOKE_TEST_DURATION:=60}"
: "${AUTO_PROMOTE:=false}"

# Derived variables
readonly CLUSTER_NAME="${PROJECT}-${ENVIRONMENT}-cluster"
readonly BLUE_SERVICE="${PROJECT}-${ENVIRONMENT}-blue"
readonly GREEN_SERVICE="${PROJECT}-${ENVIRONMENT}-green"
readonly BLUE_TG_NAME="${PROJECT}-${ENVIRONMENT}-blue-tg"
readonly GREEN_TG_NAME="${PROJECT}-${ENVIRONMENT}-green-tg"
readonly LISTENER_ARN=$(aws elbv2 describe-listeners \
  --query "Listeners[?Protocol=='HTTPS'].ListenerArn | [0]" \
  --output text --region "$AWS_REGION")

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

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

# ─── Helper Functions ────────────────────────────────────────────────────────

get_active_environment() {
  local default_action=$(aws elbv2 describe-listeners \
    --listener-arns "$LISTENER_ARN" \
    --query 'Listeners[0].DefaultActions[0].TargetGroupArn' \
    --output text --region "$AWS_REGION")

  local blue_tg_arn=$(aws elbv2 describe-target-groups \
    --names "$BLUE_TG_NAME" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text --region "$AWS_REGION")

  if [[ "$default_action" == "$blue_tg_arn" ]]; then
    echo "blue"
  else
    echo "green"
  fi
}

get_inactive_environment() {
  local active=$(get_active_environment)
  if [[ "$active" == "blue" ]]; then
    echo "green"
  else
    echo "blue"
  fi
}

get_service_name() {
  local env=$1
  if [[ "$env" == "blue" ]]; then
    echo "$BLUE_SERVICE"
  else
    echo "$GREEN_SERVICE"
  fi
}

get_target_group_arn() {
  local env=$1
  local tg_name="${PROJECT}-${ENVIRONMENT}-${env}-tg"
  aws elbv2 describe-target-groups \
    --names "$tg_name" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text --region "$AWS_REGION"
}

wait_for_service_stable() {
  local service_name=$1
  local timeout=${2:-300}

  log_info "Waiting for service $service_name to stabilize..."

  if aws ecs wait services-stable \
    --cluster "$CLUSTER_NAME" \
    --services "$service_name" \
    --region "$AWS_REGION" 2>/dev/null; then
    log_success "Service $service_name is stable"
    return 0
  else
    log_error "Service $service_name failed to stabilize within timeout"
    return 1
  fi
}

check_target_health() {
  local tg_arn=$1
  local healthy_count=$(aws elbv2 describe-target-health \
    --target-group-arn "$tg_arn" \
    --query "length(TargetHealthDescriptions[?TargetHealth.State=='healthy'])" \
    --output text --region "$AWS_REGION")

  echo "$healthy_count"
}

run_health_checks() {
  local tg_arn=$1
  local required_healthy=${2:-2}
  local timeout=${3:-$HEALTH_CHECK_TIMEOUT}
  local interval=${4:-$HEALTH_CHECK_INTERVAL}

  log_info "Running health checks (requiring $required_healthy healthy targets)..."

  local elapsed=0
  while [[ $elapsed -lt $timeout ]]; do
    local healthy=$(check_target_health "$tg_arn")

    if [[ $healthy -ge $required_healthy ]]; then
      log_success "Health check passed: $healthy/$required_healthy targets healthy"
      return 0
    fi

    log_info "Health check in progress: $healthy/$required_healthy targets healthy (${elapsed}s elapsed)"
    sleep "$interval"
    elapsed=$((elapsed + interval))
  done

  log_error "Health check failed: timeout after ${timeout}s"
  return 1
}

run_smoke_tests() {
  local lb_dns=$1
  local duration=${2:-$SMOKE_TEST_DURATION}

  log_info "Running smoke tests for ${duration}s..."

  local start_time=$(date +%s)
  local end_time=$((start_time + duration))
  local success_count=0
  local error_count=0

  while [[ $(date +%s) -lt $end_time ]]; do
    # Test health endpoint
    if curl -sf -H "X-Test-Environment: green" "https://${lb_dns}/health" >/dev/null 2>&1; then
      ((success_count++))
    else
      ((error_count++))
    fi

    # Test API endpoint
    if curl -sf -H "X-Test-Environment: green" "https://${lb_dns}/api/pets?limit=1" >/dev/null 2>&1; then
      ((success_count++))
    else
      ((error_count++))
    fi

    sleep 2
  done

  local total=$((success_count + error_count))
  local error_rate=$(awk "BEGIN {printf \"%.2f\", ($error_count / $total) * 100}")

  log_info "Smoke test results: $success_count successes, $error_count errors (${error_rate}% error rate)"

  # Fail if error rate > 5%
  if (( $(echo "$error_rate > 5.0" | bc -l) )); then
    log_error "Smoke tests failed: error rate too high (${error_rate}%)"
    return 1
  fi

  log_success "Smoke tests passed"
  return 0
}

switch_traffic() {
  local from_tg_arn=$1
  local to_tg_arn=$2

  log_info "Switching traffic from $(basename $from_tg_arn) to $(basename $to_tg_arn)..."

  aws elbv2 modify-listener \
    --listener-arn "$LISTENER_ARN" \
    --default-actions "Type=forward,TargetGroupArn=${to_tg_arn}" \
    --region "$AWS_REGION" >/dev/null

  log_success "Traffic switched successfully"
}

scale_service() {
  local service_name=$1
  local desired_count=$2

  log_info "Scaling $service_name to $desired_count tasks..."

  aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "$service_name" \
    --desired-count "$desired_count" \
    --region "$AWS_REGION" >/dev/null

  log_success "Service scaled to $desired_count tasks"
}

rollback() {
  local active_env=$1
  local inactive_env=$2

  log_error "Rolling back deployment..."

  local active_tg_arn=$(get_target_group_arn "$active_env")
  local inactive_service=$(get_service_name "$inactive_env")

  # Switch traffic back
  switch_traffic "$(get_target_group_arn $inactive_env)" "$active_tg_arn"

  # Scale down inactive environment
  scale_service "$inactive_service" 0

  log_error "Rollback complete. Traffic restored to $active_env environment."
  exit 1
}

# ─── Main Deployment Flow ────────────────────────────────────────────────────

main() {
  log_info "Starting Blue-Green Deployment for $PROJECT ($ENVIRONMENT)"
  log_info "Image tag: $IMAGE_TAG"

  # 1. Determine active and inactive environments
  local active_env=$(get_active_environment)
  local inactive_env=$(get_inactive_environment)
  local active_service=$(get_service_name "$active_env")
  local inactive_service=$(get_service_name "$inactive_env")
  local inactive_tg_arn=$(get_target_group_arn "$inactive_env")

  log_info "Active environment: $active_env"
  log_info "Inactive environment: $inactive_env"

  # 2. Get current active service count
  local active_count=$(aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$active_service" \
    --query 'services[0].desiredCount' \
    --output text --region "$AWS_REGION")

  log_info "Active service running $active_count tasks"

  # 3. Update inactive environment with new image
  log_info "Updating $inactive_env environment with image: $IMAGE_TAG"

  aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "$inactive_service" \
    --force-new-deployment \
    --region "$AWS_REGION" >/dev/null

  # 4. Scale up inactive environment
  scale_service "$inactive_service" "$active_count"

  # 5. Wait for inactive environment to stabilize
  if ! wait_for_service_stable "$inactive_service" 600; then
    rollback "$active_env" "$inactive_env"
  fi

  # 6. Run health checks on inactive environment
  if ! run_health_checks "$inactive_tg_arn" "$active_count" 300; then
    rollback "$active_env" "$inactive_env"
  fi

  # 7. Get load balancer DNS
  local lb_dns=$(aws elbv2 describe-load-balancers \
    --query "LoadBalancers[?contains(LoadBalancerName, '${PROJECT}')].DNSName | [0]" \
    --output text --region "$AWS_REGION")

  # 8. Run smoke tests
  if ! run_smoke_tests "$lb_dns" "$SMOKE_TEST_DURATION"; then
    rollback "$active_env" "$inactive_env"
  fi

  # 9. Manual or automatic promotion
  if [[ "$AUTO_PROMOTE" == "false" ]]; then
    log_warning "Manual approval required to proceed with traffic switch."
    read -p "Proceed with traffic switch to $inactive_env? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
      log_info "Deployment cancelled by user."
      scale_service "$inactive_service" 0
      exit 0
    fi
  fi

  # 10. Switch traffic to inactive (now active) environment
  switch_traffic "$(get_target_group_arn $active_env)" "$inactive_tg_arn"

  # 11. Monitor new active environment for 60 seconds
  log_info "Monitoring new active environment for 60 seconds..."
  sleep 60

  if ! run_health_checks "$inactive_tg_arn" "$active_count" 60; then
    log_error "Post-switch health check failed!"
    rollback "$inactive_env" "$active_env"
  fi

  # 12. Scale down old active environment
  log_info "Scaling down old $active_env environment..."
  scale_service "$active_service" 0

  # 13. Success
  log_success "═══════════════════════════════════════════════════════════════"
  log_success "Blue-Green Deployment Complete!"
  log_success "Active environment: $inactive_env"
  log_success "Image tag: $IMAGE_TAG"
  log_success "═══════════════════════════════════════════════════════════════"
}

# ─── Script Entry Point ──────────────────────────────────────────────────────

trap 'log_error "Deployment failed on line $LINENO"' ERR

main "$@"
