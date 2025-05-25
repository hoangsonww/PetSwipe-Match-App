#!/usr/bin/env bash
# pull_and_run.sh
# Pull latest images from GHCR and bring up your stack

set -euo pipefail

echo "📥 Pulling images from GHCR..."
docker-compose pull

echo "🚀 Starting services..."
docker-compose up -d

echo "✅ Stack is up! (db → 5432, backend → 5001, frontend → 3000)"
