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
#   make dev               # start backend & frontend in dev mode
#   make build-backend     # install & build the backend
#   make build-frontend    # install & build the frontend
#   make docker-build      # build & push images to GHCR
#   make docker-pull       # pull images & start stack via Docker Compose
#   make up                # alias for docker-pull
#   make down              # docker-compose down
#   make clean             # remove build artifacts
#   make lint              # run linters
#   make test              # run tests
#   make deploy            # run AWS deploy script
#   make help             # show this help message
#
# Copyright (c) 2025 Son Nguyen.
# Licensed under the MIT License (MIT).
# See LICENSE file in the project root for full license information.
#
# -------------------------------------------------------------------------------------------

.DEFAULT_GOAL := help
.PHONY: help dev build-backend build-frontend docker-build docker-push docker-pull up down clean lint test

# Display help message
help:
	@echo "Welcome to PetSwipe Makefile! This Makefile is used to manage the project as a whole."
	@echo "Usage:"
	@echo "  make dev               → start backend & frontend in dev mode"
	@echo "  make build-backend     → install & build the backend"
	@echo "  make build-frontend    → install & build the frontend"
	@echo "  make docker-build      → build & push images to GHCR"
	@echo "  make docker-pull       → pull images & start stack via Docker Compose"
	@echo "  make up                → alias for docker-pull"
	@echo "  make down              → docker-compose down"
	@echo "  make clean             → remove build artifacts"
	@echo "  make lint              → run linters"
	@echo "  make test              → run tests"

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

# Deploy the application using AWS services
deploy:
	@echo "Deploying to production..."
	cd aws && ./deploy.sh
