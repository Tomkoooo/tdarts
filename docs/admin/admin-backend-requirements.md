# Admin panel — backend requirements

Living backlog for the **template-based** admin UI ([PLAN.md](../docs-internal/admin-phases/PLAN.md), [TEMPLATE.md](../docs-internal/admin-phases/TEMPLATE.md)). Frontend agents document missing APIs here; backend work is implemented separately.

Do **not** implement backend changes in admin UI PRs unless explicitly scoped.

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

**Status:** Implemented at `/[locale]/admin/data` — global search, inspector with populated relations, patch; advanced Mongo JSON browse in collapsible section.

**API:** `AdminDataExplorerService.globalSearch({ q, collections?, limitPerCollection })`.

**Optional later:** deep-link from Tools page; live tail not applicable here.

---

## 4b. Matches admin — tournament-grouped list

**Status:** Implemented. `AdminMatchesQueryService.listTournamentBuckets` + `listForTournament`; filters: status, type, round, boardReference, manualOnly.

---

## 4c. Observability dashboard snapshot

**Status:** Implemented. `AdminObservabilityService.getDashboardSnapshot()` powers `/admin/observability` hub with traffic/error charts and open incidents.

**Optional later:** Port full main-branch P95 percentile series if `AdminTelemetryService` is restored in packages.

---

## 5. Content — announcement create/edit UI

**Status:** Partial. `/admin/content` lists announcements and toggles `isActive` via `AnnouncementService` (write requires `admin:content:write`).

**Still needed for full CMS:**

- Create / edit form (localized fields, `expiresAt`, type, button action)
- Delete with confirm + audit
- Optional: club posts (`PostModel`) under separate tab — not in current scope

---

## 6. Dashboard — wire main admin home

**Status:** Implemented. `/admin` loads `AdminDashboardService.getSummary({ range })` via `getDashboardDataAction` and renders `AdminDashboardView` with KPI cards, charts, and activity feed. Auto-refreshes every 60s via TanStack Query.

**Still missing for full plan (future phases):**

- Live matches today KPI (needs `AdminDashboardService` extension)
- Top 5 players by rating mini-leaderboard
- Match activity heatmap
- Active clubs by member count bar chart

---

## 7. Entity list pages — query server actions

**Status:** Implemented for users, clubs, players, tournaments, matches, leagues (`adminList*Action` in `features/admin/*/actions.ts` + RSC directory pages with URL-driven `q`, `page`, `sort`, filters).

**Required web actions (pattern):**

```ts
// apps/web/src/features/admin/users/actions.ts
export async function adminListUsersAction(params: {
  q?: string;
  page: number;
  limit: number;
  sort?: { key: string; dir: 'asc' | 'desc' };
}): Promise<{ ok: boolean; total?: number; rows?: AdminUserListRow[]; error?: string }>
```

Repeat for: clubs, tournaments, matches, players, leagues, feedback.

**Authorization:** Match existing capability per domain (`ADMIN_USERS_MANAGE`, `ADMIN_CLUBS_READ`, …).

---

## 7. Match admin — live score entry

**Status:** Not implemented. Plan includes leg-by-leg visit entry with audit log on corrections.

**Required:**

- `AdminMatchesMutationService.recordVisit(...)` or extend existing match override APIs
- Support per-leg throw table (visit, p1 score, p2 score, remaining)
- `AdminAuditService.logAction` on every manual correction with reason field
- Optional: SSE/WebSocket for live match state on admin match detail page

**Frontend route:** `/admin/matches/[matchId]` with score board + legs accordion + correction form.

---

## 8. Phase-2 UX foundation (implemented in web + minimal services)

The following are **wired in the admin UI** before larger backend phases:

| Area | Status |
|------|--------|
| Schema-driven edit (`AdminSchemaForm`, enums, relation search picker, honors editor) | Users, clubs, players, tournaments, feedback detail + user sheet |
| List KPI trend charts (`AdminListKpiService` + `AdminListKpiBand`) | users, clubs, tournaments, players, matches, leagues |
| Dashboard activity feed (`AdminDashboardService.buildActivityFeed`) | signups, club/tournament updates, unread/critical feedback, API errors/spike |
| Patch actions | `adminPatchUserFieldsAction`, `adminPatchClubFieldsAction`, `adminPatchPlayerFieldsAction`, `adminPatchTournamentFieldsAction`, `adminPatchFeedbackFieldsAction` |

**Still backlog for backend-heavy work:** leagues profile edit, match full scoreboard mutations, tools CLI wrappers, data explorer write paths, full telemetry port (P95 / main-branch parity).

---

## 9. New admin routes (stubs in nav, no page yet)

| Route | Capability | Notes |
|-------|------------|-------|
| `/admin/venues` | `ADMIN_CLUBS_READ` | Venue model TBD or derive from club locations |
| `/admin/teams` | `ADMIN_LEAGUES_READ` | Team invitations / league teams |
| `/admin/moderation/bans` | `ADMIN_USERS_MANAGE` | Suspension/ban registry |
| `/admin/analytics` | `ADMIN_OBSERVABILITY_READ` | Extended analytics beyond dashboard |
| `/admin/roles` | `ADMIN_USERS_MANAGE` | Role ↔ permission matrix UI |
