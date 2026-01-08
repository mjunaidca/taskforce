# CORS Configuration for Better Auth

## Overview

Better Auth requires proper CORS configuration to allow cross-origin requests from tenant applications. The configuration differs between development and production environments.

## Environment-Specific Configuration

### Development (Localhost with Port-Forwarding)

```yaml
# helm/taskflow/values.yaml
sso:
  env:
    NODE_ENV: development
    BETTER_AUTH_URL: http://localhost:3001
    ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:3001"
```

**Why NODE_ENV=development?**
- Relaxed CORS policies
- Allows HTTP (not just HTTPS)
- Better error messages
- Easier debugging

### Production (With Ingress/Domain)

```yaml
# helm/taskflow/values-prod.yaml
sso:
  env:
    NODE_ENV: production
    BETTER_AUTH_URL: https://sso.taskflow.com
    ALLOWED_ORIGINS: "https://app.taskflow.com,https://dashboard.taskflow.com"
```

**Why NODE_ENV=production?**
- Strict CORS policies
- Requires HTTPS
- Minimal error messages (security)
- Production-grade security

## Common CORS Errors

### "Invalid origin" Error

**Error Message**:
```
Error: Invalid origin
at validateOrigin
```

**Root Causes**:
1. NODE_ENV=production with HTTP URLs (requires HTTPS)
2. ALLOWED_ORIGINS is empty or missing
3. Origin not in ALLOWED_ORIGINS list
4. BETTER_AUTH_URL doesn't match actual URL being accessed

**Solutions**:

#### For Local Development
```yaml
sso:
  env:
    NODE_ENV: development  # Changed from production
    BETTER_AUTH_URL: http://localhost:3001  # Not http://sso.taskflow.local
    ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:3001"
```

#### For Production
```yaml
sso:
  env:
    NODE_ENV: production
    BETTER_AUTH_URL: https://sso.taskflow.com  # HTTPS required
    ALLOWED_ORIGINS: "https://app.taskflow.com"  # HTTPS required
```

## Better Auth CORS Configuration

### Auto-Configuration (Better Auth 1.0+)

Better Auth auto-detects `ALLOWED_ORIGINS` environment variable:

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: { /* ... */ },
  // CORS auto-configured from ALLOWED_ORIGINS env var
  // No additional config needed!
});
```

### Manual Configuration

Only needed if using non-standard variable names or complex patterns:

```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: { /* ... */ },
  trustedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [],
});
```

## Kubernetes/Helm Integration

### 1. Helm Values

```yaml
# helm/taskflow/values.yaml
sso:
  env:
    NODE_ENV: development
    BETTER_AUTH_URL: http://localhost:3001
    ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:3001"
```

### 2. ConfigMap

```yaml
# helm/taskflow/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sso-platform-config
data:
  NODE_ENV: {{ .Values.sso.env.NODE_ENV | quote }}
  BETTER_AUTH_URL: {{ .Values.sso.env.BETTER_AUTH_URL | quote }}
  ALLOWED_ORIGINS: {{ .Values.sso.env.ALLOWED_ORIGINS | default "http://localhost:3000,http://localhost:3001" | quote }}
```

### 3. Deployment

```yaml
# helm/taskflow/templates/sso-platform/deployment.yaml
spec:
  containers:
  - name: sso-platform
    envFrom:
    - configMapRef:
        name: sso-platform-config
```

## Verification

### Check Environment Variables in Pod

```bash
kubectl exec -n taskflow -l app.kubernetes.io/component=sso -- sh -c 'env | grep -E "(NODE_ENV|BETTER_AUTH_URL|ALLOWED_ORIGINS)"'
```

Expected output (development):
```
NODE_ENV=development
BETTER_AUTH_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

Expected output (production):
```
NODE_ENV=production
BETTER_AUTH_URL=https://sso.taskflow.com
ALLOWED_ORIGINS=https://app.taskflow.com,https://dashboard.taskflow.com
```

### Test CORS

```bash
# Test from Web Dashboard (should succeed)
curl -X POST http://localhost:3001/api/auth/sign-in \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@taskflow.org","password":"admin123"}' \
  -v

# Look for CORS headers in response:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Credentials: true
```

## OAuth Callback URLs

### Development

```typescript
// Client-side (app/login/page.tsx)
const params = new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: "http://localhost:3000/api/auth/callback",  // localhost
  response_type: "code",
  scope: "openid profile email",
});
```

### Production

```typescript
// Client-side (app/login/page.tsx)
const params = new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: "https://app.taskflow.com/api/auth/callback",  // HTTPS
  response_type: "code",
  scope: "openid profile email",
});
```

## Environment Variable Matrix

