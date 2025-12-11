# syntax=docker/dockerfile:1
# =============================================================================
# TaskFlow Web Dashboard - Next.js 16 Dockerfile
# =============================================================================
# Multi-stage build for production-optimized container
#
# Standalone mode enabled via DOCKER_BUILD=true (set in builder stage)
# Local dev: pnpm dev (no standalone)
# PORT: 3000
# =============================================================================

# ----- Stage 1: Dependencies -----
FROM node:22-slim AS deps

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ----- Stage 2: Builder -----
FROM node:22-slim AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (baked into client bundle)
# Use localhost for local Docker dev (browser accesses via port mapping)
ARG NEXT_PUBLIC_SSO_URL=http://localhost:3001
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_OAUTH_CLIENT_ID=taskflow-sso-public-client
ARG NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback
ARG NEXT_PUBLIC_OAUTH_SCOPE="openid profile email"
ARG NEXT_PUBLIC_CHATKIT_DOMAIN_KEY=domain_pk_local_dev

ENV NEXT_PUBLIC_SSO_URL=$NEXT_PUBLIC_SSO_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_OAUTH_CLIENT_ID=$NEXT_PUBLIC_OAUTH_CLIENT_ID
ENV NEXT_PUBLIC_OAUTH_REDIRECT_URI=$NEXT_PUBLIC_OAUTH_REDIRECT_URI
ENV NEXT_PUBLIC_OAUTH_SCOPE=$NEXT_PUBLIC_OAUTH_SCOPE
ENV NEXT_PUBLIC_CHATKIT_DOMAIN_KEY=$NEXT_PUBLIC_CHATKIT_DOMAIN_KEY
ENV NEXT_TELEMETRY_DISABLED=1
# Enable standalone output for Docker builds
ENV DOCKER_BUILD=true

RUN pnpm build

# ----- Stage 3: Runner -----
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir -p .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
