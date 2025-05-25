# Project-wide Makefile

.DEFAULT_GOAL := help
.PHONY: help dev build-backend build-frontend docker-build docker-push docker-pull up down clean lint test

help:
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
