# Deploying the tDarts API via GHCR + Portainer

The API server lives in `apps/api` and is published as a Docker image to the GitHub Container Registry (GHCR) on every push to `main` or `feature/api`.

---

## 1. How CI builds and pushes the image

The workflow `.github/workflows/docker-api.yml` runs automatically when any of the following paths change: `apps/api/**`, `packages/core/**`, `packages/services/**`, `packages/schemas/**`, `Dockerfile.api`, `pnpm-lock.yaml`.

You can also trigger it manually from **Actions → Docker API → Run workflow**.

**Image location**: `ghcr.io/<owner>/tdarts-api`

| Tag | When applied |
|-----|-------------|
| `api-latest` | Every push to `main` |
| `api-<short-sha>` | Every push to any triggering branch |
| `api-<semver>` | When a tag like `v1.2.3` is pushed |

After the workflow succeeds, navigate to **GitHub → Packages** (either on your user profile or the repository sidebar) to confirm the image appears with the expected tags.

---

## 2. Create a Personal Access Token for Portainer

Portainer needs a PAT to pull from GHCR. Generate one at:

**GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**

Scopes required:
- `read:packages` — allows pulling images

Keep `write:packages` out of this token; it should be read-only for your server.

For **organisation** packages, the GitHub account used must be a member of the organisation or the package must be made public.

---

## 3. Add GHCR registry in Portainer

1. Go to **Portainer → Registries → Add registry**.
2. Select **Custom registry**.
3. Fill in:
   - **Name**: `ghcr-tdarts`
   - **Registry URL**: `ghcr.io`
   - **Authentication**: enable
   - **Username**: your GitHub username (lowercase)
   - **Password**: the PAT from step 2
4. Click **Add registry**.

---

## 4. Deploy the API container

### Option A — Single container

1. **Containers → Add container**
2. **Image**: `ghcr.io/<owner>/tdarts-api:api-latest`
3. **Port mapping**: host port `4000` → container port `4000` (or adjust if you run behind a reverse proxy)
4. **Restart policy**: `Unless stopped`
5. **Environment variables** — set all of the following:

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/tdarts` |
| `JWT_SECRET` | Yes | Shared signing secret for user JWTs (same value used by the web app) |
| `API_MOBILE_CLIENT_ID` | Yes | Tier-1 mobile client ID (any opaque string you define) |
| `API_MOBILE_CLIENT_SECRET` | Yes | Tier-1 mobile client secret |
| `API_INTEGRATION_KEYS` | No | Comma-separated keys for 3rd-party integrations |
| `API_DEV_BYPASS_SECRET` | No | Non-prod bypass value — **leave empty in production** |
| `CORS_ORIGINS` | No | Comma-separated additional allowed origins |
| `PORT` | No | Defaults to `4000` |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis URL for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis token |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_IDS` | No | Comma-separated Google OAuth client IDs for `POST /api/auth/google` |
| `API_PUBLIC_URL` | No | Public API base URL for absolute media / avatar links (e.g. `https://api.example.com`) |
| `STRIPE_SECRET_KEY` | No | Stripe secret — required for `POST /api/payments/verify` |
| `APP_PUBLIC_VERSION` / `NEXT_PUBLIC_APP_VERSION` | No | Shown by `GET /api/updates` (`APP_PUBLIC_VERSION` wins if both set) |
| `APP_MIN_CLIENT_VERSION` | No | Optional minimum client version string for native apps |
| `NEXT_PUBLIC_SOCKET_URL` / `SOCKET_PUBLIC_URL` | No | Hint URL returned in `/api/updates` for WebSocket clients |
| `SOCKET_TOKEN_TTL_SEC` | No | Lifetime in seconds for socket auth JWTs (default `600`) |

6. Click **Deploy the container**.

### Option B — Docker Compose stack

Create a stack in **Portainer → Stacks → Add stack** with the following compose file:

```yaml
services:
  api:
    image: ghcr.io/<owner>/tdarts-api:api-latest
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: production
      PORT: "4000"
      MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/tdarts"
      JWT_SECRET: "replace-with-your-secret"
      API_MOBILE_CLIENT_ID: "replace-with-client-id"
      API_MOBILE_CLIENT_SECRET: "replace-with-client-secret"
      # API_INTEGRATION_KEYS: "key1,key2"
      # UPSTASH_REDIS_REST_URL: ""
      # UPSTASH_REDIS_REST_TOKEN: ""
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://127.0.0.1:4000/health"]
      interval: 30s
      timeout: 5s
      start_period: 40s
      retries: 3
```

---

## 5. Verify the deployment

After the container starts, check that the health endpoint returns `200`:

```bash
curl http://<your-server>:4000/health
# {"ok":true,"service":"@tdarts/api","ts":"..."}
```

The tRPC endpoint is available at:

```
http://<your-server>:4000/trpc
```

---

## 6. Pulling a newer image

To update the running container to the latest image in Portainer:

1. **Containers** → select the API container → **Recreate** → enable **Re-pull image** → **Recreate**.

If you use a Compose stack, go to **Stacks** → select the stack → **Pull and redeploy**.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `401 Unauthorized` / `denied` on pull | PAT missing `read:packages` or wrong user | Regenerate PAT; verify org access |
| `manifest unknown` | Tag doesn't exist yet | Check **Actions → Docker API** for CI success; verify tag spelling |
| Container exits immediately | Missing env var | Check Portainer logs; ensure `MONGODB_URI` and `JWT_SECRET` are set |
| `MongoServerSelectionError` | MongoDB unreachable from container | Use a public hostname (not `localhost`); add container to the right Docker network if MongoDB also runs in Docker |
| `TRPCClientError: UNAUTHORIZED` on all requests | Missing Tier-1 headers | Ensure the mobile app sends `X-Client-Id` + `X-Client-Secret` matching `API_MOBILE_CLIENT_ID` / `API_MOBILE_CLIENT_SECRET` |
