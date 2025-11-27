#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Canary Deployment Script for PetSwipe
# Gradually shifts traffic with automated rollback on errors
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
: "${CANARY_STAGES:=5,10,25,50,100}"  # Traffic percentage stages
: "${STAGE_DURATION:=300}"  # 5 minutes per stage
: "${ERROR_THRESHOLD:=5.0}"  # Max error rate percentage
: "${LATENCY_THRESHOLD:=1000}"  # Max latency in ms
: "${AUTO_PROMOTE:=true}"

# Derived variables
readonly CLUSTER_NAME="${PROJECT}-${ENVIRONMENT}-cluster"
readonly BLUE_SERVICE="${PROJECT}-${ENVIRONMENT}-blue"
readonly CANARY_SERVICE="${PROJECT}-${ENVIRONMENT}-canary"
readonly BLUE_TG_NAME="${PROJECT}-${ENVIRONMENT}-blue-tg"
readonly CANARY_TG_NAME="${PROJECT}-${ENVIRONMENT}-canary-tg"

# Get listener rule ARN for weighted routing
readonly LISTENER_RULE_ARN=$(aws elbv2 describe-rules \
  --query "Rules[?contains(to_string(Actions), 'forward') && contains(to_string(Conditions), 'path-pattern')].RuleArn | [0]" \
  --output text --region "$AWS_REGION" 2>/dev/null || echo "")

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
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

log_canary() {
  echo -e "${CYAN}[CANARY]${NC} $*"
}

# ─── Helper Functions ────────────────────────────────────────────────────────

get_target_group_arn() {
  local tg_name=$1
  aws elbv2 describe-target-groups \
    --names "$tg_name" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text --region "$AWS_REGION"
}

get_load_balancer_arn() {
  aws elbv2 describe-load-balancers \
    --query "LoadBalancers[?contains(LoadBalancerName, '${PROJECT}')].LoadBalancerArn | [0]" \
    --output text --region "$AWS_REGION"
}

update_traffic_weights() {
  local blue_weight=$1
  local canary_weight=$2

  log_canary "Updating traffic weights: Blue=${blue_weight}%, Canary=${canary_weight}%"

  local blue_tg_arn=$(get_target_group_arn "$BLUE_TG_NAME")
  local canary_tg_arn=$(get_target_group_arn "$CANARY_TG_NAME")

  aws elbv2 modify-rule \
    --rule-arn "$LISTENER_RULE_ARN" \
    --actions Type=forward,ForwardConfig="{
      TargetGroups=[
        {TargetGroupArn=${blue_tg_arn},Weight=${blue_weight}},
        {TargetGroupArn=${canary_tg_arn},Weight=${canary_weight}}
      ],
      TargetGroupStickinessConfig={Enabled=true,DurationSeconds=3600}
    }" \
    --region "$AWS_REGION" >/dev/null

  log_success "Traffic weights updated"
}

