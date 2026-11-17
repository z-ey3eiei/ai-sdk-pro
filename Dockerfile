# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.18.0 --activate

FROM base AS deps
COPY . .
RUN pnpm install --frozen-lockfile

# Build this named target separately for the staging preview queue.
FROM deps AS preview-dispatcher
ENV NODE_ENV=production
USER node
CMD ["bash", "infra/project-preview/run-dispatcher.sh"]

FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @aisdkpro/web build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# With outputFileTracingRoot at the monorepo root, Next emits:
# apps/web/.next/standalone/apps/web/server.js
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone/ ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

# Next.js 16 writes prerender route-cache beside server assets. Production
# uses a read-only rootfs with a writable /tmp tmpfs, so route-cache must be
# redirected there instead of attempting mkdir on the immutable filesystem.
RUN mkdir -p /app/apps/web/.next/server \\
    && rm -rf /app/apps/web/.next/server/route-cache \\
    && ln -s /tmp/ai-sdk-pro-route-cache /app/apps/web/.next/server/route-cache

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["sh", "-c", "mkdir -p /tmp/ai-sdk-pro-route-cache && exec node apps/web/server.js"]
