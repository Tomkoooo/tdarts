# Admin authorization (internal)

This document describes how platform admin access is modeled and how to keep new admin surfaces secure on both backend and frontend. It complements product notes in [admin-panel-prior-ux.md](./admin-panel-prior-ux.md).

## Data model

| Field | Meaning |
|--------|--------|
| `User.isAdmin` | Global **super admin**. Bypasses scoped capability checks wherever `AdminAuthorizationService` is used; also used alone via `AuthorizationService.isGlobalAdmin` for operations that must remain super-admin-only. |
| `User.adminRoles` | String array of **scoped** admin roles (e.g. `marketing`). Only roles listed in `ADMIN_ROLES` in `@tdarts/services` participate in capability resolution; unknown strings are ignored after normalization. |

Implementation: [`packages/services/src/admin-authorization.service.ts`](../../packages/services/src/admin-authorization.service.ts), user schema in `@tdarts/core`.

## Capabilities and roles

- **`ADMIN_CAPABILITIES`** — Fine-grained permission strings (e.g. `admin:ads:read`, `admin:shell:access`, `admin:users:manage`).
- **`ROLE_CAPABILITIES`** — Maps each `AdminRole` to the list of capabilities that role grants.
- **Super admin** — Any user with `isAdmin === true` is treated as having **all** capabilities by `AdminAuthorizationService.hasAdminCapability` and `canAccessAdminShell`.

Today, `marketing` receives shell access plus ads read/write/telemetry capabilities. When adding a new role:

1. Add a constant to `ADMIN_ROLES`.
2. Add capabilities to `ADMIN_CAPABILITIES` if new permission types are needed.
3. Assign the new role’s capability array in `ROLE_CAPABILITIES`.
4. Gate each new Server Action / Route Handler with `hasAdminCapability(userId, …)` (or super-admin-only flows with `AuthorizationService.isGlobalAdmin`).

## Which API to use when

### `AuthorizationService.isGlobalAdmin(userId)` (`packages/services`)

Use for **break-glass** or **global-only** operations: user lifecycle, granting `isAdmin` / `adminRoles`, feature flags that affect the whole product, destructive maintenance. This checks **only** `User.isAdmin`.

### `AdminAuthorizationService.hasAdminCapability(userId, capability)`

Use for **feature-scoped** admin behavior (ads, future modules). Marketing and future roles must never rely on `isAdmin` alone if the feature is meant for scoped admins.

### `AdminAuthorizationService.canAccessAdminShell(userId)`

Use when deciding whether a user may open the **admin app shell** or call **cookie-authenticated admin HTTP APIs** that are not tied to a single fine-grained capability. Aligns with “may enter `/admin`”.

### Route Handlers (`apps/web/src/lib/admin-auth.ts`)

`getAdminUserIdFromRequest` / `ensureAdmin` verify the JWT cookie, load the user, then require **`AdminAuthorizationService.canAccessAdminShell`**. Use this pattern for `/api/admin/*` style routes when they are reintroduced so behavior matches the App Router admin layout gate.

### Server Actions (Next.js `"use server"`)

Typical pattern:

1. Resolve the session user (`authorizeUserResult` or equivalent).
2. Call `AdminAuthorizationService.hasAdminCapability(userId, CAP)` (or `isGlobalAdmin` if appropriate).
3. Return 403-shaped failure if not allowed **before** touching services or the database.

Never trust client-only flags; duplicated checks in RSC for UX are optional but **not** a substitute for server enforcement.

## Frontend

- **Server components / layouts:** Use `getServerUser` (or equivalent) and `AdminAuthorizationService` on the server for redirects and layout branches.
- **Client components:** May hide links or sections for UX using session/context data, but **authorization must not depend on the client**. Note: some entry links today use `user.isAdmin` only; for parity with shell access, prefer exposing or deriving **shell eligibility** (same as `canAccessAdminShell`) when rebuilding nav so `marketing` users see admin links when they have `ADMIN_SHELL`.

## Historical inconsistency (do not repeat)

Legacy code under `apps/web/src/app/api/admin/charts/.../shared.ts` implemented a local `ensureAdmin` that checked **only** `isAdmin`, which **excluded** scoped roles such as `marketing` even when the admin layout allowed them. When adding new admin APIs, **always** use `AdminAuthorizationService` (or an explicit capability) so cookie routes, layouts, and Server Actions stay consistent.

## Operations without admin UI

Until user-management screens return, assigning `isAdmin` or `adminRoles` is typically done via database operations or internal scripts. Document any one-off procedures in runbooks outside this file.

## See also

- [admin-panel-prior-ux.md](./admin-panel-prior-ux.md) — Operator UX to preserve in the rebuild.
