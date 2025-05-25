#!/usr/bin/env bash
# upload_to_ghcr.sh
# Build, tag, and push petswipe-backend & petswipe-frontend to GitHub Container Registry

set -euo pipefail

# must export these before running:
#   GITHUB_USERNAME (your GitHub user/org)
#   GITHUB_TOKEN    (a PAT with `read:packages, write:packages`)

if [[ -z "${GITHUB_USERNAME:-}" || -z "${GITHUB_TOKEN:-}" ]]; then
  echo "❌ Please set GITHUB_USERNAME and GITHUB_TOKEN"
  exit 1
fi

echo "🔐 Logging into GHCR..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin

echo "🐳 Building & tagging backend..."
docker build -t ghcr.io/$GITHUB_USERNAME/petswipe-backend:latest ./backend

echo "🐳 Building & tagging frontend..."
docker build -t ghcr.io/$GITHUB_USERNAME/petswipe-frontend:latest ./frontend

echo "📤 Pushing backend..."
docker push ghcr.io/$GITHUB_USERNAME/petswipe-backend:latest

echo "📤 Pushing frontend..."
docker push ghcr.io/$GITHUB_USERNAME/petswipe-frontend:latest

echo "✅ Done!"
