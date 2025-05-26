#!/usr/bin/env bash
# aws/deploy.sh
set -euo pipefail

#### CONFIGURATION ####

AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROJECT=petswipe

# RDS
DB_INSTANCE_ID=${PROJECT}-db
DB_NAME=petswipe
DB_USERNAME=${DB_USERNAME:-admin}
DB_PASSWORD=${DB_PASSWORD:?Must set DB_PASSWORD}

# S3
STATIC_BUCKET=${PROJECT}-frontend-${AWS_ACCOUNT_ID}
UPLOADS_BUCKET=${PROJECT}-uploads-${AWS_ACCOUNT_ID}

# ECR
ECR_BACKEND=${PROJECT}-backend
ECR_FRONTEND=${PROJECT}-frontend
ECR_URI_BACKEND=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND}
ECR_URI_FRONTEND=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND}

# ECS
ECS_CLUSTER=${PROJECT}-cluster
ECS_SERVICE_BACKEND=${PROJECT}-backend-svc
TASK_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole"  # ### FILL THIS IN if different

# ALB
ALB_NAME=${PROJECT}-alb
ALB_SG_ID=${ALB_SG_ID:-### YOUR_ALB_SECURITY_GROUP_ID ###}
SUBNET_IDS=${SUBNET_IDS:-"subnet-aaa,subnet-bbb"}  # comma-separated list
TG_NAME=${PROJECT}-tg

# CloudFront (optional)
CF_DISTRIBUTION_ID=${CF_DISTRIBUTION_ID:-}  # leave blank first time

#### 1) RDS: create if not exists ####

if ! aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID >/dev/null 2>&1; then
  echo "⏳ Creating RDS instance $DB_INSTANCE_ID..."
  aws rds create-db-instance \
    --db-instance-identifier $DB_INSTANCE_ID \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --allocated-storage 20 \
    --db-name $DB_NAME \
    --master-username $DB_USERNAME \
    --master-user-password $DB_PASSWORD \
    --no-publicly-accessible \
    --vpc-security-group-ids $(aws ec2 describe-security-groups --filters Name=group-name,Values=default --query "SecurityGroups[0].GroupId" --output text) \
    --tags Key=Project,Value=$PROJECT

  echo "→ waiting for RDS to become available..."
  aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE_ID
fi

DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier $DB_INSTANCE_ID \
  --query "DBInstances[0].Endpoint.Address" --output text)

#### 2) S3: static + uploads buckets ####

for b in $STATIC_BUCKET $UPLOADS_BUCKET; do
  if ! aws s3api head-bucket --bucket $b 2>/dev/null; then
    echo "🪣 Creating S3 bucket $b..."
    aws s3api create-bucket \
      --bucket $b \
      --create-bucket-configuration LocationConstraint=$AWS_REGION \
      --region $AWS_REGION

    # For static site hosting only on the frontend bucket:
    if [ "$b" = "$STATIC_BUCKET" ]; then
      aws s3 website s3://$b --index-document index.html
    fi
  fi
done

#### 3) ECR: repos + push images ####

for repo in $ECR_BACKEND $ECR_FRONTEND; do
  if ! aws ecr describe-repositories --repository-names $repo >/dev/null 2>&1; then
    echo "📦 Creating ECR repository $repo..."
    aws ecr create-repository --repository-name $repo
  fi
done

echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

echo "🐳 Building & pushing backend image..."
docker build -t $ECR_URI_BACKEND:latest ./backend
docker push $ECR_URI_BACKEND:latest

echo "🐳 Building & pushing frontend image..."
docker build -t $ECR_URI_FRONTEND:latest ./frontend
docker push $ECR_URI_FRONTEND:latest

#### 4) ALB & Target Group (for backend) ####

# Create ALB if missing
if ! aws elbv2 describe-load-balancers --names $ALB_NAME >/dev/null 2>&1; then
  echo "⚖️  Creating Application Load Balancer $ALB_NAME..."
  aws elbv2 create-load-balancer \
    --name $ALB_NAME \
    --subnets $(echo $SUBNET_IDS | tr ',' ' ') \
    --security-groups $ALB_SG_ID \
    --scheme internet-facing \
    --type application \
    --region $AWS_REGION >/dev/null
fi

