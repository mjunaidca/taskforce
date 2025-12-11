#!/bin/bash
# =============================================================================
# TaskFlow Docker Startup Script
# =============================================================================
# Usage:
#   ./docker-start.sh          # Full startup (clean, build, migrate)
#   ./docker-start.sh --quick  # Quick restart (no rebuild)
#   ./docker-start.sh --clean  # Clean everything and rebuild
#   ./docker-start.sh --logs   # Show logs after startup
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_USER="postgres"
POSTGRES_PASS="postgres"
POSTGRES_DB="taskflow"
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASS}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"

# Parse arguments
QUICK=false
CLEAN=false
SHOW_LOGS=false

for arg in "$@"; do
    case $arg in
        --quick)
            QUICK=true
            ;;
        --clean)
            CLEAN=true
            ;;
        --logs)
            SHOW_LOGS=true
            ;;
        --help|-h)
            echo "TaskFlow Docker Startup Script"
            echo ""
            echo "Usage: ./docker-start.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --quick    Skip rebuild, just restart containers"
            echo "  --clean    Full clean (volumes, images, rebuild)"
            echo "  --logs     Show logs after startup"
            echo "  --help     Show this help message"
            exit 0
            ;;
    esac
done

echo -e "${BLUE}=== TaskFlow Docker Startup ===${NC}"
echo ""

# Step 1: Stop existing containers
echo -e "${YELLOW}[1/6] Stopping existing containers...${NC}"
docker compose down 2>/dev/null || true

# Step 2: Clean if requested
if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}[2/6] Cleaning Docker resources...${NC}"
    docker compose down -v 2>/dev/null || true
    docker system prune -f
    docker volume rm tf-k8_postgres_data 2>/dev/null || true
    docker volume rm tf-k8_pgadmin_data 2>/dev/null || true
else
    echo -e "${GREEN}[2/6] Skipping clean (use --clean for full cleanup)${NC}"
fi

# Step 3: Start postgres first (need it for migrations)
echo -e "${YELLOW}[3/6] Starting PostgreSQL...${NC}"
if [ "$QUICK" = true ]; then
    docker compose up -d postgres pgadmin
else
    docker compose up -d --build postgres pgadmin
fi

# Step 4: Wait for postgres to be healthy
echo -e "${YELLOW}[4/6] Waiting for PostgreSQL to be healthy...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}PostgreSQL is ready!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for PostgreSQL... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}ERROR: PostgreSQL failed to start${NC}"
    docker compose logs postgres
    exit 1
fi

# Step 5: Run SSO migrations BEFORE starting other services
# This must happen before API starts, because API will create its own tables
echo -e "${YELLOW}[5/6] Running SSO database migrations...${NC}"
cd apps/sso

# Ensure node_modules exists on host for migrations
if [ ! -d "node_modules" ]; then
    echo "  - Installing dependencies (first time setup)..."
    pnpm install --frozen-lockfile
fi

echo "  - Pushing SSO schema..."
DATABASE_URL="${DATABASE_URL}" pnpm db:push 2>/dev/null || {
    echo -e "${YELLOW}  Schema push skipped (may already be up to date)${NC}"
}

echo "  - Running seed setup..."
DATABASE_URL="${DATABASE_URL}" pnpm seed:setup 2>/dev/null || {
    echo -e "${YELLOW}  Seed setup skipped (may already be seeded)${NC}"
}

cd ../..

# Step 6: Now start all other services (API will create its tables on startup)
echo -e "${YELLOW}[6/6] Starting remaining services...${NC}"
if [ "$QUICK" = true ]; then
    docker compose up -d
else
    docker compose up -d --build
fi

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

# Final status
echo ""
echo -e "${GREEN}=== Startup Complete ===${NC}"
echo ""
docker compose ps
echo ""
echo -e "${BLUE}Services:${NC}"
echo "  - Dashboard:  http://localhost:3000"
echo "  - SSO:        http://localhost:3001"
echo "  - API:        http://localhost:8000"
echo "  - pgAdmin:    http://localhost:5050 (admin@example.com / admin)"
echo "  - PostgreSQL: localhost:5432"
echo ""

# Show logs if requested
if [ "$SHOW_LOGS" = true ]; then
    echo -e "${YELLOW}Showing logs (Ctrl+C to exit)...${NC}"
    docker compose logs -f
fi
