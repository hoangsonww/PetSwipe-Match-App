#!/usr/bin/env bash
# aws/ecs-utils.sh
set -euo pipefail

AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROJECT=petswipe
CLUSTER="${PROJECT}-cluster"
SERVICE="${PROJECT}-backend-svc"
LOG_GROUP="/ecs/${PROJECT}-backend"

function scale() {
  local desired=$1
  echo "🚀 Scaling ECS service to $desired tasks..."
  aws ecs update-service \
    --cluster "$CLUSTER" \
    --service "$SERVICE" \
    --desired-count "$desired"
}

function logs() {
  echo "📜 Tailing CloudWatch logs for $LOG_GROUP (press Ctrl+C to stop)"
  aws logs tail --follow "$LOG_GROUP"
}

case "${1:-}" in
  scale)
    scale "${2:?Usage: $0 scale <count>}"
    ;;
  logs)
    logs
    ;;
  *)
    echo "Usage: $0 {scale <count>|logs}"
    exit 1
    ;;
esac
