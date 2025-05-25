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

#### 4) ECS & Fargate: deploy backend ####

if ! aws ecs describe-clusters --clusters $ECS_CLUSTER --query "clusters[0].status" --output text 2>/dev/null; then
  aws ecs create-cluster --cluster-name $ECS_CLUSTER
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
aws ecs register-task-definition --cli-input-json file://task-def.json

# Create or update service
if ! aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE_BACKEND \
   --query "services[0].status" --output text 2>/dev/null; then
  echo "🚀 Creating ECS service..."
  aws ecs create-service \
    --cluster $ECS_CLUSTER \
    --service-name $ECS_SERVICE_BACKEND \
    --task-definition ${PROJECT}-backend \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[### YOUR_SUBNET_IDS ###],securityGroups=[### YOUR_SG_ID ###],assignPublicIp=ENABLED}"
else
  echo "🔄 Updating ECS service..."
  aws ecs update-service --cluster $ECS_CLUSTER --service $ECS_SERVICE_BACKEND \
    --force-new-deployment
fi

#### 5) Frontend: sync to S3 + invalidate CloudFront ####

echo "📤 Uploading frontend static build to S3..."
npm --prefix ./frontend run build
aws s3 sync ./frontend/out s3://$STATIC_BUCKET --delete

if [ -n "$CF_DISTRIBUTION_ID" ]; then
  echo "🌐 Invalidating CloudFront distribution $CF_DISTRIBUTION_ID..."
  aws cloudfront create-invalidation --distribution-id $CF_DISTRIBUTION_ID \
    --paths "/*"
fi

echo "✅ Deployment complete!"
