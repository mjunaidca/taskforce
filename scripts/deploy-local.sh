#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# TaskFlow Local Deployment Script
#
# Usage:
#   ./scripts/deploy-local.sh                                    # Clean deployment
#   ./scripts/deploy-local.sh --skip-cleanup --port-forward      # Fast upgrade (2-3 min)
#   ./scripts/deploy-local.sh --rebuild --port-forward           # Rebuild + deploy (15 min)
#   ./scripts/deploy-local.sh --rebuild --parallel --port-forward # FAST rebuild (~5 min)
#   ./scripts/deploy-local.sh --rebuild --skip-cleanup           # Rebuild + fast upgrade
#   ./scripts/deploy-local.sh --pgadmin --port-forward           # With extras
#
# Flags:
#   --rebuild      Force rebuild all Docker images
#   --parallel     Build API/MCP/Web images in parallel (faster)
#   --skip-cleanup Don't delete namespace (upgrade existing)
#   --port-forward Start kubectl port-forwards after deploy
#   --pgadmin      Deploy pgAdmin for database management
###############################################################################

# Parse flags
PGADMIN=false
PORTFORWARD=false
SKIP_CLEANUP=false
REBUILD=false
PARALLEL=false

for arg in "$@"; do
  case $arg in
    --pgadmin)
      PGADMIN=true
      shift
      ;;
    --port-forward)
      PORTFORWARD=true
      shift
      ;;
    --skip-cleanup)
      SKIP_CLEANUP=true
      shift
      ;;
    --rebuild)
      REBUILD=true
      shift
      ;;
    --parallel)
      PARALLEL=true
      shift
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: $0 [--pgadmin] [--port-forward] [--skip-cleanup] [--rebuild] [--parallel]"
      exit 1
      ;;
  esac
done

echo "🚀 TaskFlow Local Deployment"
echo "=============================="
echo ""

# Check Minikube is running
echo "🔍 Checking Minikube..."
if ! minikube status > /dev/null 2>&1; then
  echo "❌ Minikube is not running!"
  echo "   Start it with: minikube start --memory=4096 --cpus=2"
  exit 1
fi
echo "✅ Minikube running"
echo ""

# Switch to Minikube Docker daemon
echo "🐳 Configuring Docker environment..."
eval $(minikube docker-env)
echo "✅ Using Minikube Docker"
echo ""

# Check if ALL required images exist, build if any missing or if --rebuild flag is set
echo "🏗️  Checking Docker images..."
REQUIRED_IMAGES=("taskflow/sso-platform-migrations" "taskflow/sso-platform" "taskflow/api" "taskflow/mcp-server" "taskflow/web-dashboard")
MISSING_IMAGES=()

for img in "${REQUIRED_IMAGES[@]}"; do
  if ! docker images --format "{{.Repository}}" | grep -q "^${img}$"; then
    MISSING_IMAGES+=("$img")
  fi
done

# Build flags
BUILD_FLAGS=""
if [ "$PARALLEL" = true ]; then
  BUILD_FLAGS="--parallel"
fi

if [ "$REBUILD" = true ]; then
  echo "🔨 Rebuilding images (--rebuild flag set)..."
  if [ "$PARALLEL" = true ]; then
    echo "   ⚡ PARALLEL mode - ~3-5 minutes"
  else
    echo "   This takes ~5-10 minutes..."
  fi
  echo ""
  if ! ./scripts/utils/build-images.sh $BUILD_FLAGS; then
    echo "❌ Image build failed! Check errors above."
    exit 1
  fi