# Fetch ARNs
LB_ARN=$(aws elbv2 describe-load-balancers --names $ALB_NAME --query "LoadBalancers[0].LoadBalancerArn" --output text)
VPC_ID=$(aws ec2 describe-subnets --subnet-ids $(echo $SUBNET_IDS | cut -d',' -f1) --query "Subnets[0].VpcId" --output text)

# Create Target Group if missing
if ! aws elbv2 describe-target-groups --names $TG_NAME >/dev/null 2>&1; then
  echo "🛡️  Creating Target Group $TG_NAME..."
  aws elbv2 create-target-group \
    --name $TG_NAME \
    --protocol HTTP \
    --port 5001 \
    --vpc-id $VPC_ID \
    --health-check-protocol HTTP \
    --health-check-path "/" \
    --matcher HttpCode=200 \
    --region $AWS_REGION >/dev/null
fi

TG_ARN=$(aws elbv2 describe-target-groups --names $TG_NAME --query "TargetGroups[0].TargetGroupArn" --output text)

# Create listener on port 80 if missing
if ! aws elbv2 describe-listeners --load-balancer-arn $LB_ARN --query "Listeners[?Port==\`80\`]" >/dev/null 2>&1; then
  echo "🔊 Creating ALB listener on port 80..."
  aws elbv2 create-listener \
    --load-balancer-arn $LB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN \
    --region $AWS_REGION >/dev/null
fi

#### 5) ECS & Fargate: deploy backend ####

# Ensure cluster exists
if ! aws ecs describe-clusters --clusters $ECS_CLUSTER --query "clusters[0].status" --output text 2>/dev/null; then
  echo "🆕 Creating ECS cluster $ECS_CLUSTER..."
  aws ecs create-cluster --cluster-name $ECS_CLUSTER --region $AWS_REGION >/dev/null
fi

# Register task definition
cat > task-def.json <<EOF
{
  "family": "${PROJECT}-backend",
  "networkMode": "awsvpc",
  "executionRoleArn": "${TASK_ROLE_ARN}",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "${ECR_URI_BACKEND}:latest",
      "portMappings": [{ "containerPort": 5001, "hostPort": 5001 }],
      "environment": [
        { "name": "DB_HOST", "value": "${DB_ENDPOINT}" },
        { "name": "DB_NAME", "value": "${DB_NAME}" },
        { "name": "DB_USER", "value": "${DB_USERNAME}" },
        { "name": "DB_PASS", "value": "${DB_PASSWORD}" },
        { "name": "DB_SSL", "value": "false" }
      ]
    }
  ]
}
EOF

echo "🚚 Registering ECS task definition..."
aws ecs register-task-definition --cli-input-json file://task-def.json --region $AWS_REGION >/dev/null

# Create or update service behind the ALB
if ! aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE_BACKEND \
     --query "services[0].status" --output text 2>/dev/null; then
  echo "🚀 Creating ECS service with ALB integration..."
  aws ecs create-service \
    --cluster $ECS_CLUSTER \
    --service-name $ECS_SERVICE_BACKEND \
    --task-definition ${PROJECT}-backend \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${ALB_SG_ID}],assignPublicIp=DISABLED}" \
    --load-balancers "[{\"targetGroupArn\":\"${TG_ARN}\",\"containerName\":\"backend\",\"containerPort\":5001}]" \
    --region $AWS_REGION
else
  echo "🔄 Updating ECS service (force new deployment)..."
  aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $ECS_SERVICE_BACKEND \
    --force-new-deployment \
    --load-balancers "[{\"targetGroupArn\":\"${TG_ARN}\",\"containerName\":\"backend\",\"containerPort\":5001}]" \
    --region $AWS_REGION
fi

#### 6) Frontend: sync to S3 + invalidate CloudFront ####

echo "📤 Uploading frontend static build to S3..."
npm --prefix ./frontend run build
aws s3 sync ./frontend/out s3://$STATIC_BUCKET --delete --region $AWS_REGION

if [ -n "$CF_DISTRIBUTION_ID" ]; then
  echo "🌐 Invalidating CloudFront distribution $CF_DISTRIBUTION_ID..."
  aws cloudfront create-invalidation \
    --distribution-id $CF_DISTRIBUTION_ID \
    --paths "/*" \
    --region $AWS_REGION >/dev/null
fi

echo "✅ Deployment complete!"
