# AWS Utilities

This directory contains a collection of scripts, Docker setup, and helper code to provision and manage your AWS resources for the petSwipe project. You can use them standalone or via the top-level `deploy.sh` (or the Makefile) to automate your entire infrastructure.

![AWS](https://img.shields.io/badge/aws-CLI%20v2+-blue.svg)
![Docker](https://img.shields.io/badge/docker-20.10+-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-14+-blue.svg)

---

## 🛠️ Prerequisites

- **AWS CLI v2** installed and configured (`aws configure`)
- **Docker** (for building/pushing images)
- **Node.js** (for running the JS helpers)
- **Make** (optional — to invoke grouped targets)
- **jq** (optional — for JSON parsing in scripts)
- Environment variables:
  - `AWS_REGION` (defaults to `us-east-1`)
  - `AWS_ACCOUNT_ID` (you can also let scripts discover it via `aws sts`)
  - `DB_PASSWORD` (RDS master user password)
  - `ALB_SG_ID` (security group for the ALB)
  - `SUBNET_IDS` (comma-separated subnet IDs for ALB & ECS)
  - `CF_DISTRIBUTION_ID` (optional; for CloudFront invalidation)

---

## 📁 Directory Contents

| File / Folder      | Description                                                                  |
| ------------------ | ---------------------------------------------------------------------------- |
| `deploy.sh`        | Orchestrates a full end-to-end deploy: RDS → S3 → ECR → ALB → ECS → Frontend |
| `aws-alb.sh`       | Create/update Application Load Balancer & Target Group                       |
| `ecr-tools.sh`     | Create ECR repos, log in, build & push Docker images                         |
| `ecs-utils.sh`     | Create/update ECS cluster, task definitions & services                       |
| `rds-ops.sh`       | Create/post-create-wait for PostgreSQL RDS instance                          |
| `s3-lifecycle.sh`  | Apply S3 lifecycle rules (e.g. auto-expire old uploads)                      |
| `Makefile`         | High-level targets (`make all`, `make deploy`, `make rds`, etc.)             |
| `Dockerfile`       | Defines a container image for running these scripts in a consistent env      |
| `aws.js`           | Node.js helper module for generic AWS SDK operations                         |
| `aws-messaging.js` | Node.js helper module for SQS/SNS messaging tasks                            |

---

## ⚙️ Usage

### 1. Environment

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=123456789012
export DB_PASSWORD='SuperSecret!'
export ALB_SG_ID=sg-0abc1234def567890
export SUBNET_IDS='subnet-aaa,subnet-bbb'
# (optionally)
export CF_DISTRIBUTION_ID=E1ABCDEF2GHIJ
```

### 2. Run via Make

```bash
cd aws/
make all         # runs full deploy (same as ./deploy.sh)
make rds         # runs only rds-ops.sh
make s3-lifecycle
make ecr         # create ECR repos & push images
make alb         # set up ALB & target group
make ecs         # deploy ECS service
```

### 3. Or run scripts directly

```bash
./deploy.sh
./rds-ops.sh
./s3-lifecycle.sh
./ecr-tools.sh
./aws-alb.sh
./ecs-utils.sh
```

### 4. Use the Node.js helpers

If you need to invoke AWS SDK calls directly in JS:

```bash
node aws.js
node aws-messaging.js
```

---

## 📘 Scripts in Detail

### `deploy.sh`

- Sets `-euo pipefail`
- Provisions RDS, S3 buckets, ECR repos, ALB, ECS/Fargate service, then syncs & invalidates CloudFront.

### `rds-ops.sh`

- Checks for an existing RDS instance.
- Creates it if missing (`db.t3.micro`, PostgreSQL, 20 GB).
- Waits until it’s available.

### `s3-lifecycle.sh`

- Creates or updates lifecycle rules on your uploads bucket (e.g. auto-expire temp files).

### `ecr-tools.sh`

- Ensures backend/frontend ECR repositories exist.
- Logs into ECR.
- (Optionally) tags & pushes local Docker images.

### `aws-alb.sh`

- Creates an Application Load Balancer (if missing).
- Creates a Target Group on port 5001.
- Attaches an HTTP listener on port 80.

### `ecs-utils.sh`

- Ensures an ECS cluster exists.
- Registers/updates the Fargate task definition.
- Creates or updates the ECS service (behind the ALB).

### `Dockerfile`

- Base image with AWS CLI, Docker (and any other runtime dependencies).
- Use to build a containerized “CI” environment for these scripts.

---

> [!NOTE] > **Tip:** keep sensitive values (like `DB_PASSWORD`) out of version control. Consider using \[Ansible Vault], AWS Secrets Manager, or environment-specific CI variables.

---

Happy deploying! 🚀
