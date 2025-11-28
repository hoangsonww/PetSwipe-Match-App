# --------------------------------------------------------------------------------------------
#
# Project-wide Makefile for PetSwipe App
#
# PetSwipe is a web application that allows users to swipe through pets available for adoption.
# It is built with a Node.js backend and a React frontend, using Docker for containerization.
# The project is designed to be easily deployable to AWS and includes CI/CD pipelines for automated
# testing and deployment.
#
# This Makefile is used to define common tasks for the project.
# It provides a convenient way to run commands and manage the project.
# It is not intended to be used as a build system, but rather as a helper for common tasks.
# The Makefile is designed to be used with GNU Make.
#
# Prerequisites:
# - Make (https://www.gnu.org/software/make/)
# - Node.js (https://nodejs.org/)
# - Docker (https://www.docker.com/)
# - Docker Compose (https://docs.docker.com/compose/)
# - AWS CLI (https://aws.amazon.com/cli/)
# - GitHub CLI (https://cli.github.com/)
# - Concurrently
#
# Usage:
#   Development Commands:
#     make dev               # start backend & frontend in dev mode
#     make build-backend     # install & build the backend
#     make build-frontend    # install & build the frontend
#
#   Docker Commands:
#     make docker-build      # build & push images to GHCR
#     make docker-pull       # pull images & start stack via Docker Compose
#     make up                # alias for docker-pull
#     make down              # docker-compose down
#
#   Testing & Quality:
#     make test              # run unit tests
#     make lint              # run linters
#     make load-test         # run k6 load tests
#     make infra-test        # run Terratest infrastructure tests
#     make security-scan     # run security scanning
#     make policy-validate   # validate OPA policies
#
#   Infrastructure & Deployment:
#     make tf-init           # initialize Terraform
#     make tf-plan           # run Terraform plan
#     make tf-apply          # apply Terraform changes
#     make tf-destroy        # destroy Terraform infrastructure
#     make deploy            # deploy to AWS
#     make deploy-blue-green # blue-green deployment
#     make deploy-canary     # canary deployment
#
#   Database & Migrations:
#     make db-migrate        # run database migrations
#     make db-rollback       # rollback last migration
#     make db-backup         # create database backup
#     make db-restore        # restore from backup
#
#   Monitoring & SRE:
#     make slo-status        # check SLO/SLA status
#     make error-budget      # check error budget
#     make dr-test           # run disaster recovery test
#     make chaos-test        # run chaos engineering tests
#
#   Feature Management:
#     make ff-list           # list feature flags
#     make ff-enable         # enable a feature flag
#     make ff-disable        # disable a feature flag
#
#   Utilities:
#     make clean             # remove build artifacts
#     make rotate-secrets    # rotate secrets
#     make invalidate-cache  # invalidate CDN cache
#     make help              # show this help message
#
# Copyright (c) 2025 Son Nguyen.
# Licensed under the MIT License (MIT).
# See LICENSE file in the project root for full license information.
#
# -------------------------------------------------------------------------------------------

.DEFAULT_GOAL := help
.PHONY: help dev build-backend build-frontend docker-build docker-push docker-pull up down clean lint test \
	load-test infra-test security-scan policy-validate tf-init tf-plan tf-apply tf-destroy deploy \
	deploy-blue-green deploy-canary db-migrate db-rollback db-backup db-restore slo-status error-budget \
	dr-test chaos-test ff-list ff-enable ff-disable rotate-secrets invalidate-cache

# Configuration
ENV ?= development
TERRAFORM_DIR := ./terraform
SCRIPTS_DIR := ./scripts
AWS_REGION ?= us-east-1

