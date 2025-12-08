#!/bin/bash
# =============================================================================
# TaskFlow Development Docker Startup Script
# =============================================================================
# Development environment with hot reloading for all services
#
# Usage:
#   ./docker-dev.sh          # Start dev environment
#   ./docker-dev.sh --quick  # Quick restart (skip dep install check)
#   ./docker-dev.sh --clean  # Clean volumes and rebuild
#   ./docker-dev.sh --logs   # Show logs after startup
#   ./docker-dev.sh --stop   # Stop dev environment
#
# Hot Reload:
#   - Python changes: ~5s reload (uvicorn --reload)
#   - React changes: ~3s Fast Refresh (pnpm dev)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="compose.dev.yaml"
PROJECT_NAME="taskflow-dev"
PROD_PROJECT_NAME="tf-k8"

# Parse arguments
QUICK=false
CLEAN=false
SHOW_LOGS=false
STOP_ONLY=false

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
        --stop)
            STOP_ONLY=true
            ;;
        --help|-h)
            echo -e "${CYAN}TaskFlow Development Environment${NC}"
            echo ""
            echo "Usage: ./docker-dev.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --quick    Skip dependency reinstall (faster restart)"
            echo "  --clean    Full clean (remove dev volumes, reinstall deps)"
            echo "  --logs     Show aggregated logs after startup"
            echo "  --stop     Stop dev environment only"
            echo "  --help     Show this help message"
            echo ""
            echo "Hot Reload:"
            echo "  - Python (API, MCP): uvicorn --reload (~5s)"
            echo "  - Next.js (SSO, Dashboard): Fast Refresh (~3s)"
            echo ""
            echo "Ports:"
            echo "  - Dashboard:  http://localhost:3000"
            echo "  - SSO:        http://localhost:3001"
            echo "  - API:        http://localhost:8000"
            echo "  - MCP:        http://localhost:8001"
            echo "  - pgAdmin:    http://localhost:5050"
            echo "  - PostgreSQL: localhost:5432"
            exit 0
            ;;
    esac
done

echo -e "${CYAN}=== TaskFlow Development Environment ===${NC}"
echo ""

# Stop only mode
if [ "$STOP_ONLY" = true ]; then
    echo -e "${YELLOW}Stopping dev environment...${NC}"
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
    echo -e "${GREEN}Dev environment stopped.${NC}"
    exit 0
fi

# Step 1: Stop production containers if running (avoid port conflicts)
echo -e "${YELLOW}[1/5] Checking for production containers...${NC}"
if docker compose -p "$PROD_PROJECT_NAME" ps -q 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}  Stopping production containers...${NC}"
    docker compose -p "$PROD_PROJECT_NAME" down 2>/dev/null || true
    echo -e "${GREEN}  Production containers stopped.${NC}"
else
    echo -e "${GREEN}  No production containers running.${NC}"
fi

# Step 2: Stop existing dev containers
echo -e "${YELLOW}[2/5] Stopping existing dev containers...${NC}"
docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down 2>/dev/null || true

# Step 3: Clean if requested (preserves postgres_data by default)
if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}[3/6] Cleaning dev volumes (preserving database)...${NC}"
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down 2>/dev/null || true
    # Only remove app volumes, NOT postgres_data
    docker volume rm ${PROJECT_NAME}_pgadmin_data 2>/dev/null || true
    echo -e "${GREEN}  Dev volumes cleaned (postgres data preserved).${NC}"
else
    echo -e "${GREEN}[3/6] Skipping clean (use --clean for full cleanup)${NC}"
fi

# Step 4: Start postgres first
echo -e "${YELLOW}[4/6] Starting PostgreSQL...${NC}"
docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d postgres pgadmin

# Wait for postgres to be healthy
echo -e "${YELLOW}  Waiting for PostgreSQL...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}  PostgreSQL is ready!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Waiting... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}ERROR: PostgreSQL failed to start${NC}"
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs postgres
    exit 1
fi

# Step 5: Run SSO migrations (from host, database accessible on localhost)
echo -e "${YELLOW}[5/6] Running SSO database migrations...${NC}"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskflow"

echo "  - Pushing SSO schema..."
cd sso-platform
DATABASE_URL="${DATABASE_URL}" npx drizzle-kit push --force 2>/dev/null || {
    echo -e "${YELLOW}  Schema push skipped (may already exist)${NC}"
}

echo "  - Running seed setup..."
DATABASE_URL="${DATABASE_URL}" pnpm seed:setup 2>/dev/null || {
    echo -e "${YELLOW}  Seed setup skipped (may already be seeded)${NC}"
}
cd ..

# Step 6: Start all services (build images from Dockerfile.dev)
echo -e "${YELLOW}[6/6] Building and starting dev services...${NC}"
docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --build

# Wait for initial startup
echo ""
echo -e "${YELLOW}Waiting for services to initialize...${NC}"
echo -e "${YELLOW}(First startup installs dependencies - may take 1-2 minutes)${NC}"
sleep 5

# Final status
echo ""
echo -e "${GREEN}=== Dev Environment Started ===${NC}"
echo ""
docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
echo ""
echo -e "${CYAN}Services:${NC}"
echo "  - Dashboard:  http://localhost:3000 (Next.js Fast Refresh)"
echo "  - SSO:        http://localhost:3001 (Next.js Fast Refresh)"
echo "  - API:        http://localhost:8000 (uvicorn --reload)"
echo "  - MCP:        http://localhost:8001 (uvicorn --reload)"
echo "  - pgAdmin:    http://localhost:5050 (admin@example.com / admin)"
echo "  - PostgreSQL: localhost:5432"
echo ""
echo -e "${CYAN}Hot Reload:${NC}"
echo "  - Edit Python files in packages/api or packages/mcp-server → auto-reload"
echo "  - Edit React files in web-dashboard or sso-platform → Fast Refresh"
echo ""
echo -e "${CYAN}Commands:${NC}"
echo "  - View logs:  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f"
echo "  - Stop:       ./docker-dev.sh --stop"
echo "  - Restart:    ./docker-dev.sh"
echo ""

# Show logs if requested
if [ "$SHOW_LOGS" = true ]; then
    echo -e "${YELLOW}Showing logs (Ctrl+C to exit)...${NC}"
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs -f
fi
