# syntax=docker/dockerfile:1.7
# Vercel-only container. The VPS Dockerfiles remain unchanged.
FROM node:22-bookworm-slim AS base
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.18.0 --activate

FROM base AS deps
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @aisdkpro/web build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production \
    PORT=80 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs
# With outputFileTracingRoot at the monorepo root, Next emits this standalone tree.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone/ ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 80
CMD ["node", "apps/web/server.js"]
