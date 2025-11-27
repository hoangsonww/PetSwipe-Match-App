#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Chaos Engineering Script
# Tests system resilience by injecting failures and validating recovery
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
: "${AWS_REGION:=us-east-1}"
: "${PROJECT:=petswipe}"
: "${ENVIRONMENT:=staging}"  # Never run chaos in production without approval!
: "${DRY_RUN:=true}"

readonly CLUSTER_NAME="${PROJECT}-${ENVIRONMENT}-cluster"
readonly SERVICE_NAME="${PROJECT}-${ENVIRONMENT}-blue"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly NC='\033[0m'

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

log_chaos() {
  echo -e "${MAGENTA}[CHAOS]${NC} $*"
}

# ─── Safety Checks ───────────────────────────────────────────────────────────

check_environment() {
  if [[ "$ENVIRONMENT" == "production" && "$DRY_RUN" != "false" ]]; then
    log_error "Chaos engineering in production requires explicit DRY_RUN=false"
    log_error "This is a safety feature. Use with extreme caution!"
    exit 1
  fi

  log_info "Environment: $ENVIRONMENT"
  log_info "Dry Run: $DRY_RUN"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_warning "Running in DRY RUN mode - no actual changes will be made"
  fi
}

# ─── Monitoring Setup ────────────────────────────────────────────────────────

start_monitoring() {
  log_info "Setting up monitoring for chaos experiment..."

  # Get baseline metrics
  BASELINE_HEALTHY_TASKS=$(aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --query 'services[0].runningCount' \
    --output text --region "$AWS_REGION")

  BASELINE_ERROR_RATE=$(get_error_rate)

  log_info "Baseline healthy tasks: $BASELINE_HEALTHY_TASKS"
  log_info "Baseline error rate: ${BASELINE_ERROR_RATE}%"
}

