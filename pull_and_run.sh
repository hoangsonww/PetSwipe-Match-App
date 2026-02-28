#!/usr/bin/env bash
# pull_and_run.sh
# Pull images and bring up the production stack

set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.prod.yml)

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Missing ${ENV_FILE}. Copy .env.production.example to ${ENV_FILE} and fill in real values."
  exit 1
fi

echo "🩺 Running deployment preflight..."
bash scripts/deploy-preflight.sh "$ENV_FILE"

echo "📥 Pulling images from GHCR..."
docker compose --env-file "$ENV_FILE" "${COMPOSE_FILES[@]}" pull

echo "🚀 Starting services..."
docker compose --env-file "$ENV_FILE" "${COMPOSE_FILES[@]}" up -d --remove-orphans --wait

echo "📋 Service status:"
docker compose --env-file "$ENV_FILE" "${COMPOSE_FILES[@]}" ps

echo "✅ Production stack is up! (db → 5432, backend → 5001, frontend → 3000)"
