FROM node:20-alpine3.20 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache curl

# Build-time fallbacks so Next.js route/module evaluation
# (e.g. NextAuth + Mongo client init) does not crash in CI.
ARG MONGODB_URI=mongodb://127.0.0.1:27017/tdarts
ARG NEXTAUTH_SECRET=build-only-secret
ARG NEXTAUTH_URL=http://localhost:3000
ARG GOOGLE_CLIENT_ID=build-google-client-id
ARG GOOGLE_CLIENT_SECRET=build-google-client-secret
ENV MONGODB_URI=$MONGODB_URI
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
ENV GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET

FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000/tcp
HEALTHCHECK CMD curl -I --fail http://localhost:3000 || exit 1
ENTRYPOINT ["npm", "start"]