elif [ ${#MISSING_IMAGES[@]} -gt 0 ]; then
  echo "⚠️  Missing images: ${MISSING_IMAGES[*]}"
  echo "   Building now (first time only)..."
  if [ "$PARALLEL" = true ]; then
    echo "   ⚡ PARALLEL mode - ~3-5 minutes"
  else
    echo "   This takes ~5-10 minutes..."
  fi
  echo ""
  if ! ./scripts/utils/build-images.sh $BUILD_FLAGS; then
    echo "❌ Image build failed! Check errors above."
    exit 1
  fi
else
  echo "✅ All 5 images available (skipping build)"
fi
echo ""

# Ensure PostgreSQL image is available (required for databases)
echo "🗄️  Checking PostgreSQL image..."
if ! docker images | grep -q "postgres.*16-alpine"; then
  echo "📥 Pulling postgres:16-alpine (first time only)..."
  echo "   This takes ~1-2 minutes..."
  docker pull postgres:16-alpine
  echo "✅ PostgreSQL image ready"
else
  echo "✅ PostgreSQL image available"
fi
echo ""

# Load environment variables from .env
if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  echo "   Copy .env.example to .env and fill in the values"
  exit 1
fi

echo "📄 Loading environment from .env..."
set -a
source .env
set +a
echo "✅ Secrets loaded"
echo ""

# Optional: Delete existing deployment for clean start
if [ "$SKIP_CLEANUP" = false ]; then
  echo "🗑️  Removing old deployment..."
  kubectl delete namespace taskflow --ignore-not-found=true 2>/dev/null || true
  echo "   Waiting for cleanup..."
  sleep 10
  echo "✅ Clean slate ready"
  echo ""
else
  echo "⚡ Skipping cleanup - upgrading existing deployment"
  echo ""
fi

# Deploy with Helm
echo "📦 Deploying with Helm..."
if [ "$SKIP_CLEANUP" = false ]; then
  echo "   This takes ~10 minutes (includes database setup)"
else
  echo "   Upgrade takes ~2-3 minutes"
fi
echo ""

# Deploy with Helm - secrets from root .env
helm upgrade --install taskflow ./helm/taskflow \
    --namespace taskflow \
    --create-namespace \
    --set global.imagePullPolicy=Never \
    --set sso.env.BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-changeme-better-auth}" \
    --set sso.postgresql.password="${POSTGRES_SSO_PASSWORD:-changeme-sso}" \
    --set sso.smtp.password="${SMTP_PASS:-}" \
    --set api.postgresql.password="${POSTGRES_API_PASSWORD:-changeme-api}" \
    --set api.jwtSecret="${JWT_SECRET:-changeme-jwt}" \
    --set api.openai.apiKey="${OPENAI_API_KEY:-}" \
    --set mcpServer.mcpApiKey="${MCP_API_KEY:-changeme-mcp}" \
    --wait \
    --timeout 15m

echo ""
echo "✅ Deployment complete!"
echo ""

# Show pod status
echo "📊 Pod Status:"
kubectl get pods -n taskflow
echo ""

# Optional: Start pgAdmin
if [ "$PGADMIN" = true ]; then
  echo "🔧 Starting pgAdmin..."
  if [ -f ./scripts/utils/add-pgadmin.sh ]; then
    ./scripts/utils/add-pgadmin.sh
  elif [ -f ./scripts/add-pgadmin.sh ]; then
    ./scripts/add-pgadmin.sh
  else
    echo "⚠️  pgAdmin script not found - skipping"
  fi
  echo ""
fi

# Optional: Start port-forwards
if [ "$PORTFORWARD" = true ]; then
  echo "🔌 Starting port-forwards..."
  ./scripts/utils/start-port-forwards.sh
  echo ""
else
  echo "💡 To access services, start port-forwards:"
  echo "   ./scripts/utils/start-port-forwards.sh"
  echo ""
fi

echo "✅ All Done!"
echo ""
echo "🌍 Services:"
echo "   - Web Dashboard: http://localhost:3000"
echo "   - SSO Platform:  http://localhost:3001"
echo "   - API Docs:      http://localhost:8000/docs"
if [ "$PGADMIN" = true ]; then
  echo "   - pgAdmin:       http://localhost:5050"
fi
echo ""
echo "📋 Useful commands:"
echo "   ./scripts/deploy-local.sh --skip-cleanup --port-forward        # Fast upgrade (2-3 min)"
echo "   ./scripts/deploy-local.sh --rebuild --skip-cleanup             # Rebuild + fast upgrade"
echo "   ./scripts/deploy-local.sh --pgadmin --port-forward             # Clean deploy with extras"
echo "   kubectl get pods -n taskflow -w                                # Watch pods"
echo "   kubectl logs -n taskflow -l app=sso-platform                   # View SSO logs"
echo "   kubectl delete namespace taskflow                              # Clean up"
echo ""
