# SMTP Configuration for Better Auth

## Overview

Better Auth auto-detects SMTP environment variables for email verification, password reset, and magic links.

## Environment Variables

```env
# SMTP Server Configuration
SMTP_HOST=smtp.gmail.com                    # Gmail SMTP server
SMTP_PORT=587                                # TLS port (587 for STARTTLS, 465 for SSL)
SMTP_SECURE=false                            # false for STARTTLS (port 587), true for SSL (port 465)
SMTP_USER=your-email@gmail.com              # Your Gmail address
SMTP_PASS=your-app-specific-password        # Gmail App Password (not regular password!)
EMAIL_FROM=no-reply@yourdomain.com          # From address for emails

# Optional: Email Service Provider
SMTP_SERVICE=gmail                           # Auto-configures for Gmail (optional if using SMTP_HOST)
```

## Gmail App Password Setup

**IMPORTANT**: Never use your regular Gmail password. Always use App Passwords.

### Steps to Create Gmail App Password:

1. **Enable 2-Factor Authentication**:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification if not already enabled

2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Better Auth" or "TaskFlow"
   - Click "Generate"
   - Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

3. **Remove Spaces**:
   ```env
   # Generated: gavr qhfd zbxl eoot
   SMTP_PASS=gavrqhfdzbxleoot
   ```

## Better Auth Configuration

### Auto-Detection

Better Auth automatically detects SMTP variables - no additional configuration needed!

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: { /* ... */ },
  // SMTP is auto-configured from environment variables
  // No explicit emailAndPassword config required!
});
```

### Manual Configuration (Optional)

Only needed if using non-standard variable names:

```typescript
import { betterAuth } from "better-auth";
import nodemailer from "nodemailer";

export const auth = betterAuth({
  database: { /* ... */ },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Reset your password",
        html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
      });
    },
  },
});
```

## Kubernetes/Helm Integration

### 1. Helm Values (values.yaml)

```yaml
sso:
  env:
    NODE_ENV: development  # Use development for localhost

  # SMTP Configuration
  smtp:
    enabled: true
    host: smtp.gmail.com
    port: "587"
    user: your-email@gmail.com
    password: changeme  # Overridden via --set flag
    secure: "false"
    emailFrom: no-reply@yourdomain.com
```

### 2. ConfigMap (Non-Sensitive Variables)

```yaml
# helm/taskflow/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sso-platform-config
data:
  NODE_ENV: {{ .Values.sso.env.NODE_ENV | quote }}
  BETTER_AUTH_URL: {{ .Values.sso.env.BETTER_AUTH_URL | quote }}
  {{- if .Values.sso.smtp.enabled }}
  SMTP_HOST: {{ .Values.sso.smtp.host | quote }}
  SMTP_PORT: {{ .Values.sso.smtp.port | quote }}
  SMTP_USER: {{ .Values.sso.smtp.user | quote }}
  SMTP_SECURE: {{ .Values.sso.smtp.secure | quote }}
  EMAIL_FROM: {{ .Values.sso.smtp.emailFrom | quote }}
  {{- end }}
```

### 3. Secret (Sensitive Variables)

```yaml
# helm/taskflow/templates/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: sso-platform-secret
type: Opaque
stringData:
  BETTER_AUTH_SECRET: {{ .Values.sso.env.BETTER_AUTH_SECRET | quote }}
  DATABASE_PASSWORD: {{ .Values.sso.postgresql.password | quote }}
  {{- if .Values.sso.smtp.enabled }}
  SMTP_PASS: {{ .Values.sso.smtp.password | quote }}
  {{- end }}
```

### 4. Deployment (Inject Variables)

```yaml
# helm/taskflow/templates/sso-platform/deployment.yaml
spec:
  containers:
  - name: sso-platform
    envFrom:
    - configMapRef:
        name: sso-platform-config
    env:
    - name: BETTER_AUTH_SECRET
      valueFrom:
        secretKeyRef:
          name: sso-platform-secret
          key: BETTER_AUTH_SECRET
    {{- if .Values.sso.smtp.enabled }}
    - name: SMTP_PASS
      valueFrom:
        secretKeyRef:
          name: sso-platform-secret
          key: SMTP_PASS
    {{- end }}
