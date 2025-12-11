#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# TaskFlow Production Deployment (Managed Services)
#
# Uses Neon PostgreSQL + Upstash Redis instead of in-cluster databases.
# This makes the cluster lightweight and reliable.
#
# Prerequisites:
#   1. Copy .env.prod.example to .env.prod
#   2. Fill in Neon and Upstash credentials
#   3. Run this script
#
# Usage:
#   ./scripts/deploy-prod.sh                    # Deploy with managed services
#   ./scripts/deploy-prod.sh --port-forward     # Deploy + start port-forwards
#   ./scripts/deploy-prod.sh --rebuild          # Rebuild images + deploy
###############################################################################

# Parse flags
PORTFORWARD=false
REBUILD=false
PARALLEL=false

for arg in "$@"; do
  case $arg in
    --port-forward)
      PORTFORWARD=true
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
      echo "Usage: $0 [--port-forward] [--rebuild] [--parallel]"
      exit 1
      ;;
  esac
done

echo "🚀 TaskFlow Production Deployment (Managed Services)"
echo "====================================================="
echo ""
echo "📦 Using: Neon PostgreSQL + Upstash Redis"
echo "   No in-cluster databases = lightweight & reliable"
echo ""

# Check for .env.prod
if [ ! -f .env.prod ]; then
  echo "❌ .env.prod not found!"
  echo ""
  echo "   1. Copy the example file:"
  echo "      cp .env.prod.example .env.prod"
  echo ""
  echo "   2. Fill in your Neon and Upstash credentials"
  echo ""
  echo "   3. Run this script again"
  exit 1
fi

# Load environment
echo "📄 Loading .env.prod..."
set -a
source .env.prod
set +a

# Validate required variables
REQUIRED_VARS=(
  "NEON_SSO_DATABASE_URL"
  "NEON_API_DATABASE_URL"
  "NEON_CHATKIT_DATABASE_URL"
  "NEON_NOTIFICATION_DATABASE_URL"
  "UPSTASH_REDIS_HOST"
  "UPSTASH_REDIS_PASSWORD"
  "REDIS_URL"
  "REDIS_TOKEN"
  "BETTER_AUTH_SECRET"
)

MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    MISSING+=("$var")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "❌ Missing required variables in .env.prod:"
  for var in "${MISSING[@]}"; do
    echo "   - $var"
  done
  exit 1
fi

echo "✅ All required variables set"
echo ""

# Check Minikube
echo "🔍 Checking Minikube..."
if ! minikube status > /dev/null 2>&1; then
  echo "❌ Minikube is not running!"
  echo "   Start it with: minikube start --memory=4096 --cpus=2"
  exit 1
fi
echo "✅ Minikube running"
echo ""

# Switch to Minikube Docker
echo "🐳 Configuring Docker environment..."
eval $(minikube docker-env)
echo "✅ Using Minikube Docker"
echo ""

# Check if images exist, build if missing
# Note: sso-platform-migrations NOT needed for Neon (run migrations locally)
echo "🏗️  Checking Docker images..."
REQUIRED_IMAGES=("taskflow/sso-platform" "taskflow/api" "taskflow/mcp-server" "taskflow/notification-service" "taskflow/web-dashboard")
MISSING_IMAGES=()

for img in "${REQUIRED_IMAGES[@]}"; do
  if ! docker images --format "{{.Repository}}" | grep -q "^${img}$"; then
    MISSING_IMAGES+=("$img")
  fi
done