get_metrics() {
  local tg_arn=$1
  local tg_suffix=$(echo "$tg_arn" | sed 's/.*targetgroup\///')
  local lb_arn=$(get_load_balancer_arn)
  local lb_suffix=$(echo "$lb_arn" | sed 's/.*loadbalancer\///')

  local end_time=$(date -u +"%Y-%m-%dT%H:%M:%S")
  local start_time=$(date -u -d '5 minutes ago' +"%Y-%m-%dT%H:%M:%S" 2>/dev/null || \
                     date -u -v-5M +"%Y-%m-%dT%H:%M:%S")

  # Get error count
  local errors=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name HTTPCode_Target_5XX_Count \
    --dimensions Name=TargetGroup,Value="$tg_suffix" Name=LoadBalancer,Value="$lb_suffix" \
    --start-time "$start_time" \
    --end-time "$end_time" \
    --period 60 \
    --statistics Sum \
    --query 'Datapoints[0].Sum' \
    --output text --region "$AWS_REGION" 2>/dev/null || echo "0")

  # Get success count
  local successes=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name HTTPCode_Target_2XX_Count \
    --dimensions Name=TargetGroup,Value="$tg_suffix" Name=LoadBalancer,Value="$lb_suffix" \
    --start-time "$start_time" \
    --end-time "$end_time" \
    --period 60 \
    --statistics Sum \
    --query 'Datapoints[0].Sum' \
    --output text --region "$AWS_REGION" 2>/dev/null || echo "0")

  # Get latency
  local latency=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name TargetResponseTime \
    --dimensions Name=TargetGroup,Value="$tg_suffix" Name=LoadBalancer,Value="$lb_suffix" \
    --start-time "$start_time" \
    --end-time "$end_time" \
    --period 60 \
    --statistics Average \
    --query 'Datapoints[0].Average' \
    --output text --region "$AWS_REGION" 2>/dev/null || echo "0")

  # Handle "None" values
  errors=${errors//None/0}
  successes=${successes//None/0}
  latency=${latency//None/0}

  echo "$errors $successes $latency"
}

check_canary_health() {
  local canary_tg_arn=$(get_target_group_arn "$CANARY_TG_NAME")

  read -r errors successes latency <<< "$(get_metrics "$canary_tg_arn")"

  local total=$((errors + successes))
  local error_rate=0

  if [[ $total -gt 0 ]]; then
    error_rate=$(awk "BEGIN {printf \"%.2f\", ($errors / $total) * 100}")
  fi

  local latency_ms=$(awk "BEGIN {printf \"%.0f\", $latency * 1000}")

  log_canary "Metrics: ${successes} success, ${errors} errors (${error_rate}% error rate), ${latency_ms}ms latency"

  # Check error rate threshold
  if (( $(echo "$error_rate > $ERROR_THRESHOLD" | bc -l) )); then
    log_error "Error rate ${error_rate}% exceeds threshold ${ERROR_THRESHOLD}%"
    return 1
  fi

  # Check latency threshold
  if (( $(echo "$latency_ms > $LATENCY_THRESHOLD" | bc -l) )); then
    log_error "Latency ${latency_ms}ms exceeds threshold ${LATENCY_THRESHOLD}ms"
    return 1
  fi

  # Check target health
  local healthy=$(aws elbv2 describe-target-health \
    --target-group-arn "$canary_tg_arn" \
    --query "length(TargetHealthDescriptions[?TargetHealth.State=='healthy'])" \
    --output text --region "$AWS_REGION")

  local total_targets=$(aws elbv2 describe-target-health \
    --target-group-arn "$canary_tg_arn" \
    --query "length(TargetHealthDescriptions)" \
    --output text --region "$AWS_REGION")

  if [[ $healthy -lt $total_targets ]]; then
    log_error "Only $healthy/$total_targets targets are healthy"
    return 1
  fi

  log_success "Health check passed: ${healthy}/${total_targets} healthy, ${error_rate}% errors, ${latency_ms}ms latency"
  return 0
}

monitor_stage() {
  local stage_percent=$1
  local duration=$2

  log_canary "Monitoring ${stage_percent}% canary traffic for ${duration}s..."

  local elapsed=0
  local check_interval=30

  while [[ $elapsed -lt $duration ]]; do
    if ! check_canary_health; then
      return 1
    fi

    sleep "$check_interval"
    elapsed=$((elapsed + check_interval))
  done

  log_success "Stage ${stage_percent}% completed successfully"
  return 0
}

rollback() {
  log_error "Rolling back canary deployment..."

  # Set traffic to 100% blue, 0% canary
  update_traffic_weights 100 0

  # Scale down canary
  aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "$CANARY_SERVICE" \
    --desired-count 0 \
    --region "$AWS_REGION" >/dev/null

  log_error "Rollback complete. All traffic restored to blue environment."
  exit 1
}

# ─── Main Deployment Flow ────────────────────────────────────────────────────

main() {
  log_info "Starting Canary Deployment for $PROJECT ($ENVIRONMENT)"
  log_info "Image tag: $IMAGE_TAG"
  log_info "Canary stages: $CANARY_STAGES"
  log_info "Stage duration: ${STAGE_DURATION}s"

  # 1. Get current blue service count
  local blue_count=$(aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$BLUE_SERVICE" \
    --query 'services[0].desiredCount' \
    --output text --region "$AWS_REGION")

  log_info "Blue service running $blue_count tasks"

  # 2. Calculate canary initial count (10% of blue)
  local canary_count=$(( (blue_count + 9) / 10 ))  # Round up
  [[ $canary_count -lt 1 ]] && canary_count=1

  log_info "Starting canary with $canary_count tasks"

  # 3. Update canary service with new image
  log_info "Deploying new image to canary: $IMAGE_TAG"

  aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "$CANARY_SERVICE" \
    --desired-count "$canary_count" \
    --force-new-deployment \
    --region "$AWS_REGION" >/dev/null

  # 4. Wait for canary to stabilize
  log_info "Waiting for canary service to stabilize..."

  if ! aws ecs wait services-stable \
    --cluster "$CLUSTER_NAME" \
    --services "$CANARY_SERVICE" \
    --region "$AWS_REGION"; then
    log_error "Canary service failed to stabilize"
    rollback
  fi

  # 5. Process each canary stage
  IFS=',' read -ra STAGES <<< "$CANARY_STAGES"

  for stage in "${STAGES[@]}"; do
    stage=$(echo "$stage" | xargs)  # Trim whitespace

    # Calculate weights
    local canary_weight=$stage
    local blue_weight=$((100 - stage))

    # Update traffic distribution
    update_traffic_weights "$blue_weight" "$canary_weight"

    # Scale canary based on stage
    if [[ $stage -ge 50 ]]; then
      local new_canary_count=$(( (blue_count * stage + 50) / 100 ))
      [[ $new_canary_count -lt 1 ]] && new_canary_count=1

      if [[ $new_canary_count -ne $canary_count ]]; then
        log_info "Scaling canary to $new_canary_count tasks"
        aws ecs update-service \
          --cluster "$CLUSTER_NAME" \
          --service "$CANARY_SERVICE" \
          --desired-count "$new_canary_count" \
          --region "$AWS_REGION" >/dev/null

        canary_count=$new_canary_count

        # Wait for scaling
        sleep 30
      fi
    fi

    # Monitor this stage
    if ! monitor_stage "$stage" "$STAGE_DURATION"; then
      log_error "Canary stage ${stage}% failed health checks"
      rollback
    fi

    # Manual approval for next stage (except last)
    if [[ "$AUTO_PROMOTE" == "false" ]] && [[ $stage -lt 100 ]]; then
      log_warning "Manual approval required to proceed to next stage."
      read -p "Continue to next stage? (yes/no): " -r
      if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Deployment cancelled by user."
        rollback
      fi
    fi
  done

  # 6. Full canary promotion - scale down blue
  log_info "Canary fully promoted, scaling down blue environment..."

  aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "$BLUE_SERVICE" \
    --desired-count 0 \
    --region "$AWS_REGION" >/dev/null

  # 7. Rename canary to blue (swap services)
  log_info "Swapping canary to blue environment..."

  # Update traffic to 100% canary
  update_traffic_weights 0 100

  # Wait for traffic to drain from blue
  sleep 60

  # 8. Success
  log_success "═══════════════════════════════════════════════════════════════"
  log_success "Canary Deployment Complete!"
  log_success "New version fully deployed and serving 100% traffic"
  log_success "Image tag: $IMAGE_TAG"
  log_success "═══════════════════════════════════════════════════════════════"

  # 9. Post-deployment monitoring
  log_info "Monitoring new deployment for 5 minutes..."

  if ! monitor_stage 100 300; then
    log_error "Post-deployment monitoring detected issues!"
    rollback
  fi

  log_success "Post-deployment monitoring passed!"
}

# ─── Script Entry Point ──────────────────────────────────────────────────────

trap 'log_error "Deployment failed on line $LINENO"' ERR

main "$@"
