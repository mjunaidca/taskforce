# TaskFlow Helm Chart

Complete Kubernetes deployment for TaskFlow platform with **automatic database migrations**.

## ✨ ONE-COMMAND DEPLOYMENT

```bash
./scripts/deploy-one-command.sh
```

That's it! Helm handles everything automatically:
- ✅ Builds Docker images
- ✅ Deploys all services
- ✅ Runs database migrations (instant!)
- ✅ Configures ingress
- ✅ Shows access URLs

## 🎯 Why This Works Out of the Box

### Automatic SQL Migrations

Database migrations run **automatically** via init containers - no manual steps needed!

**How it works**:
1. SQL schema embedded in ConfigMap (`sso-db-schema-sql`)
2. Init container runs before SSO starts: `psql $DATABASE_URL -f /migrations/schema.sql`
3. Completes in < 1 second
4. SSO starts with tables already created

**Your brilliant insight**: "Take all .sql files and run them - eliminates the need for pnpm!"

### What You Get

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **SSO Platform** | 3001 | Better Auth | ✅ Auto-migrated |
| **API** | 8000 | FastAPI backend | ✅ Ready |
| **MCP Server** | 8001 | MCP protocol | ✅ Ready |
| **Web Dashboard** | 3001 | Next.js 16 | ✅ Ready |
| **PostgreSQL (SSO)** | 5432 | Auth database | ✅ Persistent |
| **PostgreSQL (API)** | 5432 | App database | ✅ Persistent |

## 📚 Documentation

- **Quick Start**: See below
- **Complete Guide**: `docs/CLEAN-DEPLOYMENT-GUIDE.md`
- **Migration Details**: `docs/SQL-MIGRATION-APPROACH.md`
- **Troubleshooting**: See Troubleshooting section below

## 🚀 Quick Start

### Prerequisites

```bash
minikube version  # v1.37.0+
helm version      # v3.12+
kubectl version   # v1.34.0+
```

### Option 1: One Command (Recommended)

```bash
minikube start --memory=4096 --cpus=2
./scripts/deploy-one-command.sh
```

### Option 2: Manual Helm

```bash
# Switch to Minikube Docker
eval $(minikube docker-env)

# Build images
./scripts/build-images.sh

# Deploy
helm upgrade --install taskflow ./helm/taskflow \
    --namespace taskflow \
    --create-namespace \
    --set sso.env.BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
    --set sso.postgresql.password="$(openssl rand -base64 16)" \
    --set api.postgresql.password="$(openssl rand -base64 16)" \
    --set api.jwtSecret="$(openssl rand -base64 24)" \
    --set mcpServer.mcpApiKey="$(openssl rand -base64 16)" \
    --wait --timeout 10m
```

## 🌐 Access Services

### Configure DNS

```bash
MINIKUBE_IP=$(minikube ip)
sudo bash -c "cat >> /etc/hosts << EOF
$MINIKUBE_IP    taskflow.local
$MINIKUBE_IP    sso.taskflow.local
$MINIKUBE_IP    api.taskflow.local
EOF"
```

### URLs

- **Web Dashboard**: http://taskflow.local
- **SSO Platform**: http://sso.taskflow.local
- **API**: http://api.taskflow.local/docs

Restart port-forwards to apply:
```bash
  pkill -f "kubectl port-forward"
  ./scripts/utils/start-port-forwards.sh
```

## PG Admin Login

✅ pgAdmin deployed!

⏳ Waiting for pgAdmin to be ready...
pod/pgadmin-6b86d49df-btggw condition met

✅ pgAdmin is ready!

🔌 Starting port-forward for pgAdmin...
✅ pgAdmin accessible at: http://localhost:5050

📊 Login credentials:
   Email: admin@taskflow.dev
   Password: admin

🔐 Database passwords (you'll need these to connect):
   SSO DB Password:
changeme-sso
   API DB Password:
changeme-api

💡 The servers are pre-configured. Just enter the passwords above when prompted.

## 📊 Monitoring

```bash
# Watch deployment
kubectl get pods -n taskflow -w

# Check logs
kubectl logs -l app.kubernetes.io/component=sso -n taskflow

# View migration logs (init container)
kubectl logs sso-platform-xxxxx -n taskflow -c run-migrations
```

## 🔧 Troubleshooting

### SSO CrashLoopBackOff

**Check migration logs**:
```bash
kubectl logs <sso-pod> -n taskflow -c run-migrations
```

**Common fix**: Ensure PostgreSQL is running
```bash
kubectl get pods -n taskflow | grep postgres
```

### Init Containers Stuck

**Check which init container**:
```bash
kubectl describe pod <pod-name> -n taskflow
```

**Fix**: Usually waiting for database - give it 2-3 minutes

### 404 on taskflow.local

**Enable ingress**:
```bash
minikube addons enable ingress
```

## 🧹 Cleanup

```bash
# Delete everything
helm uninstall taskflow -n taskflow
kubectl delete namespace taskflow

# Full reset
minikube delete && minikube start --memory=4096 --cpus=2
```

## 🎓 How Migrations Work

See `docs/SQL-MIGRATION-APPROACH.md` for full details.

**TL;DR**:
- SQL embedded in ConfigMap (`helm/taskflow/templates/sso-db-schema-sql.yaml`)
- Init container applies SQL before app starts
- Instant execution (< 1 second vs 10+ minutes with pnpm)
- Production-ready pattern

## ⚙️ Key Configuration

| Parameter | Description | Required |
|-----------|-------------|----------|
| `sso.env.BETTER_AUTH_SECRET` | Auth secret (32+ chars) | Yes |
| `sso.postgresql.password` | SSO DB password | Yes |
| `api.postgresql.password` | API DB password | Yes |
| `api.jwtSecret` | JWT signing key | Yes |
| `mcpServer.mcpApiKey` | MCP API key | Yes |

All auto-generated by deployment script if not provided.

## 📝 Files Modified for One-Command Deploy

1. **`helm/taskflow/templates/sso-db-schema-sql.yaml`** - SQL ConfigMap
2. **`helm/taskflow/templates/sso-platform/deployment.yaml`** - Added init container
3. **`scripts/deploy-one-command.sh`** - One-command deployment script

## 🎉 Success Criteria

After deployment, you should see:

```bash
$ kubectl get pods -n taskflow
NAME                             READY   STATUS    RESTARTS   AGE
sso-postgres-0                   1/1     Running   0          5m
api-postgres-0                   1/1     Running   0          5m
sso-platform-xxxxx               1/1     Running   0          4m
taskflow-api-xxxxx               1/1     Running   0          4m
mcp-server-xxxxx                 1/1     Running   0          4m
web-dashboard-xxxxx              1/1     Running   0          4m
```

All pods `1/1 Running` = SUCCESS! 🎉

## 📚 Additional Resources

- Phase IV Deployment: `docs/phase-iv-deployment.md`
- Local Development: `docs/LOCAL-DEV-GUIDE.md`
- Architecture: See project root README

---

**Made with ❤️ using the SQL migration approach suggested by the user - eliminating slow pnpm dependencies!**
