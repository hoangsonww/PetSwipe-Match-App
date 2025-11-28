#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Database Migration Script with Versioning
# Automated database schema migrations with rollback support
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
ACTION=${2:-migrate}  # migrate, rollback, status
MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../database/migrations" && pwd)"
BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../database/backups" && pwd)"

# Database connection
DB_HOST=$(aws secretsmanager get-secret-value --secret-id "petswipe-${ENVIRONMENT}-db-credentials" --query SecretString --output text | jq -r .host)
DB_NAME=$(aws secretsmanager get-secret-value --secret-id "petswipe-${ENVIRONMENT}-db-credentials" --query SecretString --output text | jq -r .dbname)
DB_USER=$(aws secretsmanager get-secret-value --secret-id "petswipe-${ENVIRONMENT}-db-credentials" --query SecretString --output text | jq -r .username)
DB_PASS=$(aws secretsmanager get-secret-value --secret-id "petswipe-${ENVIRONMENT}-db-credentials" --query SecretString --output text | jq -r .password)

export PGPASSWORD="${DB_PASS}"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  PetSwipe Database Migration Tool                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo -e "\nEnvironment: ${ENVIRONMENT}"
echo -e "Action: ${ACTION}\n"

# Initialize migrations table if it doesn't exist
init_migrations_table() {
    echo -e "${YELLOW}Initializing migrations table...${NC}"

    psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(255),
    checksum VARCHAR(255),
    execution_time INTEGER,
    success BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_applied_at ON schema_migrations(applied_at);
EOF

    echo -e "${GREEN}✓ Migrations table initialized${NC}\n"
}

# Get current schema version
get_current_version() {
    psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
        "SELECT version FROM schema_migrations WHERE success = TRUE ORDER BY applied_at DESC LIMIT 1;" | xargs
}

# Get pending migrations
get_pending_migrations() {
    local current_version=$1

    for migration in $(ls "${MIGRATIONS_DIR}"/*.sql | sort); do
        local version=$(basename "${migration}" .sql)

        if [[ -z "${current_version}" ]] || [[ "${version}" > "${current_version}" ]]; then
            echo "${migration}"
        fi
    done
}

# Backup database before migration
backup_database() {
    echo -e "${YELLOW}Creating database backup...${NC}"

    local backup_file="${BACKUP_DIR}/backup_${ENVIRONMENT}_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p "${BACKUP_DIR}"

    pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -Fc -f "${backup_file}"

    echo -e "${GREEN}✓ Backup created: ${backup_file}${NC}\n"
    echo "${backup_file}"
}

# Calculate checksum of migration file
calculate_checksum() {
    local file=$1
    shasum -a 256 "${file}" | awk '{print $1}'
}

# Run a migration
run_migration() {
    local migration_file=$1
    local version=$(basename "${migration_file}" .sql)
    local checksum=$(calculate_checksum "${migration_file}")

    echo -e "${YELLOW}Running migration: ${version}${NC}"

    local start_time=$(date +%s)

    # Run migration in a transaction
    if psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -f "${migration_file}"; then
        local end_time=$(date +%s)
        local execution_time=$((end_time - start_time))

        # Record successful migration
        psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" <<EOF
INSERT INTO schema_migrations (version, applied_by, checksum, execution_time, success)
VALUES ('${version}', '${USER}', '${checksum}', ${execution_time}, TRUE);
EOF

        echo -e "${GREEN}✓ Migration ${version} completed in ${execution_time}s${NC}\n"
        return 0
    else
        echo -e "${RED}✗ Migration ${version} failed${NC}\n"

        # Record failed migration
        psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" <<EOF
INSERT INTO schema_migrations (version, applied_by, checksum, success)
VALUES ('${version}', '${USER}', '${checksum}', FALSE);
EOF

        return 1
    fi
}

# Migrate up
migrate_up() {
    init_migrations_table

    local current_version=$(get_current_version)
    echo -e "Current version: ${current_version:-none}\n"

    local pending_migrations=$(get_pending_migrations "${current_version}")

    if [[ -z "${pending_migrations}" ]]; then
        echo -e "${GREEN}No pending migrations${NC}"
        return 0
    fi

    echo -e "${YELLOW}Pending migrations:${NC}"
    echo "${pending_migrations}"
    echo ""

    # Create backup before migrations
    if [[ "${ENVIRONMENT}" == "production" ]]; then
        backup_database
    fi

    # Run each pending migration
    for migration in ${pending_migrations}; do
        run_migration "${migration}" || {
            echo -e "${RED}Migration failed. Database state may be inconsistent.${NC}"
            echo -e "${YELLOW}Consider rolling back to the backup.${NC}"
            exit 1
        }
    done

    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  All migrations completed successfully!                     ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
}

# Rollback last migration
rollback() {
    init_migrations_table

    local last_version=$(get_current_version)

    if [[ -z "${last_version}" ]]; then
        echo -e "${YELLOW}No migrations to roll back${NC}"
        return 0
    fi

    echo -e "${YELLOW}Rolling back migration: ${last_version}${NC}\n"

    # Look for rollback file
    local rollback_file="${MIGRATIONS_DIR}/rollback_${last_version}.sql"

    if [[ ! -f "${rollback_file}" ]]; then
        echo -e "${RED}Rollback file not found: ${rollback_file}${NC}"
        echo -e "${YELLOW}Restoring from backup instead...${NC}\n"

        # Find latest backup
        local latest_backup=$(ls -t "${BACKUP_DIR}"/backup_${ENVIRONMENT}_*.sql 2>/dev/null | head -1)

        if [[ -z "${latest_backup}" ]]; then
            echo -e "${RED}No backup found. Cannot rollback.${NC}"
            exit 1
        fi

        echo -e "${YELLOW}Restoring from: ${latest_backup}${NC}"
        pg_restore -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -c "${latest_backup}"
    else
        # Run rollback script
        psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -f "${rollback_file}"

        # Mark migration as rolled back
        psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" <<EOF
DELETE FROM schema_migrations WHERE version = '${last_version}';
EOF
    fi

    echo -e "${GREEN}✓ Rollback completed${NC}"
}

# Show migration status
show_status() {
    init_migrations_table

    echo -e "${GREEN}Migration Status:${NC}\n"

    psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" <<EOF
SELECT
    version,
    applied_at,
    applied_by,
    execution_time || 's' as duration,
    CASE WHEN success THEN 'SUCCESS' ELSE 'FAILED' END as status
FROM schema_migrations
ORDER BY applied_at DESC
LIMIT 10;
EOF
}

# Main execution
case "${ACTION}" in
    migrate|up)
        migrate_up
        ;;
    rollback|down)
        rollback
        ;;
    status)
        show_status
        ;;
    *)
        echo -e "${RED}Invalid action: ${ACTION}${NC}"
        echo "Usage: $0 <environment> <migrate|rollback|status>"
        exit 1
        ;;
esac

unset PGPASSWORD
