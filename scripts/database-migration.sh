#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Automated Database Migration Script
# Zero-downtime database migrations with rollback capability
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

: "${AWS_REGION:=us-east-1}"
: "${PROJECT:=petswipe}"
: "${ENVIRONMENT:=production}"
: "${DB_INSTANCE_ID:=${PROJECT}-${ENVIRONMENT}-postgres}"
: "${MIGRATION_DIR:=${PROJECT_ROOT}/backend/migrations}"
: "${DRY_RUN:=true}"

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# ─── Logging ─────────────────────────────────────────────────────────────────

log_info() {
  echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*"
}

# ─── Pre-flight Checks ───────────────────────────────────────────────────────

preflight_checks() {
  log_info "Running pre-flight checks..."

  # Check if RDS instance exists
  if ! aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE_ID" \
    --region "$AWS_REGION" &>/dev/null; then
    log_error "RDS instance $DB_INSTANCE_ID not found"
    exit 1
  fi

  # Check if migrations directory exists
  if [[ ! -d "$MIGRATION_DIR" ]]; then
    log_error "Migration directory not found: $MIGRATION_DIR"
    exit 1
  fi

  # Get DB credentials from Secrets Manager
  local secret_arn=$(aws secretsmanager list-secrets \
    --query "SecretList[?contains(Name, '${PROJECT}') && contains(Name, 'db-credentials')].ARN | [0]" \
    --output text --region "$AWS_REGION")

  if [[ -z "$secret_arn" || "$secret_arn" == "None" ]]; then
    log_error "Database credentials not found in Secrets Manager"
    exit 1
  fi

  export DB_SECRET_ARN="$secret_arn"

  log_success "Pre-flight checks passed"
}

# ─── Database Backup ─────────────────────────────────────────────────────────

create_snapshot() {
  local snapshot_id="${DB_INSTANCE_ID}-migration-$(date +%Y%m%d%H%M%S)"

  log_info "Creating database snapshot: $snapshot_id"

  if [[ "$DRY_RUN" == "false" ]]; then
    aws rds create-db-snapshot \
      --db-instance-identifier "$DB_INSTANCE_ID" \
      --db-snapshot-identifier "$snapshot_id" \
      --region "$AWS_REGION" > /dev/null

    log_info "Waiting for snapshot to complete..."
    aws rds wait db-snapshot-completed \
      --db-snapshot-identifier "$snapshot_id" \
      --region "$AWS_REGION"

    log_success "Snapshot created: $snapshot_id"
    echo "$snapshot_id" > /tmp/migration-snapshot.txt
  else
    log_warning "DRY RUN: Would create snapshot $snapshot_id"
  fi
}

# ─── Migration Execution ─────────────────────────────────────────────────────

get_db_credentials() {
  local credentials=$(aws secretsmanager get-secret-value \
    --secret-id "$DB_SECRET_ARN" \
    --query 'SecretString' \
    --output text --region "$AWS_REGION")

  export DB_HOST=$(echo "$credentials" | jq -r '.host')
  export DB_PORT=$(echo "$credentials" | jq -r '.port')
  export DB_NAME=$(echo "$credentials" | jq -r '.dbname')
  export DB_USER=$(echo "$credentials" | jq -r '.username')
  export DB_PASSWORD=$(echo "$credentials" | jq -r '.password')
}

run_migrations() {
  log_info "Running database migrations..."

  get_db_credentials

  # Get pending migrations
  cd "$PROJECT_ROOT/backend"

  if [[ "$DRY_RUN" == "false" ]]; then
    # Run migrations (example using Knex.js)
    if [[ -f "knexfile.js" ]]; then
      npx knex migrate:latest --env "$ENVIRONMENT"
      log_success "Migrations completed successfully"

      # Record migration in metadata table
      record_migration_metadata
    else
      log_error "Migration tool configuration not found"
      exit 1
    fi
  else
    log_warning "DRY RUN: Would run pending migrations"

    # Show pending migrations
    if [[ -f "knexfile.js" ]]; then
      npx knex migrate:list --env "$ENVIRONMENT"
    fi
  fi
}

