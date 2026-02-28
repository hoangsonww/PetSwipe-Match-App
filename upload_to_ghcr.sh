#!/usr/bin/env bash
# upload_to_ghcr.sh
# Build, tag, and push petswipe-backend & petswipe-frontend to GitHub Container Registry

set -euo pipefail

# must export these before running:
#   GITHUB_USERNAME (your GitHub user/org)
#   GITHUB_TOKEN    (a PAT with `read:packages, write:packages`)
# optional:
#   IMAGE_TAG       (defaults to latest)
#   NEXT_PUBLIC_API_URL (frontend build-time public API URL)

if [[ -z "${GITHUB_USERNAME:-}" || -z "${GITHUB_TOKEN:-}" ]]; then
  echo "❌ Please set GITHUB_USERNAME and GITHUB_TOKEN"
  exit 1
fi

IMAGE_TAG="${IMAGE_TAG:-latest}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:5001/api}"

echo "🔐 Logging into GHCR..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin

echo "🐳 Building & tagging backend..."
docker build \
  -t "ghcr.io/$GITHUB_USERNAME/petswipe-backend:${IMAGE_TAG}" \
  ./backend

if [[ "$IMAGE_TAG" != "latest" ]]; then
  docker tag "ghcr.io/$GITHUB_USERNAME/petswipe-backend:${IMAGE_TAG}" \
    "ghcr.io/$GITHUB_USERNAME/petswipe-backend:latest"
fi

echo "🐳 Building & tagging frontend..."
docker build \
  --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" \
  -t "ghcr.io/$GITHUB_USERNAME/petswipe-frontend:${IMAGE_TAG}" \
  ./frontend

if [[ "$IMAGE_TAG" != "latest" ]]; then
  docker tag "ghcr.io/$GITHUB_USERNAME/petswipe-frontend:${IMAGE_TAG}" \
    "ghcr.io/$GITHUB_USERNAME/petswipe-frontend:latest"
fi

echo "📤 Pushing backend..."
docker push "ghcr.io/$GITHUB_USERNAME/petswipe-backend:${IMAGE_TAG}"

if [[ "$IMAGE_TAG" != "latest" ]]; then
  docker push "ghcr.io/$GITHUB_USERNAME/petswipe-backend:latest"
fi

echo "📤 Pushing frontend..."
docker push "ghcr.io/$GITHUB_USERNAME/petswipe-frontend:${IMAGE_TAG}"

if [[ "$IMAGE_TAG" != "latest" ]]; then
  docker push "ghcr.io/$GITHUB_USERNAME/petswipe-frontend:latest"
fi

echo "✅ Done!"
