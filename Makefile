# Project-wide Makefile for PetSwipe App
#
# This Makefile is used to define common tasks for the project.
# It provides a convenient way to run commands and manage the project.
# It is not intended to be used as a build system, but rather as a helper for common tasks.
# The Makefile is designed to be used with GNU Make.
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

.DEFAULT_GOAL := help
.PHONY: help dev build-backend build-frontend docker-build docker-push docker-pull up down clean lint test

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

dev:
	concurrently \
		"cd backend && npm run dev" \
		"cd frontend && npm run dev"

build-backend:
	cd backend && npm ci --legacy-peer-deps && npm run build

build-frontend:
	cd frontend && npm ci --legacy-peer-deps && npm run build

docker-build:
	./upload_to_ghcr.sh

docker-push: docker-build

docker-pull:
	./pull_and_run.sh

up: docker-pull

down:
	docker-compose down

clean:
	rm -rf backend/dist
	rm -rf frontend/.next

lint:
	cd backend && npm run lint
	cd frontend && npm run lint

test:
	cd backend && npm test
	cd frontend && npm test

deploy:
	@echo "Deploying to production..."
	cd aws && ./deploy.sh