# Display help message
help:
	@echo "╔══════════════════════════════════════════════════════════════════════════╗"
	@echo "║                   PetSwipe Advanced DevOps Makefile                      ║"
	@echo "╚══════════════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🚀 Development Commands:"
	@echo "  make dev                  → Start backend & frontend in dev mode"
	@echo "  make build-backend        → Build backend application"
	@echo "  make build-frontend       → Build frontend application"
	@echo ""
	@echo "🐳 Docker Commands:"
	@echo "  make docker-build         → Build & push Docker images"
	@echo "  make up                   → Start Docker Compose stack"
	@echo "  make down                 → Stop Docker Compose stack"
	@echo ""
	@echo "🧪 Testing & Quality:"
	@echo "  make test                 → Run unit tests"
	@echo "  make lint                 → Run linters"
	@echo "  make load-test            → Run k6 load tests"
	@echo "  make infra-test           → Run Terratest infrastructure tests"
	@echo "  make security-scan        → Run security scanning (tfsec, trivy)"
	@echo "  make policy-validate      → Validate OPA policies"
	@echo ""
	@echo "🏗️  Infrastructure:"
	@echo "  make tf-init              → Initialize Terraform"
	@echo "  make tf-plan              → Plan Terraform changes"
	@echo "  make tf-apply             → Apply Terraform changes"
	@echo "  make tf-destroy           → Destroy infrastructure (⚠️  DANGEROUS)"
	@echo ""
	@echo "🚢 Deployment:"
	@echo "  make deploy               → Standard deployment"
	@echo "  make deploy-blue-green    → Blue-green deployment"
	@echo "  make deploy-canary        → Canary deployment"
	@echo ""
	@echo "🗄️  Database:"
	@echo "  make db-migrate           → Run migrations"
	@echo "  make db-rollback          → Rollback last migration"
	@echo "  make db-status            → Show migration status"
	@echo "  make db-backup            → Create database backup"
	@echo "  make dr-test              → Test disaster recovery"
	@echo ""
	@echo "📊 Monitoring & SRE:"
	@echo "  make slo-status           → Check SLO/SLA status"
	@echo "  make error-budget         → Check error budget"
	@echo "  make chaos-test           → Run chaos engineering tests"
	@echo ""
	@echo "🚩 Feature Flags:"
	@echo "  make ff-list              → List all feature flags"
	@echo "  make ff-enable            → Enable a feature flag"
	@echo "  make ff-disable           → Disable a feature flag"
	@echo ""
	@echo "🔧 Utilities:"
	@echo "  make rotate-secrets       → Rotate secrets"
	@echo "  make invalidate-cache     → Invalidate CDN cache"
	@echo "  make cost-report          → Generate cost optimization report"
	@echo "  make cost-estimate        → Estimate infrastructure costs"
	@echo "  make clean                → Clean build artifacts"
	@echo ""
	@echo "💡 Environment variable: ENV (default: development)"
	@echo "   Example: make deploy ENV=production"
	@echo """

# Start the backend and frontend in development mode using concurrently
dev:
	concurrently \
		"cd backend && npm run dev" \
		"cd frontend && npm run dev"

# Build the backend and frontend applications
build-backend:
	cd backend && npm ci --legacy-peer-deps && npm run build

# Build the frontend application
build-frontend:
	cd frontend && npm ci --legacy-peer-deps && npm run build

# Build and push Docker images to GitHub Container Registry (GHCR)
docker-build:
	./upload_to_ghcr.sh

# Push Docker images to GitHub Container Registry (GHCR)
docker-push: docker-build

# Pull Docker images and start the stack using Docker Compose
docker-pull:
	./pull_and_run.sh

# Alias for docker-pull
up: docker-pull

# Stop and remove the Docker Compose stack
down:
	docker-compose down

# Clean up build artifacts
clean:
	rm -rf backend/dist
	rm -rf frontend/.next

# Run linters for both backend and frontend
lint:
	cd backend && npm run lint
	cd frontend && npm run lint

# Run tests for both backend and frontend
test:
	cd backend && npm test
	cd frontend && npm test

# ═══════════════════════════════════════════════════════════════
# Infrastructure & Deployment Commands
# ═══════════════════════════════════════════════════════════════

# Initialize Terraform
tf-init:
	@echo "Initializing Terraform..."
	cd $(TERRAFORM_DIR) && terraform init

# Plan Terraform changes
tf-plan:
	@echo "Planning Terraform changes for $(ENV)..."
	cd $(TERRAFORM_DIR) && terraform plan -var-file="environments/$(ENV).tfvars"

# Apply Terraform changes
tf-apply:
	@echo "Applying Terraform changes for $(ENV)..."
	cd $(TERRAFORM_DIR) && terraform apply -var-file="environments/$(ENV).tfvars" -auto-approve

# Destroy Terraform infrastructure
tf-destroy:
	@echo "⚠️  WARNING: This will destroy all infrastructure for $(ENV)!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd $(TERRAFORM_DIR) && terraform destroy -var-file="environments/$(ENV).tfvars"; \
	fi

# Standard deployment
deploy:
	@echo "Deploying to $(ENV)..."
	cd aws && ./deploy.sh $(ENV)

# Blue-Green deployment
deploy-blue-green:
	@echo "Executing Blue-Green deployment for $(ENV)..."
	$(SCRIPTS_DIR)/blue-green-deploy.sh $(ENV)

# Canary deployment
deploy-canary:
	@echo "Executing Canary deployment for $(ENV)..."
	@read -p "Enter canary traffic percentage (1-100): " PERCENTAGE; \
	$(SCRIPTS_DIR)/canary-deploy.sh $(ENV) $$PERCENTAGE

# ═══════════════════════════════════════════════════════════════
# Testing Commands
# ═══════════════════════════════════════════════════════════════

# Run load tests with k6
load-test:
	@echo "Running load tests..."
	@if ! command -v k6 &> /dev/null; then \
		echo "k6 is not installed. Install from https://k6.io/docs/getting-started/installation/"; \
		exit 1; \
	fi
	k6 run $(SCRIPTS_DIR)/load-test.js

# Run infrastructure tests
infra-test:
	@echo "Running infrastructure tests..."
	cd tests/terraform && go test -v -timeout 30m

# Run security scanning
security-scan:
	@echo "Running security scans..."
	@echo "Scanning Terraform configurations..."
	tfsec $(TERRAFORM_DIR)
	@echo "\nScanning container images..."
	trivy image ghcr.io/hoangsonww/petswipe-backend:latest
	trivy image ghcr.io/hoangsonww/petswipe-frontend:latest

# Validate OPA policies
policy-validate:
	@echo "Validating OPA policies..."
	@if ! command -v opa &> /dev/null; then \
		echo "OPA is not installed. Install from https://www.openpolicyagent.org/"; \
		exit 1; \
	fi
	opa test policies/ -v

# ═══════════════════════════════════════════════════════════════
# Database Commands
# ═══════════════════════════════════════════════════════════════

# Run database migrations
db-migrate:
	@echo "Running database migrations for $(ENV)..."
	$(SCRIPTS_DIR)/db-migrate.sh $(ENV) migrate

# Rollback last migration
db-rollback:
	@echo "Rolling back last migration for $(ENV)..."
	$(SCRIPTS_DIR)/db-migrate.sh $(ENV) rollback

# Show migration status
db-status:
	@echo "Checking migration status for $(ENV)..."
	$(SCRIPTS_DIR)/db-migrate.sh $(ENV) status

# Create database backup
db-backup:
	@echo "Creating database backup for $(ENV)..."
	aws backup start-backup-job \
		--backup-vault-name petswipe-$(ENV)-backup-vault \
		--resource-arn $$(terraform output -raw rds_instance_arn) \
		--iam-role-arn $$(terraform output -raw backup_role_arn) \
		--region $(AWS_REGION)

# Test disaster recovery
dr-test:
	@echo "Running disaster recovery test..."
	aws lambda invoke \
		--function-name petswipe-$(ENV)-dr-test \
		--region $(AWS_REGION) \
		/tmp/dr-test-output.json
	@cat /tmp/dr-test-output.json

# ═══════════════════════════════════════════════════════════════
# SRE & Monitoring Commands
# ═══════════════════════════════════════════════════════════════

# Check SLO/SLA status
slo-status:
	@echo "Checking SLO/SLA status..."
	@echo "Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=$(AWS_REGION)#dashboards:name=petswipe-$(ENV)-slo-tracking"
	aws cloudwatch get-dashboard \
		--dashboard-name petswipe-$(ENV)-slo-tracking \
		--region $(AWS_REGION) \
		--query 'DashboardBody' \
		--output text | jq .

# Check error budget
error-budget:
	@echo "Calculating error budget..."
	aws lambda invoke \
		--function-name petswipe-$(ENV)-error-budget \
		--region $(AWS_REGION) \
		/tmp/error-budget-output.json
	@cat /tmp/error-budget-output.json | jq .

# Run chaos engineering tests
chaos-test:
	@echo "Running chaos engineering tests..."
	$(SCRIPTS_DIR)/chaos-engineering.sh $(ENV)

# ═══════════════════════════════════════════════════════════════
# Feature Flag Commands
# ═══════════════════════════════════════════════════════════════

# List all feature flags
ff-list:
	@echo "Listing feature flags for $(ENV)..."
	aws appconfig get-configuration \
		--application $$(terraform output -raw appconfig_application_id) \
		--environment $(ENV) \
		--configuration $$(terraform output -raw feature_flags_profile_id) \
		--client-id makefile-cli \
		/tmp/ff-config.json
	@cat /tmp/ff-config.json | jq .

# Enable a feature flag
ff-enable:
	@read -p "Enter feature flag name: " FLAG_NAME; \
	echo "Enabling feature flag: $$FLAG_NAME"; \
	aws lambda invoke \
		--function-name petswipe-$(ENV)-ff-analytics \
		--payload "{\"action\":\"enable\",\"flag\":\"$$FLAG_NAME\"}" \
		/tmp/ff-enable.json

# Disable a feature flag
ff-disable:
	@read -p "Enter feature flag name: " FLAG_NAME; \
	echo "Disabling feature flag: $$FLAG_NAME"; \
	aws lambda invoke \
		--function-name petswipe-$(ENV)-ff-analytics \
		--payload "{\"action\":\"disable\",\"flag\":\"$$FLAG_NAME\"}" \
		/tmp/ff-disable.json

# ═══════════════════════════════════════════════════════════════
# Utility Commands
# ═══════════════════════════════════════════════════════════════

# Rotate secrets
rotate-secrets:
	@echo "Rotating secrets for $(ENV)..."
	aws secretsmanager rotate-secret \
		--secret-id petswipe-$(ENV)-db-credentials \
		--region $(AWS_REGION)
	@echo "Secret rotation initiated. Check status with:"
	@echo "  aws secretsmanager describe-secret --secret-id petswipe-$(ENV)-db-credentials"

# Invalidate CDN cache
invalidate-cache:
	@echo "Invalidating CloudFront cache..."
	@read -p "Enter path pattern (e.g., /*, /api/*): " PATH_PATTERN; \
	aws lambda invoke \
		--function-name petswipe-$(ENV)-cache-invalidation \
		--payload "{\"paths\":[\"$$PATH_PATTERN\"]}" \
		--region $(AWS_REGION) \
		/tmp/cache-invalidation.json
	@cat /tmp/cache-invalidation.json | jq .

# Cost optimization report
cost-report:
	@echo "Generating cost optimization report..."
	$(SCRIPTS_DIR)/cost-optimization.sh $(ENV)

# Infrastructure cost estimation
cost-estimate:
	@echo "Estimating infrastructure costs..."
	cd $(TERRAFORM_DIR) && terraform plan -var-file="environments/$(ENV).tfvars" -out=plan.tfplan
	infracost breakdown --path $(TERRAFORM_DIR)/plan.tfplan