if [ ${#MISSING_IMAGES[@]} -gt 0 ]; then
  echo "⚠️  Missing images: ${MISSING_IMAGES[*]}"
  echo "   Building now (first time only)..."
  BUILD_FLAGS=""
  if [ "$PARALLEL" = true ]; then
    BUILD_FLAGS="--parallel"
    echo "   ⚡ PARALLEL mode - ~3-5 minutes"
  else
    echo "   This takes ~5-10 minutes..."
  fi
  echo ""
  if ! ./scripts/utils/build-images.sh $BUILD_FLAGS; then
    echo "❌ Image build failed! Check errors above."
    exit 1
  fi
  echo ""
elif [ "$REBUILD" = true ]; then
  echo "🔨 Rebuilding images (--rebuild flag set)..."
else
  echo "✅ All 5 images available (migrations skipped for Neon)"
fi
echo ""

# Build images if --rebuild flag set
if [ "$REBUILD" = true ]; then
  echo "🏗️  Rebuilding images..."
  BUILD_FLAGS=""
  if [ "$PARALLEL" = true ]; then
    BUILD_FLAGS="--parallel"
    echo "   ⚡ PARALLEL mode"
  fi
  ./scripts/utils/build-images.sh $BUILD_FLAGS
  echo ""
fi

# Install Dapr
echo "🔧 Checking Dapr..."
helm repo add dapr https://dapr.github.io/helm-charts/ 2>/dev/null || true
helm repo update dapr > /dev/null 2>&1

if ! helm list -n dapr-system 2>/dev/null | grep -q "dapr"; then
  echo "📦 Installing Dapr..."
  helm upgrade --install dapr dapr/dapr \
    --version=1.15 \
    --namespace dapr-system \
    --create-namespace \
    --wait
fi
echo "✅ Dapr ready"
echo ""

# Deploy with Helm
echo "📦 Deploying TaskFlow (managed services mode)..."
echo "   - No PostgreSQL pods (using Neon)"
echo "   - No Redis pod (using Upstash)"
echo "   - Faster startup (no wait-for-db)"
echo ""

helm upgrade --install taskflow ./infrastructure/helm/taskflow \
    --namespace taskflow \
    --create-namespace \
    --set global.imagePullPolicy=Never \
    --set managedServices.neon.enabled=true \
    --set sso.migrations.enabled=false \
    --set "managedServices.neon.ssoDatabase=${NEON_SSO_DATABASE_URL}" \
    --set "managedServices.neon.apiDatabase=${NEON_API_DATABASE_URL}" \
    --set "managedServices.neon.chatkitDatabase=${NEON_CHATKIT_DATABASE_URL}" \
    --set "managedServices.neon.notificationDatabase=${NEON_NOTIFICATION_DATABASE_URL}" \
    --set managedServices.upstash.enabled=true \
    --set "managedServices.upstash.host=${UPSTASH_REDIS_HOST}" \
    --set "managedServices.upstash.password=${UPSTASH_REDIS_PASSWORD}" \
    --set "managedServices.upstash.restUrl=${REDIS_URL}" \
    --set "managedServices.upstash.restToken=${REDIS_TOKEN}" \
    --set "sso.env.BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}" \
    --set "api.openai.apiKey=${OPENAI_API_KEY:-}" \
    --set "sso.smtp.password=${SMTP_PASS:-}" \
    --set notificationService.enabled=true \
    --set dapr.enabled=true \
    --wait \
    --timeout 10m

echo ""
echo "✅ Deployment complete!"
echo ""

# Show pods
echo "📊 Pod Status:"
kubectl get pods -n taskflow
echo ""

# Compare with local deployment
echo "💡 Cluster is lightweight:"
echo "   - 5 pods (SSO, API, MCP, Notification, Web)"
echo "   - No database pods (Neon handles it)"
echo "   - No Redis pod (Upstash handles it)"
echo ""

# Port forwards
if [ "$PORTFORWARD" = true ]; then
  echo "🔌 Starting port-forwards..."
  ./scripts/utils/start-port-forwards.sh
else
  echo "💡 To access services:"
  echo "   ./scripts/utils/start-port-forwards.sh"
fi

echo ""
echo "✅ All Done!"
echo ""
echo "🌍 Services (after port-forward):"
echo "   - Web Dashboard: http://localhost:3000"
echo "   - SSO Platform:  http://localhost:3001"
echo "   - API Docs:      http://localhost:8000/docs"
echo ""
echo "🔧 Database Management:"
echo "   - Use Neon Console: https://console.neon.tech/"
echo "   - No pgAdmin needed"
echo ""
