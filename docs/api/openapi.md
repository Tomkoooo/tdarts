# OpenAPI documentation for `@tdarts/api`

This guide explains how to **generate** the OpenAPI 3.x artifact for the standalone API in [`apps/api`](../../apps/api) (`@tdarts/api`).

## Prerequisites

- Dependencies installed from the repository root: `pnpm install`
- No running database or API server is required for generation; the script only loads the tRPC router and writes JSON to disk.

## Generate the spec

From the **repository root**:

```bash
pnpm --filter @tdarts/api generate:openapi
```

Or from `apps/api`:

```bash
pnpm generate:openapi
```

This runs [`apps/api/src/trpc/openapi/generate.ts`](../../apps/api/src/trpc/openapi/generate.ts) via `tsx` (see the `generate:openapi` script in [`apps/api/package.json`](../../apps/api/package.json)).

## Output file

The generator writes:

| File | Location |
|------|----------|
| `openapi.json` | [`apps/api/openapi.json`](../../apps/api/openapi.json) |

If the file does not exist yet, it is created on first run. You can open it in any OpenAPI viewer (Swagger UI, Stoplight Elements, Postman import, etc.).

## Current behavior: stub vs live generation

The workspace uses **Zod v3** today. The maintained **`@trpc/openapi`** flow that derives paths and schemas from procedures expects **Zod v4**, so the script currently emits a **hand-maintained stub** that lists the main procedures, tags, and security schemes (Tier 1 caller headers + Tier 2 Bearer JWT). See the `buildStubOpenApiDocument()` function in `generate.ts`.

**After upgrading the monorepo to Zod v4:**

1. Uncomment the **live generator** block in `generate.ts` (documented inline) that calls `generateOpenApiDocument` from `@trpc/openapi`.
2. Adjust `baseUrl`, `title`, `securitySchemes`, and other options as needed.
3. Re-run `pnpm --filter @tdarts/api generate:openapi` to produce a spec driven by the real `appRouter` and Zod inputs.

Until then, if you add or rename procedures for native clients, update **either** the stub in `generate.ts` **or** the `.meta({ openapi: { ... } })` on procedures (the live path will pick those up once enabled).

## Keeping procedures documented

Routers already use `.meta()` for OpenAPI hints, for example:

```ts
.meta({
  openapi: {
    method: 'POST',
    path: '/auth/login',
    tags: ['auth'],
    protect: false,
  },
})
```

When the live generator is enabled, these annotations feed the exported document. Until then, mirror important operations in `buildStubOpenApiDocument()` if they must appear in `openapi.json` for partners.

## Authentication in the spec

The stub documents:

- **Tier 1 — Caller**: `X-Client-Id` + `X-Client-Secret` (mobile), or `X-Integration-Key` (integrations).
- **Tier 2 — User**: `Authorization: Bearer <token>` from `auth.login` for user-scoped procedures.

Align any future live `securitySchemes` in `generate.ts` with what [`apps/api/src/trpc/middleware/requireKnownCaller.ts`](../../apps/api/src/trpc/middleware/requireKnownCaller.ts) and [`requireUserJwt.ts`](../../apps/api/src/trpc/middleware/requireUserJwt.ts) enforce.

## REST routes (mobile / Next)

These HTTP handlers live beside tRPC on the **standalone API** ([`apps/api/src/trpc/standalone/server.ts`](../../apps/api/src/trpc/standalone/server.ts)) and are re-used from Next App Router via [`@tdarts/api/rest-handlers`](../../apps/api/package.json) ([`apps/web/src/app/api/media`](../../apps/web/src/app/api/media)).

| Method | Path | Tier 1 | Notes |
|--------|------|--------|--------|
| `POST` | `/api/auth/google` | Required | JSON `{ "idToken": "<Google ID token>" }`. Same response shape as `auth.login`. Configure `GOOGLE_CLIENT_ID` or comma-separated `GOOGLE_CLIENT_IDS`. |
| `GET` | `/api/media/:id` | No | Public binary (`Content-Type` from stored mime). |
| `POST` | `/api/media/upload` | Mobile: required; web: no | Multipart field `file`. **Mobile:** Tier 1 headers + `Authorization: Bearer <JWT>`. **Web (Next):** session cookie or Bearer via [`AuthorizationService.getUserIdFromRequest`](../../packages/services/src/authorization.service.ts). |
| `POST` | `/api/socket/auth` | Mobile: required; web: no | Returns `{ socketToken, expiresInSec }` for realtime handshakes. Validates login JWT then mints a short-lived JWT with `purpose: 'socket'` ([`AuthService.issueSocketToken`](../../packages/services/src/auth.service.ts)). Optional env: `SOCKET_TOKEN_TTL_SEC` (default 600). |
| `GET` | `/api/updates` | No | Public manifest: `version`, `minClientVersion`, `socketUrl` from env ([`AppUpdatesService`](../../packages/services/src/app-updates.service.ts)). |
| `POST` | `/api/payments/verify` | Mobile: required; web: no | JSON `{ "sessionId": "<Stripe Checkout session id>" }`. Requires `STRIPE_SECRET_KEY`. Optionally enforce `metadata.userId` on the session. |
| `POST` | `/api/players/:id/avatar` | Mobile: required; web: no | Multipart field `file`. Player owner or global admin ([`PlayerService.uploadPlayerAvatarFromBuffer`](../../packages/services/src/player.service.ts)). |

tRPC equivalent for Google: `auth.loginGoogle` (same Tier 1 as other `apiProcedure` calls).

For profile image URLs that must load from the API host (mobile), set **`API_PUBLIC_URL`** or **`NEXT_PUBLIC_APP_URL`** so stored paths are absolute (see [`ProfileService.uploadProfileImageFromBuffer`](../../packages/services/src/profile.service.ts)).

## Optional: CI or pre-commit

You can run `pnpm --filter @tdarts/api generate:openapi` in CI and either:

- **Commit** `apps/api/openapi.json` so mobile teams always have a reviewed artifact, or  
- **Upload** it as a workflow artifact without committing (add `apps/api/openapi.json` to `.gitignore` if you choose that workflow).

## Related code

| Piece | Path |
|-------|------|
| Generator entry | `apps/api/src/trpc/openapi/generate.ts` |
| Combined router | `apps/api/src/trpc/root.ts` |
| Example `.meta` usage | `apps/api/src/trpc/routers/*.router.ts` |

## See also

- [Portainer + GHCR (web vs API images)](portainer-ghcr.md)