| Variable | Development | Production |
|----------|-------------|------------|
| `NODE_ENV` | `development` | `production` |
| `BETTER_AUTH_URL` | `http://localhost:3001` | `https://sso.taskflow.com` |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001` | `https://app.taskflow.com,https://dashboard.taskflow.com` |
| `redirect_uri` | `http://localhost:3000/api/auth/callback` | `https://app.taskflow.com/api/auth/callback` |

## Troubleshooting

### Error: "Invalid origin" with localhost URLs

**Cause**: NODE_ENV=production requires HTTPS, but you're using HTTP localhost
**Fix**:
```yaml
sso:
  env:
    NODE_ENV: development  # Changed from production
```

### Error: CORS blocked, no Access-Control-Allow-Origin header

**Cause**: ALLOWED_ORIGINS is empty or doesn't include the requesting origin
**Fix**:
```yaml
sso:
  env:
    ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:3001"
```

### OAuth callback fails with "Invalid origin"

**Cause**: BETTER_AUTH_URL doesn't match how you're accessing the service
**Fix**:
```yaml
# For port-forwarding (kubectl port-forward)
sso:
  env:
    BETTER_AUTH_URL: http://localhost:3001  # Not http://sso.taskflow.local

# For ingress
sso:
  env:
    BETTER_AUTH_URL: https://sso.taskflow.com  # Use actual domain
```

### Changes not taking effect after Helm upgrade

**Cause**: ConfigMap updated but pods not restarted
**Fix**:
```bash
# After helm upgrade
kubectl delete pod -n taskflow -l app.kubernetes.io/component=sso

# Verify new values
kubectl exec -n taskflow -l app.kubernetes.io/component=sso -- sh -c 'env | grep -E "(NODE_ENV|ALLOWED_ORIGINS)"'
```

## Security Best Practices

### Development

1. **Use localhost URLs**: Don't expose development instances to public internet
2. **Keep ALLOWED_ORIGINS restricted**: Only include localhost ports you're actually using
3. **Use httpOnly cookies**: Even in development (already default in Better Auth)

### Production

1. **Always use HTTPS**: Never allow HTTP in production
2. **Restrict ALLOWED_ORIGINS**: Only include your actual application domains
3. **Don't use wildcards**: Explicitly list each allowed origin
4. **Use environment-specific values**: Don't hardcode production URLs in code

### Wrong (Security Risk)

```yaml
sso:
  env:
    ALLOWED_ORIGINS: "*"  # ❌ Allows ANY origin
```

### Right (Secure)

```yaml
sso:
  env:
    ALLOWED_ORIGINS: "https://app.taskflow.com,https://dashboard.taskflow.com"  # ✅ Explicit list
```

## Multi-Environment Setup

### Using Helm Value Files

```bash
# Development
helm upgrade --install taskflow ./helm/taskflow \
  --values helm/taskflow/values.yaml \
  --values helm/taskflow/values-dev.yaml

# Production
helm upgrade --install taskflow ./helm/taskflow \
  --values helm/taskflow/values.yaml \
  --values helm/taskflow/values-prod.yaml
```

### values-dev.yaml

```yaml
sso:
  env:
    NODE_ENV: development
    BETTER_AUTH_URL: http://localhost:3001
    ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:3001"
```

### values-prod.yaml

```yaml
sso:
  env:
    NODE_ENV: production
    BETTER_AUTH_URL: https://sso.taskflow.com
    ALLOWED_ORIGINS: "https://app.taskflow.com,https://dashboard.taskflow.com"
```

## Related Configuration

### Cookie Settings

Cookies should match environment:

```typescript
// Development
const cookieOptions = {
  httpOnly: true,
  secure: false,  // HTTP allowed
  sameSite: 'lax' as const,
};

// Production
const cookieOptions = {
  httpOnly: true,
  secure: true,   // HTTPS required
  sameSite: 'strict' as const,  // Stricter in production
};
```

### JWT Token Issuer

Should match BETTER_AUTH_URL:

```typescript
// Better Auth auto-sets issuer from BETTER_AUTH_URL
const { payload } = await jwtVerify(token, JWKS, {
  issuer: process.env.BETTER_AUTH_URL,  // Must match
});
```

## Testing Checklist

- [ ] NODE_ENV matches environment (dev vs prod)
- [ ] BETTER_AUTH_URL matches access URL (localhost vs domain)
- [ ] ALLOWED_ORIGINS includes all app origins
- [ ] OAuth callback URLs use correct protocol (http vs https)
- [ ] Environment variables visible in SSO pod
- [ ] CORS headers present in API responses
- [ ] Sign-in flow works end-to-end
- [ ] No "Invalid origin" errors in console/logs
