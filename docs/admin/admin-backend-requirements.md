# Admin panel — backend requirements

Frontend-only admin UI. When a capability needs new server APIs, document them here. Do **not** implement backend changes in the admin UI PR unless explicitly scoped.

## 1. Tools — script wrappers (CLI → admin callable)

**Status:** Not implemented. Admin Tools page shows disabled placeholder cards.

**Problem:** Backfill and maintenance scripts exist as `pnpm` CLI commands only. `AdminToolsService` currently only supports `logRevalidateAdminDashboard`.

**Required:**

| Script id | CLI command | Suggested service |
|-----------|-------------|-------------------|
| `backfill-locations` | `pnpm backfill:locations` | `AdminToolsService.runBackfillLocations(actorUserId)` |
| `backfill-averages` | `pnpm backfill:match-averages` | `AdminToolsService.runBackfillMatchAverages(actorUserId)` |
| `recalc-mmr` | `pnpm recalc:oac-mmr` | `AdminToolsService.runRecalcOacMmr(actorUserId)` |
| `reset-telemetry` | `pnpm telemetry:reset:v3` | `AdminToolsService.runResetTelemetryV3(actorUserId)` |

**Server action pattern (web):**

```ts
// apps/web/src/features/admin/tools/actions.ts
export async function adminRunToolAction(locale: string, toolId: string): Promise<{ ok: boolean; jobId?: string; error?: string }>
```

**Behaviour:**

- Require `ADMIN_CAPABILITIES.ADMIN_TOOLS_EXECUTE`.
- Dangerous tools (`recalc-mmr`, `reset-telemetry`) require confirmation token or second capability.
- Run work in a background job or bounded subprocess; return `jobId` for status polling.
- Always `AdminAuditService.logAction(actorUserId, 'tools.run', { toolId, ... })`.
- Never expose raw shell — whitelist script ids only.

**Optional:** `GET /api/admin/tools/jobs/:jobId` for progress UI.

---

## 2. Feature access — evaluate as arbitrary user

**Status:** Not implemented. Feature Access page evaluates **current signed-in** admin only (`evaluateFeatureAccess` + session auth).

**Problem:** Admins need to debug why user X cannot access feature Y for club Z without logging in as that user.

**Required:**

```ts
// packages/services or apps/web server-only helper
export async function evaluateFeatureAccessForUser(params: {
  targetUserId: string;
  featureName: string;
  clubId?: string;
}): Promise<GuardResult<FeatureAccessOutcome>>
```

**Authorization:**

- Caller must have `ADMIN_CAPABILITIES.ADMIN_FEATURE_ACCESS_DEBUG_READ`.
- Do not accept `targetUserId` from client without server-side validation (ObjectId format, user exists).

**Web action:**

```ts
export async function adminProbeFeatureAccessForUserAction(
  targetUserId: string,
  featureName: string,
  clubId?: string,
): Promise<{ ok: boolean; result?: GuardResult<FeatureAccessOutcome>; error?: string }>
```

**UI:** Extend `/admin/feature-access` with user lookup (email → `AdminUsersQueryService`) then evaluate.

---

## 3. Observability — live log tail (SSE)

**Status:** Not implemented. Logs tab loads a bounded snapshot via `AdminObservabilityService.listLogs`.

**Optional enhancement:**

```
GET /api/admin/observability/logs/stream?level=error&category=api
```

- SSE or WebSocket; server polls Mongo `LogModel` or tails capped buffer.
- Require `ADMIN_OBSERVABILITY_READ`.
- Rate-limit and max connection duration (e.g. 5 min).

**UI:** "Live tail" toggle on Observability → Logs tab.

---

## 4. Data Explorer — full browse UI

**Status:** Partial. `AdminDataExplorerService` implements `listCollections`, `browse`, `getDocument`, `lookupByField`, `applyPatch`. Tools page shows collection list only.

**Frontend still needed (no new backend):**

- Route: `/admin/tools/explorer?collection=users&page=1`
- Table from `browse()`; detail drawer from `getDocument()`; patch form calling new server action wrapping `applyPatch` (requires `ADMIN_DATA_EXPLORER_WRITE`).

---

## 5. Dashboard — wire main admin home

**Status:** Out of scope for system pages task. `/admin` still uses mock KPIs.

**Existing backend:** `AdminDashboardService.getSummary({ range })`.

**Frontend:** Replace mock data in `apps/web/src/app/[locale]/admin/page.tsx` with server fetch + `AdminDashboardCharts` (or equivalent) using real `userSignupsByDay`, `topErrorRoutes`, `recentAdminActivity`.
