#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Add pgAdmin to Kubernetes for Database Management
# Similar to docker-compose setup
###############################################################################

echo "🔧 Adding pgAdmin to TaskFlow deployment..."
echo ""

# Check if pgAdmin is already running
if kubectl get deployment pgadmin -n taskflow > /dev/null 2>&1; then
  echo "✅ pgAdmin already deployed!"
  echo ""
else
  echo "📦 Deploying pgAdmin..."

  # Create pgAdmin deployment
  kubectl apply -f - <<EOF
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: pgadmin-config
  namespace: taskflow
data:
  servers.json: |
    {
      "Servers": {
        "1": {
          "Name": "SSO Database",
          "Group": "TaskFlow",
          "Host": "sso-postgres",
          "Port": 5432,
          "MaintenanceDB": "sso_db",
          "Username": "sso_user",
          "SSLMode": "prefer"
        },
        "2": {
          "Name": "API Database",
          "Group": "TaskFlow",
          "Host": "api-postgres",
          "Port": 5432,
          "MaintenanceDB": "taskflow_db",
          "Username": "taskflow_user",
          "SSLMode": "prefer"
        }
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgadmin
  namespace: taskflow
  labels:
    app: pgadmin
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pgadmin
  template:
    metadata:
      labels:
        app: pgadmin
    spec:
      containers:
      - name: pgadmin
        image: dpage/pgadmin4:latest
        ports:
        - containerPort: 80
          name: http
        env:
        - name: PGADMIN_DEFAULT_EMAIL
          value: "admin@taskflow.dev"
        - name: PGADMIN_DEFAULT_PASSWORD
          value: "admin"
        - name: PGADMIN_CONFIG_SERVER_MODE
          value: "False"
        - name: PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED
          value: "False"
        volumeMounts:
        - name: pgadmin-config
          mountPath: /pgadmin4/servers.json
          subPath: servers.json
          readOnly: true
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: pgadmin-config
        configMap:
          name: pgadmin-config
---
apiVersion: v1
kind: Service
metadata:
  name: pgadmin
  namespace: taskflow
  labels:
    app: pgadmin
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 80
    name: http
  selector:
    app: pgadmin
EOF

  echo "✅ pgAdmin deployed!"
  echo ""
fi

# Wait for pgAdmin to be ready
echo "⏳ Waiting for pgAdmin to be ready..."
kubectl wait --for=condition=Ready pod -l app=pgadmin -n taskflow --timeout=60s

echo ""
echo "✅ pgAdmin is ready!"
echo ""

# Start port-forward in background
echo "🔌 Starting port-forward for pgAdmin..."
pkill -f "port-forward.*pgadmin" || true
sleep 1
kubectl port-forward -n taskflow svc/pgadmin 5050:80 > /tmp/pf-pgadmin.log 2>&1 &

sleep 2
echo "✅ pgAdmin accessible at: http://localhost:5050"
echo ""
echo "📊 Login credentials:"
echo "   Email: admin@taskflow.dev"
echo "   Password: admin"
echo ""
echo "🔐 Database passwords (you'll need these to connect):"
echo "   SSO DB Password:"
kubectl get secret sso-postgres-secret -n taskflow -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d && echo ""
echo "   API DB Password:"
kubectl get secret api-postgres-secret -n taskflow -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d && echo ""
echo ""
echo "💡 The servers are pre-configured. Just enter the passwords above when prompted."
echo ""
