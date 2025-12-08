# syntax=docker/dockerfile:1
# ============================================================================
# Next.js 15 SSO Platform Dockerfile
# ============================================================================
# Slim production image - migrations run separately on first deploy
# ============================================================================

# ----- Stage 1: Dependencies -----
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ----- Stage 2: Builder -----
FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3001
ARG NEXT_PUBLIC_APP_NAME="Taskflow SSO"
ARG NEXT_PUBLIC_APP_DESCRIPTION="Secure Single Sign-On"
ARG NEXT_PUBLIC_ORG_NAME="Taskflow"

ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_DESCRIPTION=$NEXT_PUBLIC_APP_DESCRIPTION
ENV NEXT_PUBLIC_ORG_NAME=$NEXT_PUBLIC_ORG_NAME
ENV NEXT_TELEMETRY_DISABLED=1
# Enable standalone output for Docker builds
ENV DOCKER_BUILD=true

RUN pnpm build

# ----- Stage 3: Runner (slim - no migrations) -----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build only
COPY --from=builder /app/public ./public
RUN mkdir -p .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "server.js"]
