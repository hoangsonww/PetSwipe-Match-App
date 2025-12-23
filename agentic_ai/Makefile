.PHONY: install dev build test lint format clean docker-build docker-run deploy-aws deploy-azure help

# Variables
PYTHON := python3
PIP := pip3
DOCKER := docker
DOCKER_COMPOSE := docker-compose

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	$(PIP) install -r requirements.txt

dev: ## Run in development mode
	$(PYTHON) -m agentic_ai.api.server

build: ## Build Docker image
	$(DOCKER) build -t petswipe/agentic-ai:latest .

test: ## Run tests
	pytest tests/ -v --cov=agentic_ai

lint: ## Run linting
	flake8 .
	mypy .

format: ## Format code
	black .
	isort .

clean: ## Clean build artifacts
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info
	rm -rf __pycache__
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

docker-build: ## Build Docker image
	$(DOCKER_COMPOSE) build

docker-run: ## Run with Docker Compose
	$(DOCKER_COMPOSE) up -d

docker-stop: ## Stop Docker Compose
	$(DOCKER_COMPOSE) down

docker-logs: ## View Docker logs
	$(DOCKER_COMPOSE) logs -f

deploy-aws: ## Deploy to AWS
	cd aws/terraform && terraform init && terraform apply

deploy-azure: ## Deploy to Azure
	cd azure/terraform && terraform init && terraform apply

check-env: ## Check environment variables
	@echo "Checking environment configuration..."
	@test -f .env && echo "✓ .env file exists" || echo "✗ .env file missing"
	@test -n "$$OPENAI_API_KEY" && echo "✓ OPENAI_API_KEY set" || echo "✗ OPENAI_API_KEY not set"
