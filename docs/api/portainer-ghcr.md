# Portainer + GHCR: web and API images

This repo publishes **two separate container images** to the GitHub Container Registry (GHCR). In Portainer you typically run **two stacks or containers** (or only the web app if you do not host the API yet).

## Web app (Next.js)

| Item | Value |
|------|--------|
| Workflow | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) |
| Dockerfile | Root [`Dockerfile`](../../Dockerfile) |
| Image name | `ghcr.io/<github-username-or-org>/<repo-name>` — e.g. `ghcr.io/tomkoooo/tdarts` (GHCR uses lowercase) |
| Typical tag | `main` (from branch ref via `docker/metadata-action` defaults) |

**Portainer:** set image to `ghcr.io/<owner>/tdarts:main` (or whatever tag you track).

**When CI builds:** push to `main` or `new_ui`, and only if changed paths include `apps/web/**`, `packages/**`, root `Dockerfile`, `.dockerignore`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root `package.json`, `turbo.json`, or `tsconfig.json`. **Manual runs** always build (`workflow_dispatch` has no path filter).

**Registry login in Portainer:** same as below — classic PAT with `read:packages`, registry URL `ghcr.io`, username = GitHub username, password = PAT.

---

## API app (tRPC / Hono)

| Item | Value |
|------|--------|
| Workflow | [`.github/workflows/docker-api.yml`](../../.github/workflows/docker-api.yml) |
| Dockerfile | Root [`Dockerfile.api`](../../Dockerfile.api) |
| Image name | `ghcr.io/<owner>/tdarts-api` (separate GHCR package from the web repo image) |
| Tags | `api-latest` on default branch pushes; `api-<short-sha>` on every qualifying push |

**Portainer:** use a **different** image than the web app, e.g. `ghcr.io/tomkoooo/tdarts-api:api-latest`.

**When CI builds:** push to `main` or `feature/api` when paths under `apps/api/**`, `packages/core|services|schemas/**`, `Dockerfile.api`, `pnpm-lock.yaml`, or `turbo.json` change (or run **Actions → Docker API → Run workflow** manually).

### API environment variables (minimum)

| Variable | Required |
|----------|----------|
| `MONGODB_URI` | Yes |
| `JWT_SECRET` | Yes |
| `API_MOBILE_CLIENT_ID` | Yes |
| `API_MOBILE_CLIENT_SECRET` | Yes |
| `PORT` | No (default `4000`) |
| `API_INTEGRATION_KEYS` | No |
| `CORS_ORIGINS` | No |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | No (rate limits fall back if unset) |

Map container port **4000** (or your `PORT`) on the host or behind a reverse proxy. Health check: `GET /health`.

### PAT for Portainer (pull private images)

1. GitHub → **Settings → Developer settings → Personal access tokens** (classic).
2. Scope: **`read:packages`**.
3. Portainer → **Registries → Add registry** → Custom → URL `ghcr.io` → username = GitHub user → password = PAT.

For **organization** packages, the GitHub user must have access to the package.

### Troubleshooting pulls

| Issue | What to check |
|-------|----------------|
| `401` / denied | PAT scopes; org access to the package |
| `manifest unknown` | Image name and tag in GHCR after a green workflow run |
| API crash loop | Logs for missing `MONGODB_URI` / Mongo reachability from the container network |

---

## Branch flow (summary)

- **`to_release`:** [Web regression](../../.github/workflows/web-regression.yml) runs lint, web unit + QA tests, QA coverage, and `@tdarts/api` tests — **no** `next build` on this branch (saves CI time). **No** web Docker image from `ci.yml` (that workflow only watches `main` / `new_ui`).
- **`main`:** Regression runs **including** `next build`; `ci.yml` may build and push the **web** image (if path filters match). `docker-api.yml` may push the **API** image when API-related paths change.

See also: [OpenAPI generation](openapi.md).
