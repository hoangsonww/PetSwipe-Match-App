#!/usr/bin/env bash
# aws/rds-ops.sh
set -euo pipefail

AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT=petswipe
DB_INSTANCE="${PROJECT}-db"
RETENTION_DAYS=${1:-7}

# Create manual snapshot
TS=$(date +%Y%m%d%H%M)
SNAP_ID="${DB_INSTANCE}-manual-${TS}"
echo "💾 Creating snapshot $SNAP_ID..."
aws rds create-db-snapshot \
  --db-snapshot-identifier "$SNAP_ID" \
  --db-instance-identifier "$DB_INSTANCE"

# Wait until available
echo "→ Waiting for snapshot to be available..."
aws rds wait db-snapshot-completed --db-snapshot-identifier "$SNAP_ID"

# Prune snapshots older than RETENTION_DAYS
echo
echo "🧹 Pruning manual snapshots older than $RETENTION_DAYS days..."
CUTOFF=$(date -d "-$RETENTION_DAYS days" +%Y-%m-%d)
aws rds describe-db-snapshots \
  --db-instance-identifier "$DB_INSTANCE" \
  --snapshot-type manual \
  --query "DBSnapshots[?SnapshotCreateTime<='${CUTOFF}T00:00:00Z'].DBSnapshotIdentifier" \
  --output text | while read old; do
    echo "→ deleting $old"
    aws rds delete-db-snapshot --db-snapshot-identifier "$old"
  done || echo "→ none to delete"
