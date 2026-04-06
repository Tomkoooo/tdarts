# syntax=docker/dockerfile:1

FROM node:20-alpine3.20 AS base
RUN corepack enable pnpm

# --- prune: extract only what "web" needs ---
FROM base AS pruner
WORKDIR /app
COPY . .
RUN pnpm dlx turbo@^2 prune web --docker

# --- deps: install pruned dependencies ---
FROM base AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# --- build: compile Next.js ---
FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_ENABLE_SOCKET
ENV NEXT_PUBLIC_ENABLE_SOCKET=${NEXT_PUBLIC_ENABLE_SOCKET}
ENV MONGODB_URI=mongodb://admin:admin@sironicsrv:27017/
ENV OAC_STRIPE_SECRET_KEY=sk_test
ENV NEXT_PUBLIC_OAC_STRIPE_PUBLISHABLE_KEY=pk_test
ENV OAC_SZAMLAZZ_KEY=asd
COPY --from=deps /app/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=web

# --- run: standalone output ---
FROM node:20-alpine3.20 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV MONGODB_URI=mongodb://admin:admin@sironicsrv:27017/
ENV OAC_STRIPE_SECRET_KEY=sk_test
ENV NEXT_PUBLIC_OAC_STRIPE_PUBLISHABLE_KEY=pk_test
ENV OAC_SZAMLAZZ_KEY=asd

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/messages ./apps/web/messages
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000/tcp

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "apps/web/server.js"]
