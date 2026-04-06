# Monorepo Management Guide

This guide explains how this repository is organized, how to work safely in it, how to add a new app, and how to evolve CI/CD without breaking existing delivery.

## 1) What this repository is

- Package manager: `pnpm` workspaces (`pnpm-workspace.yaml`)
- Build orchestration: Turborepo (`turbo.json`)
- Main workspaces:
  - `apps/web` — Next.js 16 frontend application
  - `apps/api` — standalone Hono + tRPC API (`@tdarts/api`)
  - `packages/core` — models, shared primitives, low-level utilities
  - `packages/services` — business/domain services used by apps
  - `packages/schemas` — Zod schemas and shared validation
  - `packages/ui` — shared UI package (when used by apps)

## 2) Architecture rules (mandatory)

These rules keep the monorepo maintainable:

- Keep business logic in `packages/services` (or feature libs), not in transport layers.
- Keep transport adapters thin:
  - Next route handlers / server actions
  - API REST handlers / tRPC routers
- Shared validation belongs in `packages/schemas`.
- Shared data/model concerns belong in `packages/core`.
- Web feature code follows Feature-Sliced structure (`src/features/...`) and no direct cross-feature coupling.
- If you add new HTTP entry points, preserve existing auth model:
  - Tier 1 client identity (headers/integration key) where required
  - Tier 2 user identity (JWT/session)
- For API source imports under `apps/api/src`, use extensionless relative imports (Turbopack/TS compatibility).

## 3) Directory map: where to put what

- `apps/web/src/app`:
  - route tree, page composition, thin API adapters in `src/app/api/...`
- `apps/web/src/features/*`:
  - feature-level UI, actions, libs, tests
- `apps/api/src/trpc`:
  - tRPC router composition, middleware, standalone server entry
- `apps/api/src/http`:
  - REST handlers and shared HTTP helper modules
- `packages/core/src`:
  - models, low-level shared interfaces, core helpers
- `packages/services/src`:
  - domain services; app-independent business logic
- `packages/schemas/src`:
  - Zod schemas and inferred shared types
- `docs/`:
  - architecture, deployment, API behavior, and process docs
- `scripts/`:
  - one-off or operational helper scripts

## 4) Daily development workflow

Run from repository root unless you have a reason not to.

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev:web
pnpm --filter @tdarts/api dev
```

### Verification

```bash
pnpm lint
pnpm test
pnpm build
```

When touching API contracts/transport, also run targeted checks:

```bash
pnpm --filter @tdarts/api typecheck
pnpm --filter @tdarts/api test
pnpm --filter web build
```

## 5) How to add a new app to the monorepo

Use this checklist.

### Step A: Create workspace

1. Create folder under `apps/<new-app>`.
2. Add `package.json` with a unique `name` and required scripts (`dev`, `build`, `test`, `lint` minimum).
3. Add local `tsconfig.json` extending root `tsconfig.json` if TypeScript is used.

### Step B: Wire dependencies

- Prefer internal dependencies using `workspace:*`:
  - `@tdarts/core`
  - `@tdarts/services`
  - `@tdarts/schemas`
  - `@tdarts/ui` (if applicable)
- Keep app-specific business logic minimal; use shared packages first.

### Step C: Add scripts and turbo compatibility

- Ensure app scripts are compatible with top-level `turbo` tasks:
  - `build`, `dev`, `lint`, `test`
- If your app has custom outputs, update `turbo.json` outputs only if needed.

### Step D: Add docs and ownership

- Add app README or docs under `docs/` describing:
  - purpose
  - runtime env vars
  - local run commands
  - deployment target

### Step E: CI integration

- Add/update workflow with path filters for the new app and its dependencies.
- Do not run expensive jobs on unrelated changes.
- Ensure at least one gating job validates lint/test/build for the new app.

## 6) CI/CD design standards for this repo

Current pipelines (examples):

- `.github/workflows/ci.yml`:
  - builds and pushes web Docker image from root `Dockerfile`
  - path-filtered to web/shared files
- `.github/workflows/docker-api.yml`:
  - builds/pushes separate API image from `Dockerfile.api`
  - publishes to `ghcr.io/<owner>/tdarts-api`
- `.github/workflows/web-regression.yml`:
  - lint + tests + targeted coverage + optional Next build by branch conditions

### CI/CD rules to follow

- Separate image pipelines by deployable unit (web and API are separate artifacts).
- Use `paths` filters to prevent unrelated builds.
- Keep branch strategy explicit (`main`, release branch, feature branch rules).
- Make lint/tests fail fast; do not hide failing steps.
- Prefer immutable tags (sha) plus channel tags (`latest`, `api-latest`).
- Cache aggressively but safely (`pnpm` cache, Buildx `gha` cache).
- Keep production secrets out of repo and out of workflow logs.

## 7) Recommended pipeline template for a new app

When adding `apps/<new-app>`, mirror this structure:

1. Trigger:
  - `push` + `pull_request` for relevant branches
  - `paths` includes `apps/<new-app>/**` and required shared packages
2. Jobs:
  - install deps
  - build shared packages needed by the app
  - lint app
  - test app
  - build app
3. Optional deploy job:
  - only on protected branch/tag
  - requires previous jobs success
4. Artifact/image naming:
  - unique package/image name per deployable

## 8) Environment management conventions

- Keep root `.env` / `.env.local` for monorepo-shared local development.
- Document app-specific required env vars in docs.
- For API/public URLs in shared services, keep precedence explicit and documented.
- For CI, use minimal deterministic env vars to make builds/tests reproducible.

## 9) Change management rules for contributors

Before merging:

- Update docs if behavior, endpoints, or required env vars changed.
- Ensure tests cover new transport handlers and service logic.
- Keep PR scope coherent (avoid unrelated refactors in feature PRs).
- Keep shared package changes backward-compatible when consumed by multiple apps.

## 10) Quick operational checklist

- Changed only frontend UI? Run web lint/test/build.
- Changed shared services/schemas/core? Run both web and API verification.
- Added/changed API endpoints? Verify:
  - API typecheck/tests/build
  - web build (for App Router proxies/import graph)
  - deployment docs/env table updates

## Related docs

- `docs/api/openapi.md`
- `docs/api/portainer-ghcr.md`
- `docs/refactor-ideas/DEPLOY-API.md`

