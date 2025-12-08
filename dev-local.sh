#!/bin/bash
# =============================================================================
# TaskFlow Local Development Script (No Docker)
# =============================================================================
# Starts all 4 services locally with hot reload
#
# Prerequisites:
#   - PostgreSQL running on localhost:5432
#   - Node.js + pnpm installed
#   - Python + uv installed
#
# Usage:
#   ./dev-local.sh
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== TaskFlow Local Dev ===${NC}"
echo ""

# Check .env files
echo -e "${YELLOW}Checking .env files...${NC}"
MISSING=false

check_env() {
    local dir=$1
    local name=$2
    if [ -f "$dir/.env" ] || [ -f "$dir/.env.local" ]; then
        echo -e "  ${GREEN}✓${NC} $name"
    else
        echo -e "  ${RED}✗${NC} $name - missing .env or .env.local"
        MISSING=true
    fi
}

check_env "sso-platform" "sso-platform"
check_env "web-dashboard" "web-dashboard"
check_env "packages/api" "api"
check_env "packages/mcp-server" "mcp-server"

if [ "$MISSING" = true ]; then
    echo ""
    echo -e "${RED}ERROR: Missing .env files. Copy from .env.example${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}All .env files present!${NC}"
echo ""

# Start services in background
echo -e "${YELLOW}Starting services...${NC}"

# SSO Platform (port 3001)
echo "  - sso-platform (port 3001)"
cd sso-platform && pnpm dev &
SSO_PID=$!
cd ..

# Web Dashboard (port 3000)
echo "  - web-dashboard (port 3000)"
cd web-dashboard && pnpm dev &
DASH_PID=$!
cd ..

# API (port 8000)
echo "  - api (port 8000)"
cd packages/api && uv run uvicorn taskflow_api.main:app --reload --port 8000 &
API_PID=$!
cd ../..

# MCP Server (port 8001)
echo "  - mcp-server (port 8001)"
cd packages/mcp-server && uv run uvicorn taskflow_mcp.http_server:app --reload --port 8001 &
MCP_PID=$!
cd ../..

echo ""
echo -e "${GREEN}=== All Services Started ===${NC}"
echo ""
echo "  Dashboard:  http://localhost:3000"
echo "  SSO:        http://localhost:3001"
echo "  API:        http://localhost:8000"
echo "  MCP:        http://localhost:8001"
echo ""
echo -e "${CYAN}Press Ctrl+C to stop all services${NC}"

# Wait and cleanup on exit
trap "kill $SSO_PID $DASH_PID $API_PID $MCP_PID 2>/dev/null; echo ''; echo 'Stopped all services.'" EXIT
wait