get_error_rate() {
  local end_time=$(date -u +"%Y-%m-%dT%H:%M:%S")
  local start_time=$(date -u -d '5 minutes ago' +"%Y-%m-%dT%H:%M:%S" 2>/dev/null || \
                     date -u -v-5M +"%Y-%m-%dT%H:%M:%S")

  local errors=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name HTTPCode_Target_5XX_Count \
    --start-time "$start_time" \
    --end-time "$end_time" \
    --period 300 \
    --statistics Sum \
    --query 'Datapoints[0].Sum' \
    --output text --region "$AWS_REGION" 2>/dev/null || echo "0")

  local requests=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name RequestCount \
    --start-time "$start_time" \
    --end-time "$end_time" \
    --period 300 \
    --statistics Sum \
    --query 'Datapoints[0].Sum' \
    --output text --region "$AWS_REGION" 2>/dev/null || echo "100")

  errors=${errors//None/0}
  requests=${requests//None/100}

  if [[ $requests -gt 0 ]]; then
    echo $(awk "BEGIN {printf \"%.2f\", ($errors / $requests) * 100}")
  else
    echo "0.00"
  fi
}

verify_system_health() {
  log_info "Verifying system health after chaos..."

  local current_tasks=$(aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --query 'services[0].runningCount' \
    --output text --region "$AWS_REGION")

  local current_error_rate=$(get_error_rate)

  log_info "Current healthy tasks: $current_tasks"
  log_info "Current error rate: ${current_error_rate}%"

  # Check if system recovered
  if [[ $current_tasks -ge $BASELINE_HEALTHY_TASKS ]]; then
    log_success "System recovered: Task count back to baseline"
  else
    log_warning "System partially recovered: $current_tasks/$BASELINE_HEALTHY_TASKS tasks running"
  fi

  if (( $(echo "$current_error_rate <= ($BASELINE_ERROR_RATE + 5)" | bc -l) )); then
    log_success "Error rate within acceptable range"
  else
    log_warning "Error rate elevated: ${current_error_rate}% (baseline: ${BASELINE_ERROR_RATE}%)"
  fi
}

# ─── Chaos Experiments ───────────────────────────────────────────────────────

experiment_kill_random_task() {
  log_chaos "Experiment: Kill Random ECS Task"
  log_info "Testing: Task failure recovery and auto-scaling response"

  # Get list of running tasks
  local tasks=$(aws ecs list-tasks \
    --cluster "$CLUSTER_NAME" \
    --service-name "$SERVICE_NAME" \
    --desired-status RUNNING \
    --query 'taskArns[0]' \
    --output text --region "$AWS_REGION")

  if [[ -z "$tasks" || "$tasks" == "None" ]]; then
    log_error "No running tasks found"
    return 1
  fi

  log_info "Target task: $tasks"

  if [[ "$DRY_RUN" == "false" ]]; then
    aws ecs stop-task \
      --cluster "$CLUSTER_NAME" \
      --task "$tasks" \
      --reason "Chaos Engineering: Task resilience test" \
      --region "$AWS_REGION" > /dev/null

    log_chaos "Task terminated. Waiting 60s for recovery..."
    sleep 60

    verify_system_health
  else
    log_warning "DRY RUN: Would terminate task $tasks"
  fi
}

experiment_cpu_stress() {
  log_chaos "Experiment: CPU Stress Test"
  log_info "Testing: System behavior under CPU pressure"

  local tasks=$(aws ecs list-tasks \
    --cluster "$CLUSTER_NAME" \
    --service-name "$SERVICE_NAME" \
    --desired-status RUNNING \
    --query 'taskArns[]' \
    --output text --region "$AWS_REGION")

  if [[ "$DRY_RUN" == "false" ]]; then
    log_chaos "Injecting CPU stress for 60 seconds..."

    # Note: This requires AWS Systems Manager Session Manager
    # In production, you'd use stress-ng or similar tools via SSM
    log_warning "CPU stress requires SSM access to containers (not implemented in script)"
    log_info "Recommended: Use AWS FIS (Fault Injection Simulator) for production chaos"
  else
    log_warning "DRY RUN: Would inject CPU stress via SSM"
  fi
}

experiment_network_latency() {
  log_chaos "Experiment: Network Latency Injection"
  log_info "Testing: System behavior with degraded network performance"

  if [[ "$DRY_RUN" == "false" ]]; then
    log_chaos "Injecting 500ms network latency for 60 seconds..."
    log_warning "Network latency injection requires AWS FIS or Pumba"
    log_info "Recommended approach:"
    log_info "  1. Use AWS Fault Injection Simulator (FIS)"
    log_info "  2. Or run Pumba sidecar containers"
  else
    log_warning "DRY RUN: Would inject 500ms network latency"
  fi
}

experiment_dependency_failure() {
  log_chaos "Experiment: Database Connection Failure"
  log_info "Testing: Circuit breaker and graceful degradation"

  if [[ "$DRY_RUN" == "false" ]]; then
    log_chaos "Simulating database unavailability..."

    # In a real scenario, you'd modify security groups or use chaos tools
    log_warning "Database failure simulation requires network policy changes"
    log_info "Recommended: Use AWS FIS to block RDS connections temporarily"
  else
    log_warning "DRY RUN: Would block database connections"
  fi
}

experiment_az_failure() {
  log_chaos "Experiment: Availability Zone Failure"
  log_info "Testing: Multi-AZ failover and disaster recovery"

  local azs=$(aws ec2 describe-availability-zones \
    --region "$AWS_REGION" \
    --query 'AvailabilityZones[0].ZoneName' \
    --output text)

  log_info "Target AZ: $azs"

  if [[ "$DRY_RUN" == "false" ]]; then
    log_chaos "Simulating AZ failure (stopping tasks in $azs)..."
    log_warning "AZ failure requires subnet isolation or FIS experiment"
    log_info "Recommended: Use AWS FIS AZ failure template"
  else
    log_warning "DRY RUN: Would simulate failure in AZ $azs"
  fi
}

experiment_scaling_shock() {
  log_chaos "Experiment: Sudden Traffic Spike"
  log_info "Testing: Auto-scaling response to rapid load increase"

  if [[ "$DRY_RUN" == "false" ]]; then
    log_chaos "Triggering auto-scaling by injecting load..."

    # Use Artillery or similar for load testing
    if command -v artillery &> /dev/null; then
      local lb_dns=$(aws elbv2 describe-load-balancers \
        --query "LoadBalancers[?contains(LoadBalancerName, '${PROJECT}')].DNSName | [0]" \
        --output text --region "$AWS_REGION")

      log_info "Running load test against $lb_dns"
      artillery quick --count 100 --num 1000 "https://${lb_dns}/health"

      sleep 30
      verify_system_health
    else
      log_warning "Artillery not installed. Install with: npm install -g artillery"
    fi
  else
    log_warning "DRY RUN: Would inject traffic spike"
  fi
}

experiment_deployment_rollback() {
  log_chaos "Experiment: Failed Deployment Rollback"
  log_info "Testing: Automatic rollback on deployment failure"

  if [[ "$DRY_RUN" == "false" ]]; then
    log_chaos "Deploying intentionally bad configuration..."

    # Update service with invalid task definition
    log_warning "Deployment rollback test requires ECS deployment circuit breaker"
    log_info "Circuit breaker should automatically rollback failed deployments"
  else
    log_warning "DRY RUN: Would deploy bad configuration to test rollback"
  fi
}

# ─── Chaos Suite Runner ──────────────────────────────────────────────────────

run_chaos_suite() {
  local experiment=${1:-all}

  log_info "═══════════════════════════════════════════════════════════"
  log_info "  CHAOS ENGINEERING SUITE"
  log_info "  Project: $PROJECT"
  log_info "  Environment: $ENVIRONMENT"
  log_info "  Experiment: $experiment"
  log_info "═══════════════════════════════════════════════════════════"
  echo ""

  check_environment
  start_monitoring

  case "$experiment" in
    "kill-task"|"all")
      experiment_kill_random_task
      sleep 30
      ;;&
    "cpu-stress")
      experiment_cpu_stress
      sleep 30
      ;;&
    "network-latency")
      experiment_network_latency
      sleep 30
      ;;&
    "dependency-failure")
      experiment_dependency_failure
      sleep 30
      ;;&
    "az-failure")
      experiment_az_failure
      sleep 30
      ;;&
    "scaling-shock")
      experiment_scaling_shock
      sleep 30
      ;;&
    "deployment-rollback")
      experiment_deployment_rollback
      sleep 30
      ;;&
    *)
      if [[ "$experiment" != "all" ]]; then
        log_error "Unknown experiment: $experiment"
        log_info "Available experiments: kill-task, cpu-stress, network-latency, dependency-failure, az-failure, scaling-shock, deployment-rollback, all"
        exit 1
      fi
      ;;
  esac

  echo ""
  log_success "═══════════════════════════════════════════════════════════"
  log_success "  CHAOS EXPERIMENTS COMPLETED"
  log_success "═══════════════════════════════════════════════════════════"

  # Final health check
  verify_system_health
}

# ─── Main Execution ──────────────────────────────────────────────────────────

main() {
  local experiment=${1:-all}
  run_chaos_suite "$experiment"
}

main "$@"
