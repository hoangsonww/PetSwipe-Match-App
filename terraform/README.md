# 🏗️ PetSwipe Terraform Infrastructure

Production-grade Infrastructure as Code for PetSwipe deployment on AWS with support for Blue-Green and Canary deployments.

This directory contains Terraform configurations and modules to bootstrap:
- **AWS ECS Fargate** with Blue-Green and Canary deployment strategies
- **Application Load Balancer** with weighted traffic routing
- **RDS PostgreSQL** with Multi-AZ and automated backups
- **CloudWatch** monitoring, dashboards, and alarms
- **HashiCorp Stack** (Consul, Nomad, Vault) - Optional
- **Security** (KMS, WAF, IAM roles, security groups)

---

## 📁 Layout

```
terraform/
├── Dockerfile               # Container for Terraform CLI
├── provider.tf              # Provider & backend configuration
├── main.tf                  # Core infrastructure (RDS, S3, ECR, ECS)
├── variables.tf             # Input variable definitions
├── outputs.tf               # Output values
├── ecs-blue-green.tf        # Blue-Green deployment configuration
├── ecs-canary.tf            # Canary deployment configuration
├── monitoring.tf            # CloudWatch dashboards and alarms
├── README.md                # This file
├── consul/                  # Consul cluster module (optional)
│   ├── variables.tf
│   ├── main.tf
│   └── outputs.tf
├── nomad/                   # Nomad cluster module (optional)
│   ├── variables.tf
│   ├── main.tf
│   └── outputs.tf
└── vault/                   # Vault cluster module (optional)
    ├── variables.tf
    ├── main.tf
    └── outputs.tf
```

---

## 🚀 Prerequisites

- **Terraform** v1.0+
- **AWS CLI v2** configured with credentials
- **Docker** (optional, for containerized Terraform)
- **VPC & Subnets** - Pre-existing VPC with public/private subnets
- **ACM Certificate** - SSL certificate for HTTPS (recommended)
- **Remote State Backend** - S3 + DynamoDB for state management

---

## 🛠️ Quickstart

### 1. Configure Variables

Create `terraform.tfvars`:

```hcl
# Required
project     = "petswipe"
environment = "production"
aws_region  = "us-east-1"

# Network (use your existing VPC)
vpc_id             = "vpc-xxxxx"
subnet_ids         = ["subnet-xxxxx", "subnet-yyyyy", "subnet-zzzzz"]
security_group_ids = ["sg-xxxxx"]

# Database
db_username         = "petswipe_admin"
db_password         = "your-secure-password-min-16-chars"
db_instance_class   = "db.t3.medium"
db_allocated_storage = 100

# SSL Certificate
acm_certificate_arn = "arn:aws:acm:us-east-1:xxxxx:certificate/xxxxx"

# Alerts
alert_email = "devops@petswipe.com"

# ECS
ecs_desired_count = 4
ecs_min_capacity  = 2
ecs_max_capacity  = 20
```

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

### 3. Plan Infrastructure

```bash
terraform plan -out=tfplan
```

### 4. Apply Infrastructure

```bash
terraform apply tfplan
```

This will provision:
- **ECS Cluster** with Blue/Green/Canary services
- **Application Load Balancer** with weighted routing
- **RDS PostgreSQL** with Multi-AZ and automated backups
- **ECR Repositories** for Docker images
- **S3 Buckets** for static assets and logs
- **CloudWatch** dashboards, alarms, and log groups
- **Lambda** function for canary auto-rollback
- **CodeDeploy** application for automated canary deployments
- **Optional:** Consul, Nomad, Vault clusters

---

## 📦 Modules & Components

### Core Infrastructure (`main.tf`)

- **RDS PostgreSQL**: Multi-AZ, automated backups, performance insights
- **S3 Buckets**: Static assets, uploads, ALB logs
- **ECR Repositories**: Backend and frontend container images
- **ECS Cluster**: Fargate-based container orchestration
- **KMS Keys**: Encryption for all resources
- **IAM Roles**: Task execution, monitoring, deployment

### Blue-Green Deployment (`ecs-blue-green.tf`)

- **Blue ECS Service**: Production environment
- **Green ECS Service**: Standby environment
- **Target Groups**: Blue and green traffic routing
- **ALB Listener**: Traffic switching capability
- **Auto-Scaling**: CPU/memory-based scaling for both environments
- **CloudWatch Alarms**: Health monitoring

### Canary Deployment (`ecs-canary.tf`)

- **Canary ECS Service**: New version deployment
- **Weighted Routing**: Progressive traffic shift (5% → 10% → 25% → 50% → 100%)
- **CodeDeploy**: Automated deployment orchestration
- **Lambda Function**: Automated rollback on failures
- **Health Alarms**: Error rate, latency, unhealthy hosts
- **SNS Topics**: Deployment notifications

### Monitoring (`monitoring.tf`)

- **CloudWatch Dashboards**: Main overview and canary-specific
- **Metric Alarms**: CPU, memory, latency, errors, database
- **Log Groups**: ECS, application, ALB access logs
- **X-Ray Tracing**: Distributed tracing (optional)
- **CloudWatch Insights**: Pre-configured log queries
- **SLI/SLO Metrics**: Availability and latency tracking

### HashiCorp Stack (Optional)

- **consul/**: Service discovery and configuration management
- **nomad/**: Workload orchestration alternative to ECS
- **vault/**: Secrets management and encryption

---

## 📝 Variables & Outputs

- **Root module** (`variables.tf` in top-level) holds common settings:

  - `aws_region`, `environment`, `tags`, remote‐state config, etc.

- **Module variables** live in each `*/variables.tf`.
- **All outputs** are declared in `*/outputs.tf` so you can reference them in downstream tooling.

---

## 🔄 Workflows & Tips

- **Targeted changes**

  ```bash
  # e.g. only update Vault
  terraform apply -target=module.vault
  ```

- **Environments**
  Use Terraform workspaces (e.g. `dev`, `staging`, `prod`) or duplicate the root directory with different backend configs.
- **Destroy**

  ```bash
  terraform destroy
  ```

- **State locking**
  Ensure your backend supports locking (DynamoDB for S3 backend).

---

## 🤝 Contributing

1. Create a feature branch
2. Lint & format your `.tf` files (`terraform fmt && terraform validate`)
3. Open a PR for review

---

Happy provisioning! 🚀
