# AWS Deployment Configuration

This directory contains AWS deployment configurations for the Agentic AI pipeline.

## Deployment Options

### 1. ECS Fargate (Recommended for Production)
- Fully managed container orchestration
- Auto-scaling capabilities
- High availability
- Cost-effective for sustained workloads

### 2. Lambda Functions
- Serverless deployment
- Pay-per-use pricing
- Auto-scaling
- Best for event-driven workloads

### 3. EKS (Kubernetes)
- Full Kubernetes control
- Best for complex microservices
- Advanced orchestration features

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform installed (v1.0+)
- Docker installed
- Python 3.9+

## Quick Start

### Using Terraform

```bash
cd aws/terraform
terraform init
terraform plan
terraform apply
```

### Using CloudFormation

```bash
aws cloudformation create-stack \
  --stack-name agentic-ai-stack \
  --template-body file://cloudformation/ecs-deployment.yml \
  --capabilities CAPABILITY_IAM
```

## Environment Variables

Required environment variables:

```bash
export AWS_REGION=us-east-1
export OPENAI_API_KEY=your_api_key
export AWS_ACCOUNT_ID=your_account_id
```

## Monitoring

- CloudWatch Logs: `/aws/ecs/agentic-ai`
- CloudWatch Metrics: Custom namespace `AgenticAI`
- X-Ray tracing enabled for distributed tracing
