# Docker Startup Script Pattern

## The Problem

When using multiple ORMs or schema management tools (e.g., Drizzle for Next.js + SQLModel for FastAPI), startup order matters critically.

**The Bug:**
1. `docker compose up` starts ALL containers
2. API container starts and creates its tables (via SQLModel)
3. SSO migration script runs `drizzle-kit push`
4. Drizzle sees tables NOT in its schema → **drops them**
5. API tables are gone, API fails

## Solution: Staged Startup Script

```bash
#!/bin/bash
# docker-start.sh - Staged startup to prevent migration conflicts
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Config
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
        --quick) QUICK=true ;;
        --clean) CLEAN=true ;;
        --logs) SHOW_LOGS=true ;;
        --help|-h)
            echo "Usage: ./docker-start.sh [OPTIONS]"
            echo "  --quick    Skip rebuild, just restart"
            echo "  --clean    Full clean (volumes, rebuild)"
            echo "  --logs     Show logs after startup"
            exit 0
            ;;
    esac
done

echo -e "${BLUE}=== Docker Startup ===${NC}"

# Step 1: Stop existing containers
echo -e "${YELLOW}[1/6] Stopping existing containers...${NC}"
docker compose down 2>/dev/null || true

# Step 2: Clean if requested
if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}[2/6] Cleaning Docker resources...${NC}"
    docker compose down -v 2>/dev/null || true
    docker system prune -f
else
    echo -e "${GREEN}[2/6] Skipping clean${NC}"
fi

# Step 3: Start postgres ONLY (need it for migrations)
echo -e "${YELLOW}[3/6] Starting PostgreSQL...${NC}"
if [ "$QUICK" = true ]; then
    docker compose up -d postgres pgadmin
else
    docker compose up -d --build postgres pgadmin
fi

# Step 4: Wait for postgres to be healthy
echo -e "${YELLOW}[4/6] Waiting for PostgreSQL...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}PostgreSQL is ready!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}ERROR: PostgreSQL failed to start${NC}"
    exit 1
fi

# Step 5: Run migrations BEFORE starting other services
# CRITICAL: This prevents Drizzle from dropping API tables
echo -e "${YELLOW}[5/6] Running database migrations...${NC}"
cd sso-platform

echo "  - Pushing schema..."
DATABASE_URL="${DATABASE_URL}" pnpm db:push 2>/dev/null || {
    echo -e "${YELLOW}  Schema push skipped (may be up to date)${NC}"
}

echo "  - Running seed..."
DATABASE_URL="${DATABASE_URL}" pnpm seed:setup 2>/dev/null || {
    echo -e "${YELLOW}  Seed skipped (may already exist)${NC}"
}
cd ..

# Step 6: NOW start all other services
# API will create its tables AFTER Drizzle is done
echo -e "${YELLOW}[6/6] Starting remaining services...${NC}"
if [ "$QUICK" = true ]; then
    docker compose up -d
else
    docker compose up -d --build
fi

# Wait for health checks
echo "Waiting for services..."
sleep 10

# Status
echo ""
echo -e "${GREEN}=== Startup Complete ===${NC}"
docker compose ps
echo ""
echo "Services:"
echo "  - Dashboard:  http://localhost:3000"
echo "  - SSO:        http://localhost:3001"
echo "  - API:        http://localhost:8000"

if [ "$SHOW_LOGS" = true ]; then
    docker compose logs -f
fi
```

## Why This Order?

```
WRONG ORDER:
┌────────────────────────────────────────────────────┐
│ 1. docker compose up                               │
│    ├── postgres starts                             │
│    ├── sso-platform starts                         │
│    ├── api starts → CREATE TABLE worker, task...   │
│    └── web starts                                  │
│ 2. drizzle-kit push                                │
│    └── DROP TABLE worker, task... (not in schema!) │
│ 3. API fails: "relation worker does not exist"     │
└────────────────────────────────────────────────────┘

CORRECT ORDER:
┌────────────────────────────────────────────────────┐
│ 1. docker compose up postgres                      │
│ 2. drizzle-kit push → creates SSO tables           │
│ 3. docker compose up (all services)                │
│    └── api starts → CREATE TABLE worker, task...   │
│ 4. All tables exist, no conflicts!                 │
└────────────────────────────────────────────────────┘
```

## SQLModel Model Registration

Another common issue: SQLModel's `create_all()` doesn't create tables.

**Cause:** Models must be imported BEFORE `SQLModel.metadata.create_all()` runs.

**Solution:** Explicitly import models in your database module:

```python
# database.py
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine

# CRITICAL: Import models to register them with metadata
# This MUST happen before create_db_and_tables() is called
from .models import User, Task, Project, AuditLog  # noqa: F401

engine = create_async_engine(DATABASE_URL)

async def create_db_and_tables():
    async with engine.begin() as conn:
        # Now all models are registered
        await conn.run_sync(SQLModel.metadata.create_all)
```

## When to Use This Pattern

- Multiple services with different ORMs sharing one database
- SSO service uses Drizzle/Prisma, API uses SQLModel/SQLAlchemy
- Any scenario where one migration tool might drop another's tables

## Alternative: Separate Databases

If startup order is too complex, use separate databases:
```yaml
services:
  sso:
    environment:
      - DATABASE_URL=postgresql://...@postgres:5432/sso_db

  api:
    environment:
      - DATABASE_URL=postgresql://...@postgres:5432/api_db
```

This isolates schemas completely but adds operational complexity.
