# DevOps & CI/CD Comprehensive Guide

## Table of Contents

- [Overview](#overview)
- [Infrastructure Architecture](#infrastructure-architecture)
- [CI/CD Pipelines](#cicd-pipelines)
- [Deployment Strategies](#deployment-strategies)
- [Monitoring & Observability](#monitoring--observability)
- [Security & Compliance](#security--compliance)
- [Disaster Recovery](#disaster-recovery)
- [Cost Optimization](#cost-optimization)
- [Operations Runbooks](#operations-runbooks)

## Overview

This document provides comprehensive guidance on the DevOps practices, CI/CD pipelines, and infrastructure management for the PetSwipe application.

### Key Features

- **Multi-Region Deployment**: Primary (us-east-1) and DR (us-west-2) regions
- **Zero-Downtime Deployments**: Blue-green and canary strategies
- **Comprehensive Monitoring**: CloudWatch, Prometheus, Grafana, OpenTelemetry
- **Advanced Security**: WAF, GuardDuty, Security Hub, Config Rules
- **Automated Disaster Recovery**: Automated backups, cross-region replication
- **Cost Optimization**: Automated analysis and recommendations
- **Chaos Engineering**: Resilience testing and validation

## Infrastructure Architecture

### Terraform Modules

```
terraform/
├── main.tf                 # Main infrastructure configuration
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── provider.tf             # AWS provider configuration
├── monitoring.tf           # CloudWatch, dashboards, alarms
├── observability.tf        # Prometheus, Grafana, OpenTelemetry
├── security.tf             # WAF, GuardDuty, Security Hub, Config
├── disaster-recovery.tf    # Backups, replication, DR automation
├── ecs-blue-green.tf       # Blue-green deployment infrastructure
└── ecs-canary.tf           # Canary deployment infrastructure
```

### Key Infrastructure Components

#### 1. **Compute**
- ECS Fargate for containerized applications
- Auto-scaling policies (CPU/Memory based)
- Blue/Green/Canary environments

#### 2. **Database**
- RDS PostgreSQL with Multi-AZ
- Read replicas in DR region
- Automated backups (hourly, daily, weekly, monthly)

#### 3. **Networking**
- VPC with public/private subnets across 3 AZs
- Application Load Balancer with HTTPS
- CloudFront for CDN
- NAT Gateways for private subnet egress

#### 4. **Storage**
- S3 with versioning and lifecycle policies
- Cross-region replication to DR region
- EFS for shared storage (Prometheus, Grafana)

#### 5. **Security**
- AWS WAF with managed rule sets
- KMS encryption for data at rest
- Secrets Manager for credentials
- GuardDuty for threat detection
- Security Hub for compliance

## CI/CD Pipelines

### Available Pipelines

#### 1. **Jenkinsfile.ci** (Standard CI/CD)
Basic CI/CD pipeline with testing and deployment options.

**Stages:**
- Preflight Setup
- Lint & Format
- Security & License Scan
- Backend/Frontend Tests
- E2E Tests (Playwright)
- Build & Push Docker Images
- Image Security Scan
- Performance Benchmark
- Deployment Strategy Selection

**Usage:**
```bash
# Trigger via Jenkins
# Manual deployment strategy selection
```

#### 2. **Jenkinsfile.bluegreen** (Blue-Green Deployment)
Zero-downtime deployment with instant rollback.

**Stages:**
- Preflight Checks
- Lint & Test (Parallel)
- Security Scan (Parallel)
- Build Docker Images
- Image Security Scan
- Push to ECR
- Deploy to Inactive Environment
- Integration Tests
- Load Testing
- Manual Approval
- Traffic Switch
- Post-Deployment Monitoring

**Usage:**
```bash
# Configure job to use Jenkinsfile.bluegreen
# Automatic traffic switching with manual approval gate
```

#### 3. **Jenkinsfile.canary** (Canary Deployment)
Gradual traffic shifting with automated rollback.

**Stages:**
- Preflight Checks
- Lint & Test
- Security & Compliance
- Build & Scan
- Deploy Canary stages: 5% → 10% → 25% → 50% → 100%
- Monitor each stage
- Automated rollback on errors
- Post-Deployment Verification

**Usage:**
```bash
# Configure job to use Jenkinsfile.canary
# Automated gradual rollout with health monitoring
```

#### 4. **Jenkinsfile.advanced** (Advanced Pipeline)
Enterprise-grade pipeline with parallel execution, caching, and optimization.

**Features:**
- Kubernetes-based agents
- Dependency caching
- Matrix builds (browsers, viewports)
- Parallel test sharding
- SonarQube integration
- Multiple security scanners
- Performance testing
- Accessibility testing
- Multi-region deployment

**Usage:**
```bash
# Configure job to use Jenkinsfile.advanced
# Recommended for production deployments
```

## Deployment Strategies

### 1. Blue-Green Deployment

**When to Use:**
- Production deployments requiring instant rollback
- Critical releases with zero-downtime requirement
- When you need to test in production before switching traffic

**Process:**
```bash
# Automated via Jenkins
./scripts/blue-green-deploy.sh

# Manual steps:
export AWS_REGION=us-east-1
export PROJECT=petswipe
export ENVIRONMENT=production
export IMAGE_TAG=v1.2.3
export AUTO_PROMOTE=false

./scripts/blue-green-deploy.sh
```

**Architecture:**
```
Load Balancer
├── Blue Environment (Active) - 100% traffic
└── Green Environment (Inactive) - 0% traffic

After Deployment:
├── Blue Environment (Inactive) - 0% traffic
└── Green Environment (Active) - 100% traffic
```

### 2. Canary Deployment

**When to Use:**
- Risk mitigation for new features
- Gradual rollout to detect issues early
- A/B testing scenarios

**Process:**
```bash
./scripts/canary-deploy.sh

# Configuration
export CANARY_STAGES=5,10,25,50,100
export STAGE_DURATION=300  # 5 minutes per stage
export ERROR_THRESHOLD=5.0  # Max 5% error rate
export AUTO_PROMOTE=true
```

**Traffic Distribution:**
```
Stage 1: Blue 95% | Canary 5%   → Monitor 5min
Stage 2: Blue 90% | Canary 10%  → Monitor 5min
Stage 3: Blue 75% | Canary 25%  → Monitor 5min
Stage 4: Blue 50% | Canary 50%  → Monitor 5min
Stage 5: Blue 0%  | Canary 100% → Complete
```

### 3. Rolling Deployment

Standard ECS rolling update with deployment circuit breaker for automatic rollback.

## Monitoring & Observability

### CloudWatch

**Dashboards:**
- `petswipe-production-overview`: Main operational dashboard
- `petswipe-production-sre`: SRE golden signals
- `petswipe-production-canary-deployment`: Canary monitoring

**Key Metrics:**
- **Latency**: Average, P50, P95, P99 response times
- **Traffic**: Request count, requests per second
- **Errors**: 4XX, 5XX error rates, error percentage
- **Saturation**: CPU, memory, connections

**Alarms:**
- ALB unhealthy hosts
- High latency (> 2 seconds)
- 5XX error rate (> 50 errors/minute)
- RDS CPU high (> 80%)
- RDS free storage low (< 10GB)

### Prometheus & Grafana

**Deployment:**
```bash
# Deploy via Terraform
cd terraform
terraform apply -target=aws_ecs_service.prometheus
terraform apply -target=aws_ecs_service.grafana
```

**Access:**
```bash
# Get Grafana URL
aws elbv2 describe-target-groups \
  --names petswipe-production-grafana-tg \
  --query 'TargetGroups[0].LoadBalancerArns' \
  --output text

# Default credentials stored in Secrets Manager
```

**Pre-configured Dashboards:**
- Application Performance
- Infrastructure Health
- Business Metrics
- Custom Application Metrics

### OpenTelemetry

**Integration:**
```javascript
// Backend instrumentation (Node.js)
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector.petswipe.local:4317',
  }),
});

sdk.start();
```

### CloudWatch Synthetics

Automated canary tests running every 5 minutes:
- API health checks
- End-to-end user flows
- Performance baselines

## Security & Compliance

### Security Scanning

#### 1. **Infrastructure Security**
```bash
# Run comprehensive infrastructure tests
./scripts/infrastructure-test.sh

# Individual scans
tfsec terraform/               # Terraform security
checkov -d terraform/          # Policy-as-code
terrascan scan -t aws          # Compliance scanning
```

#### 2. **Container Security**
```bash
# Trivy image scanning
trivy image ghcr.io/user/petswipe-app-backend:latest

# In CI/CD (automatic)
# Scans run in Jenkins pipeline stage: Image Scan
```

#### 3. **Secret Detection**
```bash
# Gitleaks
gitleaks detect --source . --verbose

# TruffleHog (Docker-based)
docker run --rm -v $(pwd):/scan trufflesecurity/trufflehog:latest filesystem /scan
```

### Compliance

**AWS Config Rules:**
- Encrypted volumes required
- RDS encryption enabled
- S3 buckets not publicly accessible
- IAM password policy compliance

**Security Hub Standards:**
- CIS AWS Foundations Benchmark v1.4.0
- PCI DSS v3.2.1
- AWS Foundational Security Best Practices

### Access Control

**IAM Roles:**
- ECS Task Execution Role (minimal permissions)
- ECS Task Role (application permissions)
- Lambda Execution Roles (scoped to function needs)
- Service-specific roles (Backup, Config, Flow Logs)

**Secrets Management:**
```bash
# Retrieve database credentials
aws secretsmanager get-secret-value \
  --secret-id petswipe-production-db-credentials \
  --query 'SecretString' \
  --output text | jq -r '.password'

# Rotation: Automatic every 30 days
```

## Disaster Recovery

### RTO/RPO Targets

| Tier | RTO | RPO | Strategy |
|------|-----|-----|----------|
| Database | 15 min | 1 hour | Automated snapshot restore |
| Application | 5 min | 0 min | Multi-region active-passive |
| Storage | 15 min | 15 min | Cross-region replication |

### Backup Strategy

**Automated Backups:**
- **Hourly**: Retained for 7 days
- **Daily**: Retained for 30 days, replicated to DR region
- **Weekly**: Retained for 90 days, replicated to DR region
- **Monthly**: Retained for 365 days, replicated to DR region

**Backup Verification:**
```bash
# List recent backups
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name petswipe-production-backup-vault

# Test restore (DR drill)
aws backup start-restore-job \
  --recovery-point-arn <arn> \
  --metadata <restore-config>
```

### Disaster Recovery Procedures

#### Automated Failover

CloudWatch alarm triggers Lambda function for automated failover:

```bash
# Manual trigger (if needed)
aws lambda invoke \
  --function-name petswipe-production-dr-failover \
  --payload '{"trigger":"manual","reason":"DR drill"}' \
  response.json
```

#### Manual Failover Steps

1. **Promote Read Replica:**
```bash
aws rds promote-read-replica \
  --db-instance-identifier petswipe-production-postgres-replica \
  --region us-west-2
```

2. **Update DNS:**
```bash
# Route53 health check will auto-failover
# Or manual update:
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch file://failover-dns.json
```

3. **Scale Up DR Services:**
```bash
aws ecs update-service \
  --cluster petswipe-production-cluster \
  --service petswipe-production-blue \
  --desired-count 4 \
  --region us-west-2
```

## Cost Optimization

### Automated Analysis

```bash
# Run cost optimization analyzer
./scripts/cost-optimization.sh

# Generates report: cost-optimization-report.json
```

**Analysis Areas:**
- Under-utilized EC2 instances
- Under-utilized RDS databases
- Unused EBS volumes
- Unattached Elastic IPs
- Old EBS snapshots (> 90 days)
- S3 storage optimization
- Unused load balancers
- NAT Gateway usage
- Reserved Instance coverage
- CloudWatch Logs retention

### Cost-Saving Recommendations

1. **Compute:**
   - Use Fargate Spot for non-critical workloads (70% savings)
   - Right-size ECS tasks based on utilization
   - Purchase Savings Plans for predictable workloads

2. **Database:**
   - Consider Aurora Serverless for variable workloads
   - Use read replicas efficiently
   - Schedule non-production environments

3. **Storage:**
   - Implement S3 lifecycle policies
   - Use Intelligent-Tiering for unknown access patterns
   - Delete old snapshots and unused volumes

4. **Networking:**
   - Use VPC endpoints for AWS services (reduce NAT costs)
   - Consolidate NAT Gateways
   - Enable CloudFront for static content

## Operations Runbooks

### Database Migrations

```bash
# Run database migration
./scripts/database-migration.sh

# With environment override
ENVIRONMENT=staging DRY_RUN=false ./scripts/database-migration.sh

# Rollback
# Script will prompt for rollback on validation failure
```

**Process:**
1. Pre-flight checks
2. Create RDS snapshot
3. Run migrations
4. Validate migration
5. Rollback if validation fails

### Chaos Engineering

```bash
# Run chaos experiments
./scripts/chaos-engineering.sh <experiment>

# Available experiments:
# - kill-task: Terminate random ECS task
# - cpu-stress: Inject CPU pressure
# - network-latency: Add network latency
# - dependency-failure: Simulate DB failure
# - az-failure: Simulate AZ outage
# - scaling-shock: Traffic spike
# - deployment-rollback: Failed deployment
# - all: Run all experiments

# Example:
DRY_RUN=false ENVIRONMENT=staging ./scripts/chaos-engineering.sh kill-task
```

### Infrastructure Testing

```bash
# Run comprehensive infrastructure tests
./scripts/infrastructure-test.sh

# Tests include:
# - Terraform formatting and validation
# - Security scanning (tfsec, checkov, terrascan)
# - Cost estimation
# - Drift detection
# - Tag compliance
# - Secret detection
# - Encryption validation
# - Backup configuration
```

### Incident Response

#### 1. High Error Rate

```bash
# Check recent errors
aws logs filter-log-events \
  --log-group-name /aws/application/petswipe-production \
  --filter-pattern "ERROR" \
  --start-time $(date -d '10 minutes ago' +%s000)

# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn <tg-arn>

# Rollback if needed
# Blue-green: Switch traffic back
aws elbv2 modify-listener \
  --listener-arn <listener-arn> \
  --default-actions Type=forward,TargetGroupArn=<previous-tg-arn>
```

#### 2. Database Issues

```bash
# Check RDS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=petswipe-production-postgres \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Check slow queries
# Connect to RDS and run:
# SELECT * FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';
```

#### 3. Performance Degradation

```bash
# Check ECS task metrics
aws ecs describe-services \
  --cluster petswipe-production-cluster \
  --services petswipe-production-blue

# Check if auto-scaling is responding
aws application-autoscaling describe-scaling-activities \
  --service-namespace ecs
```

### Scaling Operations

**Manual Scaling:**
```bash
# Scale ECS service
aws ecs update-service \
  --cluster petswipe-production-cluster \
  --service petswipe-production-blue \
  --desired-count 10

# Scale RDS (requires restart)
aws rds modify-db-instance \
  --db-instance-identifier petswipe-production-postgres \
  --db-instance-class db.t3.large \
  --apply-immediately
```

**Auto-Scaling Configuration:**
- CPU Target: 70%
- Memory Target: 80%
- Min Capacity: 2 tasks
- Max Capacity: 20 tasks
- Scale Out Cooldown: 60 seconds
- Scale In Cooldown: 300 seconds

## Best Practices

### Development Workflow

1. **Local Development:**
   - Use Docker Compose for local environment
   - Run tests before committing
   - Use pre-commit hooks

2. **Pull Requests:**
   - All PRs trigger CI pipeline
   - Require passing tests
   - Require security scan pass
   - Code review required

3. **Deployment:**
   - Merge to master triggers deployment pipeline
   - Staging deployment automatic
   - Production requires approval
   - Monitor post-deployment

### Monitoring

1. **Set up alerts for:**
   - Error rate > 1%
   - P99 latency > 2 seconds
   - CPU utilization > 85%
   - Unhealthy target count > 0

2. **Review dashboards daily:**
   - Check for anomalies
   - Verify SLO compliance
   - Monitor cost trends

3. **Weekly reviews:**
   - Review incidents
   - Update runbooks
   - Optimize based on metrics

### Security

1. **Regular audits:**
   - Weekly: Run security scans
   - Monthly: Review IAM permissions
   - Quarterly: Penetration testing
   - Annually: Compliance audit

2. **Incident response:**
   - Document all incidents
   - Post-mortem for major incidents
   - Update runbooks
   - Share learnings

## Troubleshooting

### Common Issues

**Issue: Deployment stuck**
```bash
# Check ECS deployment status
aws ecs describe-services --cluster <cluster> --services <service>

# Check task status
aws ecs list-tasks --cluster <cluster> --service-name <service>
aws ecs describe-tasks --cluster <cluster> --tasks <task-arn>

# Check logs
aws logs tail /ecs/petswipe-production --follow
```

**Issue: High latency**
```bash
# Check database connections
# Check cache hit rate
# Review CloudWatch metrics
# Check X-Ray traces
```

**Issue: Failed health checks**
```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn <arn>

# Check container logs
aws logs get-log-events --log-group-name <group> --log-stream-name <stream>

# Verify security group rules
# Verify container health check configuration
```

## Support & Resources

- **Documentation**: `/docs`
- **Runbooks**: `/docs/runbooks`
- **Architecture Diagrams**: `/docs/architecture`
- **Incident Response**: `/docs/incident-response`

---

**Last Updated**: $(date +%Y-%m-%d)
**Version**: 2.0
**Maintained By**: DevOps Team