record_migration_metadata() {
  local migration_id=$(date +%Y%m%d%H%M%S)
  local migration_log="${PROJECT_ROOT}/migration-${migration_id}.log"

  cat > "$migration_log" <<EOF
{
  "migration_id": "$migration_id",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "$ENVIRONMENT",
  "db_instance": "$DB_INSTANCE_ID",
  "snapshot": "$(cat /tmp/migration-snapshot.txt 2>/dev/null || echo 'none')",
  "status": "completed"
}
EOF

  log_info "Migration metadata recorded: $migration_log"
}

# ─── Migration Validation ────────────────────────────────────────────────────

validate_migration() {
  log_info "Validating migration..."

  get_db_credentials

  # Run validation queries
  local validation_passed=true

  # Check table existence
  if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\dt" &>/dev/null; then
    log_error "Database connection failed"
    validation_passed=false
  fi

  # Run smoke tests
  cd "$PROJECT_ROOT/backend"
  if [[ -f "package.json" ]]; then
    if ! npm run test:db &>/dev/null; then
      log_error "Database smoke tests failed"
      validation_passed=false
    fi
  fi

  if [[ "$validation_passed" == "true" ]]; then
    log_success "Migration validation passed"
    return 0
  else
    log_error "Migration validation failed"
    return 1
  fi
}

# ─── Rollback ────────────────────────────────────────────────────────────────

rollback_migration() {
  log_error "Rolling back migration..."

  local snapshot_id=$(cat /tmp/migration-snapshot.txt 2>/dev/null || echo "")

  if [[ -z "$snapshot_id" ]]; then
    log_error "No snapshot found for rollback"
    return 1
  fi

  log_warning "This will restore database to snapshot: $snapshot_id"

  if [[ "$DRY_RUN" == "false" ]]; then
    # Restore from snapshot
    local restore_id="${DB_INSTANCE_ID}-restored-$(date +%Y%m%d%H%M%S)"

    aws rds restore-db-instance-from-db-snapshot \
      --db-instance-identifier "$restore_id" \
      --db-snapshot-identifier "$snapshot_id" \
      --region "$AWS_REGION" > /dev/null

    log_info "Waiting for database restore..."
    aws rds wait db-instance-available \
      --db-instance-identifier "$restore_id" \
      --region "$AWS_REGION"

    log_success "Database restored from snapshot"
    log_warning "Manual steps required:"
    log_warning "  1. Update application connection strings to: $restore_id"
    log_warning "  2. Verify application functionality"
    log_warning "  3. Delete old instance: $DB_INSTANCE_ID"
  else
    log_warning "DRY RUN: Would restore from snapshot $snapshot_id"
  fi
}

# ─── Main Flow ───────────────────────────────────────────────────────────────

main() {
  log_info "═══════════════════════════════════════════════════════════"
  log_info "  DATABASE MIGRATION AUTOMATION"
  log_info "  Project: $PROJECT"
  log_info "  Environment: $ENVIRONMENT"
  log_info "  DB Instance: $DB_INSTANCE_ID"
  log_info "  Dry Run: $DRY_RUN"
  log_info "═══════════════════════════════════════════════════════════"
  echo ""

  # 1. Pre-flight checks
  preflight_checks

  # 2. Create snapshot for rollback
  create_snapshot

  # 3. Run migrations
  run_migrations

  # 4. Validate migration
  if ! validate_migration; then
    log_error "Migration validation failed!"

    read -p "Rollback migration? (yes/no): " -r
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
      rollback_migration
    fi

    exit 1
  fi

  # 5. Success
  echo ""
  log_success "═══════════════════════════════════════════════════════════"
  log_success "  DATABASE MIGRATION COMPLETED SUCCESSFULLY"
  log_success "═══════════════════════════════════════════════════════════"

  # Cleanup
  rm -f /tmp/migration-snapshot.txt
}

# ─── Trap Errors ─────────────────────────────────────────────────────────────

trap 'log_error "Migration failed on line $LINENO"' ERR

main "$@"
