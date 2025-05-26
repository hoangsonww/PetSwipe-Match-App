#!/usr/bin/env bash
# aws-alb.sh
set -euo pipefail

#### CONFIGURATION ####

AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

PROJECT=petswipe

# ALB settings
ALB_NAME=${PROJECT}-alb
ALB_SCHEME="internet-facing"               # or "internal"
ALB_TYPE="application"                      # application | network
SUBNET_IDS=${SUBNET_IDS:-"subnet-aaa,subnet-bbb"}  # comma-separated
ALB_SG_ID=${ALB_SG_ID:-### YOUR_ALB_SG_ID ###}

# Target Group settings
TG_NAME=${PROJECT}-tg
TARGET_PROTOCOL="HTTP"
TARGET_PORT=${TARGET_PORT:-5001}
HEALTH_CHECK_PATH=${HEALTH_CHECK_PATH:-"/"}
HEALTH_CHECK_PROTOCOL=${HEALTH_CHECK_PROTOCOL:-HTTP}
HEALTHY_HTTP_CODES=${HEALTHY_HTTP_CODES:-200}

#### 1) Create (or fetch) ALB ####

echo "🔍 Checking for existing ALB named '$ALB_NAME'..."
if ! aws elbv2 describe-load-balancers --names "$ALB_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "⚖️  Creating ALB '$ALB_NAME'..."
  aws elbv2 create-load-balancer \
    --name "$ALB_NAME" \
    --subnets $(echo "$SUBNET_IDS" | tr ',' ' ') \
    --security-groups "$ALB_SG_ID" \
    --scheme "$ALB_SCHEME" \
    --type "$ALB_TYPE" \
    --region "$AWS_REGION" \
    --output text
else
  echo "✅ ALB '$ALB_NAME' already exists."
fi

ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names "$ALB_NAME" \
  --region "$AWS_REGION" \
  --query "LoadBalancers[0].LoadBalancerArn" \
  --output text)

#### 2) Create (or fetch) Target Group ####

# Determine VPC from first subnet
VPC_ID=$(aws ec2 describe-subnets \
  --subnet-ids $(echo "$SUBNET_IDS" | cut -d',' -f1) \
  --region "$AWS_REGION" \
  --query "Subnets[0].VpcId" \
  --output text)

echo "🔍 Checking for existing Target Group named '$TG_NAME'..."
if ! aws elbv2 describe-target-groups --names "$TG_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "🛡️  Creating Target Group '$TG_NAME'..."
  aws elbv2 create-target-group \
    --name "$TG_NAME" \
    --protocol "$TARGET_PROTOCOL" \
    --port "$TARGET_PORT" \
    --vpc-id "$VPC_ID" \
    --health-check-protocol "$HEALTH_CHECK_PROTOCOL" \
    --health-check-path "$HEALTH_CHECK_PATH" \
    --matcher "HttpCode=$HEALTHY_HTTP_CODES" \
    --region "$AWS_REGION" \
    --output text
else
  echo "✅ Target Group '$TG_NAME' already exists."
fi

TG_ARN=$(aws elbv2 describe-target-groups \
  --names "$TG_NAME" \
  --region "$AWS_REGION" \
  --query "TargetGroups[0].TargetGroupArn" \
  --output text)

#### 3) Create HTTP Listener on port 80 ####

echo "🔍 Checking for a port-80 listener on ALB '$ALB_NAME'..."
if ! aws elbv2 describe-listeners \
      --load-balancer-arn "$ALB_ARN" \
      --region "$AWS_REGION" \
      --query "Listeners[?Port==\`80\`]" \
      | grep -q Port; then

  echo "🔊 Creating HTTP listener on port 80 forwarding to '$TG_NAME'..."
  aws elbv2 create-listener \
    --load-balancer-arn "$ALB_ARN" \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn="$TG_ARN" \
    --region "$AWS_REGION" >/dev/null
else
  echo "✅ Port-80 listener already exists on '$ALB_NAME'."
fi

#### 4) Output ARNs & DNS ####

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "$ALB_ARN" \
  --region "$AWS_REGION" \
  --query "LoadBalancers[0].DNSName" \
  --output text)

cat <<EOF

🏁 Done.

ALB Name:           $ALB_NAME
ALB ARN:            $ALB_ARN
ALB DNS:            $ALB_DNS

Target Group Name:  $TG_NAME
Target Group ARN:   $TG_ARN
Target Port:        $TARGET_PORT

Use the above Target Group ARN in your ECS service’s
  --load-balancers "[{ \"targetGroupArn\":\"$TG_ARN\", \"containerName\":\"backend\", \"containerPort\":$TARGET_PORT }]"
flag.

EOF
