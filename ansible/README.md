# PetSwipe Ansible Automation

This repository contains Ansible playbooks and roles to automate the deployment of the petSwipe application infrastructure and services on AWS. It mirrors the steps in the original `aws/deploy.sh` script, managing RDS, S3, ECR, ALB, ECS/Fargate, and frontend static hosting.

![Ansible](https://img.shields.io/badge/ansible-2.10+-blue.svg)

## Prerequisites

- An AWS account with sufficient IAM permissions to create and manage:
  - RDS instances
  - S3 buckets
  - ECR repositories
  - ELB (Application Load Balancers) and Target Groups
  - ECS clusters, task definitions, and services
  - CloudFront distributions (optional)
- Ansible 2.10+ with the following collections installed:
  ```bash
  ansible-galaxy collection install community.aws community.docker
  ```

* AWS CLI v2 configured (`aws configure`) or appropriate environment variables set.
* `DB_PASSWORD` environment variable exported before running:

  ```bash
  export DB_PASSWORD='your_rds_master_password'
  ```

## Getting Started

1. **Clone this repo** (or your project root):

   ```bash
   git clone <your-repo-url>
   cd <your-repo-root>/ansible
   ```

2. **Edit group vars**
   Open `group_vars/all.yml` and fill in any placeholders:

- `aws_account_id`
- `default_sg_id`
- `alb_sg_id`
- (Optionally) `cf_distribution_id` for CloudFront invalidations.

3. **Verify inventory & config**
   By default, everything runs locally against AWS APIs (no remote hosts). Confirm:

- `inventory.ini` → uses `localhost`
- `ansible.cfg` → includes the needed collections

4. **Run the playbook**

   ```bash
   ansible-playbook playbook.yml
   ```

   This will execute the following roles, in order:

   1. **rds** – Create or update a PostgreSQL RDS instance
   2. **s3** – Ensure S3 buckets exist (static site + uploads)
   3. **ecr** – Create ECR repos, build & push Docker images
   4. **alb** – Provision an Application Load Balancer & Target Group
   5. **ecs** – Register ECS task definition & deploy service
   6. **frontend** – Build frontend, sync to S3, and optionally invalidate CloudFront

## Directory Structure

```
ansible/
├── ansible.cfg              # Ansible configuration
├── inventory.ini            # Local inventory
├── group_vars/
│   └── all.yml              # Global variables
├── playbook.yml             # Main orchestration playbook
└── roles/
    ├── rds/                 # RDS setup
    │   └── tasks/main.yml
    ├── s3/                  # S3 bucket setup
    │   └── tasks/main.yml
    ├── ecr/                 # ECR repos & Docker push
    │   └── tasks/main.yml
    ├── alb/                 # ALB & Target Group
    │   └── tasks/main.yml
    ├── ecs/                 # ECS cluster, task & service
    │   └── tasks/main.yml
    └── frontend/            # Frontend build & S3 sync
        └── tasks/main.yml
```

## Variables (`group_vars/all.yml`)

| Variable              | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `aws_region`          | AWS region to deploy into (e.g. `us-east-1`).            |
| `aws_account_id`      | Your AWS account ID.                                     |
| `project`             | Project name prefix (e.g. `petswipe`).                   |
| `db_name`             | RDS database name.                                       |
| `db_username`         | RDS master username.                                     |
| `db_password`         | RDS master password (pulled from `DB_PASSWORD` env var). |
| `default_sg_id`       | Security Group ID for RDS.                               |
| `static_bucket`       | S3 bucket for frontend static hosting.                   |
| `uploads_bucket`      | S3 bucket for user uploads.                              |
| `ecr_backend`         | Name of the backend ECR repo.                            |
| `ecr_frontend`        | Name of the frontend ECR repo.                           |
| `ecr_uri_backend`     | Full URI of backend ECR repo.                            |
| `ecr_uri_frontend`    | Full URI of frontend ECR repo.                           |
| `ecs_cluster`         | ECS cluster name.                                        |
| `ecs_service_backend` | ECS service name for the backend.                        |
| `task_role_arn`       | IAM role ARN for ECS task execution.                     |
| `alb_name`            | Application Load Balancer name.                          |
| `alb_sg_id`           | Security Group ID for ALB.                               |
| `subnet_ids`          | List of subnet IDs for ALB & ECS tasks (awsvpc).         |
| `tg_name`             | Target Group name.                                       |
| `cf_distribution_id`  | (Optional) CloudFront distribution ID for invalidations. |

## Tips

- **Idempotency**: All roles use `state: present` or `sync`, so re-running the playbook is safe.
- **Secrets**: Keep sensitive values out of Git. Use environment variables or Ansible Vault.
- **Debugging**: Append `-vvv` to your `ansible-playbook` command for detailed logs.

---

Happy deploying! 🚀
