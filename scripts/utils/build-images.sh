#!/usr/bin/env bash
# TaskFlow - Build all Docker images for Kubernetes deployment
# Usage: ./scripts/build-images.sh [--push] [--registry <registry>]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="${REGISTRY:-taskflow}"
VERSION="${VERSION:-latest}"
PUSH=false
PARALLEL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --push)
      PUSH=true
      shift
      ;;
    --parallel)
      PARALLEL=true
      shift
      ;;
    --registry)
      REGISTRY="$2"
      shift 2
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Function to build image with retry logic
build_image() {
  local name=$1
  local dockerfile=$2
  local context=$3
  local target=${4:-}  # Optional target stage
  local tag="${REGISTRY}/${name}:${VERSION}"
  local max_retries=3
  local retry=0

  echo -e "${YELLOW}Building ${name}...${NC}"

  local build_cmd="docker build -t ${tag} -f ${dockerfile}"
  if [ -n "$target" ]; then
    build_cmd="$build_cmd --target $target"
  fi
  build_cmd="$build_cmd ${context}"

  while [ $retry -lt $max_retries ]; do
    if eval $build_cmd; then
      echo -e "${GREEN}✓ Built ${tag}${NC}"

      if [ "$PUSH" = true ]; then
        echo -e "${YELLOW}Pushing ${tag}...${NC}"
        docker push "${tag}"
        echo -e "${GREEN}✓ Pushed ${tag}${NC}"
      fi
      return 0
    else
      retry=$((retry + 1))
      if [ $retry -lt $max_retries ]; then
        echo -e "${YELLOW}⚠ Build failed, retrying (${retry}/${max_retries})...${NC}"
        sleep 5
      fi
    fi
  done

  echo -e "${RED}✗ Failed to build ${tag} after ${max_retries} attempts${NC}"
  return 1
}

echo -e "${GREEN}=== TaskFlow Docker Image Build ===${NC}"
echo "Registry: ${REGISTRY}"
echo "Version: ${VERSION}"
echo "Push: ${PUSH}"
echo "Parallel: ${PARALLEL}"
echo ""

# Verify Minikube is running
if ! minikube status > /dev/null 2>&1; then
  echo -e "${RED}✗ Minikube is not running. Start it with: minikube start${NC}"
  exit 1
fi

# Configure Docker to use Minikube's daemon
echo -e "${YELLOW}Configuring Docker to use Minikube's daemon...${NC}"
eval $(minikube docker-env)

# Build images
if [ "$PARALLEL" = true ]; then
  echo -e "${YELLOW}Building images in PARALLEL mode (2 at a time)...${NC}"
  echo ""

  # Create temp dir for build logs
  LOG_DIR=$(mktemp -d)

  # SSO images must be sequential (share Dockerfile cache)
  echo -e "${YELLOW}[1/4] Building SSO migrations...${NC}"
  build_image "sso-platform-migrations" "apps/sso/Dockerfile" "apps/sso" "builder"

  echo -e "${YELLOW}[2/4] Building SSO runner...${NC}"
  build_image "sso-platform" "apps/sso/Dockerfile" "apps/sso" "runner"

  # Batch 1: API + MCP + Notification Service (3 parallel)
  echo -e "${YELLOW}[3/5] Building API + MCP + Notification Service in parallel...${NC}"
  PIDS=()
  NAMES=()

  build_image "api" "apps/api/Dockerfile" "apps/api" > "${LOG_DIR}/api.log" 2>&1 &
  PIDS+=($!)
  NAMES+=("api")

  build_image "mcp-server" "apps/mcp-server/Dockerfile" "apps/mcp-server" > "${LOG_DIR}/mcp-server.log" 2>&1 &
  PIDS+=($!)
  NAMES+=("mcp-server")

  build_image "notification-service" "apps/notification-service/Dockerfile" "apps/notification-service" > "${LOG_DIR}/notification-service.log" 2>&1 &
  PIDS+=($!)
  NAMES+=("notification-service")

  # Progress indicator while waiting
  START_TIME=$SECONDS
  while true; do
    STILL_RUNNING=()
    for i in "${!PIDS[@]}"; do
      if kill -0 "${PIDS[$i]}" 2>/dev/null; then
        STILL_RUNNING+=("${NAMES[$i]}")
      fi
    done

    if [ ${#STILL_RUNNING[@]} -eq 0 ]; then
      break
    fi

    ELAPSED=$((SECONDS - START_TIME))
    echo -ne "\r⏳ ${ELAPSED}s - building: ${STILL_RUNNING[*]}...          "
    sleep 5
  done
  echo ""

  # Check results for batch 1
  FAILED=()
  for i in "${!PIDS[@]}"; do
    if wait "${PIDS[$i]}"; then
      echo -e "${GREEN}✓ ${NAMES[$i]} completed${NC}"
    else
      echo -e "${RED}✗ ${NAMES[$i]} failed${NC}"
      FAILED+=("${NAMES[$i]}")
      echo -e "${YELLOW}--- ${NAMES[$i]} build log (last 50 lines) ---${NC}"
      tail -50 "${LOG_DIR}/${NAMES[$i]}.log"
      echo -e "${YELLOW}--- end log ---${NC}"
    fi
  done

  if [ ${#FAILED[@]} -gt 0 ]; then
    rm -rf "${LOG_DIR}"
    echo -e "${RED}✗ Failed builds: ${FAILED[*]}${NC}"
    exit 1
  fi

  # Batch 2: Web (sequential - give it full resources)
  echo -e "${YELLOW}[4/5] Building Web dashboard...${NC}"
  build_image "web-dashboard" "apps/web/Dockerfile" "apps/web"

  echo -e "${GREEN}[5/5] All images built${NC}"

  # Cleanup
  rm -rf "${LOG_DIR}"
else
  # Sequential builds (original behavior)
  # SSO Platform: Build both migrations (builder stage) and runner images
  build_image "sso-platform-migrations" "apps/sso/Dockerfile" "apps/sso" "builder"
  build_image "sso-platform" "apps/sso/Dockerfile" "apps/sso" "runner"
  build_image "api" "apps/api/Dockerfile" "apps/api"
  build_image "mcp-server" "apps/mcp-server/Dockerfile" "apps/mcp-server"
  build_image "notification-service" "apps/notification-service/Dockerfile" "apps/notification-service"
  build_image "web-dashboard" "apps/web/Dockerfile" "apps/web"
fi

echo ""
echo -e "${GREEN}=== Build Complete ===${NC}"
echo "Images built:"
echo "  - ${REGISTRY}/sso-platform-migrations:${VERSION} (for DB migrations)"
echo "  - ${REGISTRY}/sso-platform:${VERSION} (slim production)"
echo "  - ${REGISTRY}/api:${VERSION}"
echo "  - ${REGISTRY}/mcp-server:${VERSION}"
echo "  - ${REGISTRY}/notification-service:${VERSION}"
echo "  - ${REGISTRY}/web-dashboard:${VERSION}"

# Load images into Minikube (if not pushing to registry)
if [ "$PUSH" = false ]; then
  echo ""
  echo -e "${YELLOW}Images are available in Minikube's Docker daemon${NC}"
  echo "Run: minikube image ls | grep taskflow"
fi
