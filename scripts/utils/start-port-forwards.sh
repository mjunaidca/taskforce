#!/bin/bash
# Port-forward all TaskFlow services to localhost
# Run this in a separate terminal and keep it open

set -e

echo "🚀 Starting port-forwards for TaskFlow services..."
echo "Keep this terminal open while working with TaskFlow"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all port-forwards..."
    jobs -p | xargs -r kill
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if namespace exists
if ! kubectl get namespace taskflow &>/dev/null; then
    echo "❌ Namespace 'taskflow' not found. Deploy TaskFlow first."
    exit 1
fi

# Check if services exist
echo "Checking services..."
kubectl get svc -n taskflow web-dashboard sso-platform taskflow-api &>/dev/null || {
    echo "❌ Services not found. Deploy TaskFlow first."
    exit 1
}

echo "✅ All services found"
echo ""

# Start port-forwards in background
echo "📡 Forwarding ports..."
kubectl port-forward -n taskflow svc/web-dashboard 3000:3000 &
PID1=$!
sleep 1

kubectl port-forward -n taskflow svc/sso-platform 3001:3001 &
PID2=$!
sleep 1

kubectl port-forward -n taskflow svc/taskflow-api 8000:8000 &
PID3=$!
sleep 1

kubectl port-forward -n taskflow svc/mcp-server 8001:8001 &
PID4=$!
sleep 1

# Notification Service (optional - only if Dapr enabled)
# Service runs on internal port 8001, we expose it locally on 8002 to avoid conflict with MCP server
if kubectl get svc taskflow-notification -n taskflow &>/dev/null; then
    kubectl port-forward -n taskflow svc/taskflow-notification 8002:8001 &
    PID5=$!
    sleep 1
    NOTIFICATION_MSG="   - Notifications:  http://localhost:8002/health"
else
    NOTIFICATION_MSG=""
fi

# pgAdmin (optional - only if deployed)
if kubectl get svc pgadmin -n taskflow &>/dev/null; then
    kubectl port-forward -n taskflow svc/pgadmin 5050:80 &
    PID6=$!
    sleep 1
    PGADMIN_MSG="   - pgAdmin:        http://localhost:5050"
else
    PGADMIN_MSG=""
fi

echo ""
echo "✅ Port-forwards active!"
echo ""
echo "🌐 Access your services:"
echo "   - Web Dashboard:  http://localhost:3000"
echo "   - SSO Platform:   http://localhost:3001"
echo "   - API Docs:       http://localhost:8000/docs"
echo "   - MCP Server:     http://localhost:8001"
[ -n "$NOTIFICATION_MSG" ] && echo "$NOTIFICATION_MSG"
[ -n "$PGADMIN_MSG" ] && echo "$PGADMIN_MSG"
echo ""
echo "💡 Press Ctrl+C to stop all port-forwards"
echo ""

# Wait for all background jobs
wait
