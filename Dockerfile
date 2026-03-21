# syntax=docker/dockerfile:1

# --- deps: install once, cached when package*.json unchanged ---
FROM node:20-alpine3.20 AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# next-auth (optional @auth/core 0.34) vs @auth/mongodb-adapter (@auth/core 0.41) and OTel peers
# disagree with npm’s strict resolver; lockfile is still honored.
RUN npm ci --legacy-peer-deps

# --- build: compile Next.js (needs devDependencies from deps) ---
FROM node:20-alpine3.20 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Optional: bake public client env at build time (docker build --build-arg NEXT_PUBLIC_*=...)
ARG NEXT_PUBLIC_ENABLE_SOCKET
ENV NEXT_PUBLIC_ENABLE_SOCKET=${NEXT_PUBLIC_ENABLE_SOCKET}
# Placeholders so `next build` can read required server/public env (replace via compose/env at deploy).
ENV MONGODB_URI=mongodb://admin:admin@sironicsrv:27017/
ENV OAC_STRIPE_SECRET_KEY=sk_test
ENV NEXT_PUBLIC_OAC_STRIPE_PUBLISHABLE_KEY=pk_test
ENV OAC_SZAMLAZZ_KEY=asd
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- run: only standalone output + static assets (no source, no full node_modules) ---
FROM node:20-alpine3.20 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Same defaults as builder; override with real values in compose / orchestrator.
ENV MONGODB_URI=mongodb://admin:admin@sironicsrv:27017/
ENV OAC_STRIPE_SECRET_KEY=sk_test
ENV NEXT_PUBLIC_OAC_STRIPE_PUBLISHABLE_KEY=pk_test
ENV OAC_SZAMLAZZ_KEY=asd

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/messages ./messages
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000/tcp

# Busybox wget (no extra packages)
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
