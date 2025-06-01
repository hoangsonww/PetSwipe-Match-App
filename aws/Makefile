# ----------------------------------------------------------------------------------------------------
#
# Makefile for AWS deployment of PetSwipe project
#
# This Makefile automates the deployment process to AWS, including creating an Application Load
# Balancer (ALB), building and pushing Docker images, and deploying the application using AWS services.
#
# Usage:
#   make all              # run all steps: ALB, images, deploy
#   make alb              # create or update ALB and related resources
#   make images           # build and push Docker images for backend and frontend
#   make backend-image    # build and push backend Docker image
#   make frontend-image   # build and push frontend Docker image
#   make deploy           # run full deployment script
#   make clean            # clean up locally generated files
#
# Note:
#   - Ensure AWS CLI is configured with the necessary permissions.
#   - The script assumes Docker is installed and configured to push to AWS ECR.
#   - The AWS region, project name, and account ID can be overridden via environment
#   variables or command line.
#   - The script uses a custom shell script `aws-alb.sh` for ALB provisioning and `aws/deploy.sh`
#   for full deployment.
#
# ------------------------------------------------------------------------------------------------------

# overrideable via env or command line
AWS_REGION   ?= us-east-1
PROJECT      ?= petswipe
ACCOUNT      ?= $(shell aws sts get-caller-identity --query Account --output text)

ECR_URI_BACKEND  = $(ACCOUNT).dkr.ecr.$(AWS_REGION).amazonaws.com/$(PROJECT)-backend
ECR_URI_FRONTEND = $(ACCOUNT).dkr.ecr.$(AWS_REGION).amazonaws.com/$(PROJECT)-frontend

SUBNET_IDS   ?= subnet-aaa,subnet-bbb
ALB_SG_ID    ?= sg-0123456789abcdef

.PHONY: all alb images backend-image frontend-image deploy clean

all: alb images deploy

# 1️⃣ ALB creation / lookup
alb:
	@echo "→ provisioning ALB + TG + listener..."
	@SUBNET_IDS=$(SUBNET_IDS) ALB_SG_ID=$(ALB_SG_ID) ./aws-alb.sh

# 2️⃣ Build & push both Docker images
images: backend-image frontend-image

# Build and push Docker images for backend and frontend
backend-image:
	@echo "→ building & pushing backend image..."
	@docker build -t $(ECR_URI_BACKEND):latest ./backend
	@docker push $(ECR_URI_BACKEND):latest

# Build and push Docker image for frontend
frontend-image:
	@echo "→ building & pushing frontend image..."
	@docker build -t $(ECR_URI_FRONTEND):latest ./frontend
	@docker push $(ECR_URI_FRONTEND):latest

# 3️⃣ Full deploy (RDS, S3, ECR, ECS, CF)
deploy:
	@echo "→ running full deploy..."
	@./aws/deploy.sh

# cleanup locally generated files
clean:
	@echo "→ cleaning artifacts..."
	@rm -f task-def.json
