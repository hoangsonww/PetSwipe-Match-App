#!/usr/bin/env bash
# aws/ecr-tools.sh
set -euo pipefail

AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROJECT=petswipe
REPOS=(
  "${PROJECT}-backend"
  "${PROJECT}-frontend"
)

# Create repos if missing
for repo in "${REPOS[@]}"; do
  if ! aws ecr describe-repositories --repository-names "$repo" >/dev/null 2>&1; then
    echo "📦 Creating ECR repo $repo..."
    aws ecr create-repository --repository-name "$repo"
  else
    echo "✅ Repo $repo exists"
  fi
done

# List all images
echo
echo "🔍 Listing images in each repo:"
for repo in "${REPOS[@]}"; do
  echo "→ $repo"
  aws ecr list-images --repository-name "$repo" --query 'imageIds[*].imageDigest' --output text
done

# Prune untagged images older than X days
DAYS=${1:-30}
CUTOFF=$(date -d "-$DAYS days" +%Y-%m-%dT%H:%M:%SZ)

echo
echo "🧹 Pruning untagged images older than $DAYS days (before $CUTOFF)..."
for repo in "${REPOS[@]}"; do
  echo "→ $repo"
  # fetch untagged image IDs with pushTime < cutoff
  IDS=$(aws ecr describe-images \
    --repository-name "$repo" \
    --filter "tagStatus=UNTAGGED" \
    --query "imageDetails[?imagePushedAt<'$CUTOFF'].imageDigest" \
    --output text)
  if [[ -n "$IDS" ]]; then
    for digest in $IDS; do
      aws ecr batch-delete-image --repository-name "$repo" --image-ids imageDigest="$digest"
      echo "   • deleted $digest"
    done
  else
    echo "   • none to delete"
  fi
done
