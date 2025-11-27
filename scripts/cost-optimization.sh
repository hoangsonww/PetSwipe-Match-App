#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# AWS Cost Optimization Script
# Analyzes resource usage and provides cost-saving recommendations
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

: "${AWS_REGION:=us-east-1}"
: "${PROJECT:=petswipe}"
: "${ENVIRONMENT:=production}"
: "${LOOKBACK_DAYS:=30}"

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# ─── Logging ─────────────────────────────────────────────────────────────────

log_info() {
  echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[SAVE]${NC} $*"
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $*"
}

log_cost() {
  echo -e "${CYAN}[COST]${NC} $*"
}

# ─── Cost Analysis ───────────────────────────────────────────────────────────

analyze_ec2_utilization() {
  log_info "Analyzing EC2 instance utilization..."

  local instances=$(aws ec2 describe-instances \
    --filters "Name=tag:Project,Values=$PROJECT" \
              "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].[InstanceId,InstanceType]' \
    --output text --region "$AWS_REGION")

  if [[ -z "$instances" ]]; then
    log_info "No EC2 instances found"
    return
  fi

  echo "$instances" | while read -r instance_id instance_type; do
    local cpu_avg=$(aws cloudwatch get-metric-statistics \
      --namespace AWS/EC2 \
      --metric-name CPUUtilization \
      --dimensions Name=InstanceId,Value="$instance_id" \
      --start-time "$(date -u -d "$LOOKBACK_DAYS days ago" +%Y-%m-%dT%H:%M:%S)" \
      --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
      --period 86400 \
      --statistics Average \
      --query 'Datapoints[].Average' \
      --output text --region "$AWS_REGION" | awk '{sum+=$1; count++} END {print sum/count}')

    log_cost "Instance: $instance_id ($instance_type) - Avg CPU: ${cpu_avg}%"

    if (( $(echo "$cpu_avg < 10" | bc -l) )); then
      log_success "Consider downsizing or stopping this under-utilized instance"
    fi
  done
}

analyze_rds_utilization() {
  log_info "Analyzing RDS database utilization..."

  local dbs=$(aws rds describe-db-instances \
    --query "DBInstances[?contains(DBInstanceIdentifier, '$PROJECT')].DBInstanceIdentifier" \
    --output text --region "$AWS_REGION")

  if [[ -z "$dbs" ]]; then
    log_info "No RDS instances found"
    return
  fi

  for db in $dbs; do
    local cpu_avg=$(aws cloudwatch get-metric-statistics \
      --namespace AWS/RDS \
      --metric-name CPUUtilization \
      --dimensions Name=DBInstanceIdentifier,Value="$db" \
      --start-time "$(date -u -d "$LOOKBACK_DAYS days ago" +%Y-%m-%dT%H:%M:%S)" \
      --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
      --period 86400 \
      --statistics Average \
      --query 'Datapoints[].Average' \
      --output text --region "$AWS_REGION" | awk '{sum+=$1; count++} END {print sum/count}')

    local connections=$(aws cloudwatch get-metric-statistics \
      --namespace AWS/RDS \
      --metric-name DatabaseConnections \
      --dimensions Name=DBInstanceIdentifier,Value="$db" \
      --start-time "$(date -u -d "$LOOKBACK_DAYS days ago" +%Y-%m-%dT%H:%M:%S)" \
      --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
      --period 86400 \
      --statistics Average \
      --query 'Datapoints[].Average' \
      --output text --region "$AWS_REGION" | awk '{sum+=$1; count++} END {print sum/count}')

    log_cost "RDS: $db - Avg CPU: ${cpu_avg}%, Avg Connections: $connections"

    if (( $(echo "$cpu_avg < 20" | bc -l) )); then
      log_success "Consider using smaller instance class"
    fi

    if (( $(echo "$connections < 10" | bc -l) )); then
      log_success "Very low connection count - consider Aurora Serverless"
    fi
  done
}

analyze_unused_ebs_volumes() {
  log_info "Finding unused EBS volumes..."

  local volumes=$(aws ec2 describe-volumes \
    --filters "Name=status,Values=available" \
    --query 'Volumes[].[VolumeId,Size,VolumeType]' \
    --output text --region "$AWS_REGION")

  local total_unused_gb=0

  if [[ -n "$volumes" ]]; then
    echo "$volumes" | while read -r vol_id size vol_type; do
      log_warning "Unused volume: $vol_id ($size GB, $vol_type)"
      total_unused_gb=$((total_unused_gb + size))

      # Estimate monthly cost (rough estimate)
      local monthly_cost=$(echo "$size * 0.10" | bc)
      log_cost "Estimated waste: \$${monthly_cost}/month"
      log_success "Delete this volume to save costs"
    done

    log_cost "Total unused EBS storage: ${total_unused_gb} GB"
  else
    log_info "No unused EBS volumes found"
  fi
}

analyze_unattached_eips() {
  log_info "Finding unattached Elastic IPs..."

  local eips=$(aws ec2 describe-addresses \
    --query "Addresses[?AssociationId==null].PublicIp" \
    --output text --region "$AWS_REGION")

  if [[ -n "$eips" ]]; then
    local count=$(echo "$eips" | wc -w)
    log_warning "Found $count unattached Elastic IPs"
    log_cost "Cost: \$${count}.00/month (approx)"
    log_success "Release these IPs to save \$${count}.00/month"

    echo "$eips" | tr ' ' '\n' | while read -r eip; do
      log_info "  - $eip"
    done
  else
    log_info "No unattached Elastic IPs found"
  fi
}

analyze_old_snapshots() {
  log_info "Finding old EBS snapshots..."

  local cutoff_date=$(date -u -d "90 days ago" +%Y-%m-%d)

  local snapshots=$(aws ec2 describe-snapshots \
    --owner-ids self \
    --query "Snapshots[?StartTime<'$cutoff_date'].[SnapshotId,VolumeSize,StartTime]" \
    --output text --region "$AWS_REGION")

  local total_size=0

  if [[ -n "$snapshots" ]]; then
    echo "$snapshots" | while read -r snap_id size start_time; do
      log_warning "Old snapshot: $snap_id ($size GB) from $start_time"
      total_size=$((total_size + size))
    done

    local monthly_cost=$(echo "$total_size * 0.05" | bc)
    log_cost "Total old snapshot storage: ${total_size} GB"
    log_cost "Estimated cost: \$${monthly_cost}/month"
    log_success "Consider deleting snapshots older than 90 days"
  else
    log_info "No old snapshots found"
  fi
}

analyze_s3_storage() {
  log_info "Analyzing S3 storage and lifecycle policies..."

  local buckets=$(aws s3api list-buckets \
    --query "Buckets[?contains(Name, '$PROJECT')].Name" \
    --output text --region "$AWS_REGION")

  for bucket in $buckets; do
    local size=$(aws cloudwatch get-metric-statistics \
      --namespace AWS/S3 \
      --metric-name BucketSizeBytes \
      --dimensions Name=BucketName,Value="$bucket" Name=StorageType,Value=StandardStorage \
      --start-time "$(date -u -d "2 days ago" +%Y-%m-%dT%H:%M:%S)" \
      --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
      --period 86400 \
      --statistics Average \
      --query 'Datapoints[0].Average' \
      --output text --region "$AWS_REGION")

    if [[ "$size" != "None" && -n "$size" ]]; then
      local size_gb=$(echo "$size / 1073741824" | bc)
      log_cost "S3 Bucket: $bucket - ${size_gb} GB"

      # Check if lifecycle policy exists
      if ! aws s3api get-bucket-lifecycle-configuration --bucket "$bucket" &>/dev/null; then
        log_success "No lifecycle policy found - consider adding one to reduce costs"
      fi

      # Check for versioning
      local versioning=$(aws s3api get-bucket-versioning \
        --bucket "$bucket" \
        --query 'Status' \
        --output text --region "$AWS_REGION")

      if [[ "$versioning" == "Enabled" ]]; then
        log_warning "Versioning enabled - may incur additional storage costs"
        log_success "Consider adding versioning lifecycle rules"
      fi
    fi
  done
}

analyze_unused_load_balancers() {
  log_info "Finding unused load balancers..."

  local lbs=$(aws elbv2 describe-load-balancers \
    --query "LoadBalancers[?contains(LoadBalancerName, '$PROJECT')].[LoadBalancerArn,LoadBalancerName]" \
    --output text --region "$AWS_REGION")

  if [[ -n "$lbs" ]]; then
    echo "$lbs" | while read -r lb_arn lb_name; do
      local request_count=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ApplicationELB \
        --metric-name RequestCount \
        --dimensions Name=LoadBalancer,Value="$(echo $lb_arn | sed 's/.*loadbalancer\///')" \
        --start-time "$(date -u -d "7 days ago" +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 604800 \
        --statistics Sum \
        --query 'Datapoints[0].Sum' \
        --output text --region "$AWS_REGION")

      if [[ "$request_count" == "0" || "$request_count" == "None" ]]; then
        log_warning "Load balancer $lb_name has no traffic"
        log_success "Consider deleting to save ~\$16/month"
      fi
    done
  fi
}

analyze_nat_gateway_usage() {
  log_info "Analyzing NAT Gateway usage..."

  local nat_gateways=$(aws ec2 describe-nat-gateways \
    --filter "Name=tag:Project,Values=$PROJECT" "Name=state,Values=available" \
    --query 'NatGateways[].NatGatewayId' \
    --output text --region "$AWS_REGION")

  for nat_id in $nat_gateways; do
    local bytes=$(aws cloudwatch get-metric-statistics \
      --namespace AWS/NATGateway \
      --metric-name BytesOutToSource \
      --dimensions Name=NatGatewayId,Value="$nat_id" \
      --start-time "$(date -u -d "$LOOKBACK_DAYS days ago" +%Y-%m-%dT%H:%M:%S)" \
      --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
      --period 2592000 \
      --statistics Sum \
      --query 'Datapoints[0].Sum' \
      --output text --region "$AWS_REGION")

    log_cost "NAT Gateway: $nat_id - Data processed: $bytes bytes"
    log_warning "NAT Gateways cost ~\$32/month + data processing fees"
    log_success "Consider using VPC endpoints for AWS services to reduce NAT costs"
  done
}

analyze_reserved_instance_coverage() {
  log_info "Analyzing Reserved Instance coverage..."

  local coverage=$(aws ce get-reservation-coverage \
    --time-period Start="$(date -u -d "$LOOKBACK_DAYS days ago" +%Y-%m-%d)",End="$(date -u +%Y-%m-%d)" \
    --granularity MONTHLY \
    --query 'CoveragesByTime[0].Total.CoverageHours.CoverageHoursPercentage' \
    --output text 2>/dev/null || echo "0")

  log_cost "Reserved Instance coverage: ${coverage}%"

  if (( $(echo "$coverage < 80" | bc -l) )); then
    log_success "Consider purchasing Reserved Instances to save up to 72% on compute costs"
  fi
}

analyze_cloudwatch_logs_retention() {
  log_info "Analyzing CloudWatch Logs retention..."

  local log_groups=$(aws logs describe-log-groups \
    --query "logGroups[?contains(logGroupName, '$PROJECT')].[logGroupName,storedBytes,retentionInDays]" \
    --output text --region "$AWS_REGION")

  if [[ -n "$log_groups" ]]; then
    echo "$log_groups" | while read -r log_group size retention; do
      local size_gb=$(echo "$size / 1073741824" | bc)

      if [[ "$retention" == "None" ]]; then
        log_warning "Log group $log_group has no retention policy (${size_gb} GB)"
        log_success "Set retention policy to reduce storage costs"
      elif [[ "$retention" -gt 90 ]]; then
        log_warning "Log group $log_group retention is $retention days (${size_gb} GB)"
        log_success "Consider reducing retention period if not required for compliance"
      fi
    done
  fi
}

# ─── Generate Report ─────────────────────────────────────────────────────────

generate_cost_report() {
  local report_file="$PROJECT_ROOT/cost-optimization-report.json"

  cat > "$report_file" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "project": "$PROJECT",
  "environment": "$ENVIRONMENT",
  "region": "$AWS_REGION",
  "lookback_days": $LOOKBACK_DAYS,
  "analysis_summary": "Cost optimization analysis complete"
}
EOF

  log_success "Cost optimization report saved to $report_file"
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
  log_info "═══════════════════════════════════════════════════════════"
  log_info "  AWS COST OPTIMIZATION ANALYZER"
  log_info "  Project: $PROJECT"
  log_info "  Environment: $ENVIRONMENT"
  log_info "  Region: $AWS_REGION"
  log_info "  Lookback: $LOOKBACK_DAYS days"
  log_info "═══════════════════════════════════════════════════════════"
  echo ""

  analyze_ec2_utilization
  echo ""

  analyze_rds_utilization
  echo ""

  analyze_unused_ebs_volumes
  echo ""

  analyze_unattached_eips
  echo ""

  analyze_old_snapshots
  echo ""

  analyze_s3_storage
  echo ""

  analyze_unused_load_balancers
  echo ""

  analyze_nat_gateway_usage
  echo ""

  analyze_reserved_instance_coverage
  echo ""

  analyze_cloudwatch_logs_retention
  echo ""

  generate_cost_report

  echo ""
  log_success "═══════════════════════════════════════════════════════════"
  log_success "  COST OPTIMIZATION ANALYSIS COMPLETE"
  log_success "═══════════════════════════════════════════════════════════"
}

main "$@"