```

### 5. Deployment Script

```bash
#!/usr/bin/env bash

# Load .env file
set -a
source .env
set +a

# Deploy with SMTP support
helm upgrade --install taskflow ./helm/taskflow \
    --namespace taskflow \
    --set sso.env.BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET}" \
    --set sso.smtp.password="${SMTP_PASS}" \
    --wait
```

## Verification

### Check Environment Variables in Pod

```bash
kubectl exec -n taskflow -l app.kubernetes.io/component=sso -- sh -c 'env | grep -E "(SMTP|EMAIL)" | sort'
```

Expected output:
```
EMAIL_FROM=no-reply@taskflow.org
SMTP_HOST=smtp.gmail.com
SMTP_PASS=gavrqhfdzbxleoot
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
```

### Test Email Sending

```bash
# Sign up with new account (triggers verification email)
curl -X POST http://localhost:3001/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'

# Check SSO logs for email sending
kubectl logs -n taskflow -l app.kubernetes.io/component=sso --tail=50 | grep -i email
```

## Common SMTP Providers

### Gmail (Recommended for Development)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

### Outlook/Office 365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@yourdomain.com
```

### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### AWS SES

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@yourdomain.com
```

## Troubleshooting

### "Authentication failed" Error

**Cause**: Using regular password instead of App Password (Gmail)
**Solution**: Generate and use Gmail App Password

### "Connection timeout" Error

**Cause**: Wrong port or firewall blocking
**Solution**:
- Use port 587 for STARTTLS
- Use port 465 for SSL
- Check firewall rules

### Emails Not Sending

**Cause**: SMTP variables not loaded
**Solution**:
1. Verify variables in pod:
   ```bash
   kubectl exec -n taskflow -l app.kubernetes.io/component=sso -- sh -c 'env | grep SMTP'
   ```
2. Check SSO logs for errors:
   ```bash
   kubectl logs -n taskflow -l app.kubernetes.io/component=sso --tail=100
   ```

### "Invalid sender" Error

**Cause**: EMAIL_FROM domain doesn't match SMTP_USER domain
**Solution**: Some providers (like Gmail) allow any FROM address, but others require matching domains

## Security Best Practices

1. **Never commit SMTP credentials**:
   - Use `.env` file (add to `.gitignore`)
   - Use Kubernetes Secrets in production
   - Use secret management tools (Vault, AWS Secrets Manager)

2. **Use App Passwords**:
   - Gmail: App Passwords (not regular password)
   - Never use admin/root email accounts

3. **Rotate credentials regularly**:
   - Change App Passwords every 90 days
   - Update Kubernetes Secrets after rotation

4. **Use dedicated email accounts**:
   - Create `noreply@yourdomain.com` for automated emails
   - Don't use personal email accounts

5. **Monitor sending limits**:
   - Gmail: 500 emails/day for free accounts
   - Use dedicated SMTP providers (SendGrid, Mailgun) for production

## Production Recommendations

1. **Use dedicated SMTP providers**:
   - SendGrid (12,000 free emails/month)
   - Mailgun (5,000 free emails/month)
   - AWS SES (62,000 free emails/month)

2. **Configure SPF, DKIM, DMARC**:
   - Improves email deliverability
   - Prevents emails from going to spam

3. **Use environment-specific configurations**:
   ```yaml
   # values-dev.yaml
   smtp:
     enabled: true
     host: smtp.gmail.com

   # values-prod.yaml
   smtp:
     enabled: true
     host: smtp.sendgrid.net
   ```

4. **Monitor email sending**:
   - Track delivery rates
   - Monitor bounce rates
   - Set up alerts for failures
