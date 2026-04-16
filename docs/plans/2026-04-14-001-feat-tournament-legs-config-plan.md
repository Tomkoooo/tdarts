---
title: "feat: Tournament Legs-to-Win Configuration"
type: feat
status: active
date: 2026-04-14
origin: docs/brainstorms/2026-04-14-tournament-legs-config-requirements.md
---

# feat: Tournament Legs-to-Win Configuration

## Overview

Organizers can pre-configure how many legs a player must win per match for each group (by board number) and each knockout round (by round number). Configuration survives group and bracket regeneration. Board scorers are locked from changing the pre-set value; admins and moderators can override it. Late admin-tab edits apply to all unstarted matches.

## Problem Frame

`legsToWin` is currently set entirely by the board scorer at match-start time with no tournament-level constraint, leading to accidental or inconsistent values. Organizers need authoritative control over match format, enforced server-side. (See origin: `docs/brainstorms/2026-04-14-tournament-legs-config-requirements.md`)

## Requirements Trace

- R1–R2. Legs config stored in a structure that survives group and knockout array regeneration.
- R3. `match.legsToWin` resolved dynamically from stored config at board-start time (not at match creation).
- R4. Server rejects non-privileged `legsToWin` override when a config value is set.
- R5. `updateMatchGameplaySettingsAction` enforces the same privilege check for `legsToWin` changes **when a tournament config value exists** for that match's group/round. When no config value exists, authenticated callers may change `legsToWin` (existing behavior preserved).
- ~~R6–R10. Creation wizard supports per-group and per-knockout-round config~~ **Cancelled** — config is set post-generation in the Admin tab only.
- R11–R14. Admin tab Legs Config panel: auto-save per row, editable during all active statuses, read-only when finished, inline warning when matches already started.
- R15–R17. Board `BoardMatchSetupScreen`: selector locked for regular scorers, editable for admins/mods with an override indicator.

## Scope Boundaries

- Sets-to-win (`setsToWin`) out of scope.
- Per-match overrides from the management UI (not the board) out of scope.
- Knockout panel skipped in creation wizard for `group_knockout` format — configure via Admin tab after bracket generation.
- No data migration required (optional Mongoose fields default gracefully).

## Context & Research

### Relevant Code and Patterns

- `tournamentSettings` in `packages/core/src/models/tournament.model.ts` — Mongoose embedded subdocument (never replaced by generation). New `legsConfig` field goes here. Survives `tournament.groups = []` and `tournament.knockout = allRoundsStructure` wholesale replacements.
- `packages/core/src/interfaces/tournament.interface.ts` — `TournamentSettings` interface to extend.
- Existing `updateTournamentSettingsAction` in `apps/web/src/features/tournaments/actions/manageTournament.action.ts` + `TournamentService.updateTournamentSettings` in `packages/services/src/tournament.service.ts` — merges into `tournamentSettings` wholesale; **no new server action needed** for admin-tab saves.
- `apps/web/src/features/board/actions/boardPage.action.ts` — `startBoardMatchAction`, `getBoardTournamentAction`, `getBoardUserRoleAction`, `assertBoardAccess`. `assertBoardAccess` already checks global admin; `getBoardUserRoleAction` does not.
- `apps/web/src/features/matches/actions/matchGameplay.action.ts` — `updateMatchGameplaySettingsAction` has no auth at all today; needs baseline auth + role check.
- `apps/web/src/features/tournaments/wizard/schema.ts` (4 steps: details→boards→settings→billing) and `wizard/mappers.ts`.
- `apps/web/src/components/club/CreateTournamentModal.tsx` — wizard UI shell.
- `apps/web/src/components/tournament/TournamentStatusChanger.tsx` — admin tab content (1295 lines); new Legs Config section goes here, gated on `admin | moderator` role check that already exists.
- `apps/web/src/features/board/components/BoardMatchSetupScreen.tsx` — legs selector component; needs `isLocked` and `isOverride` props.
- Test pattern: `apps/web/src/tests/simple-tournament-lifecycle.test.ts` (in-process with `mongodb-memory-server`) — follow this for new integration tests.

### External References

No external research needed — all patterns well-established in the codebase.

## Key Technical Decisions

- **Storage: `tournamentSettings.legsConfig`** (not on `groups[]` or `knockout[]`): both arrays are replaced wholesale on generation. `tournamentSettings` is only mutated field-by-field, so `legsConfig` added there is never overwritten. Structure: `{ groups?: Record<boardNumber, number>, knockout?: Record<round, number> }`. Each group (board) and each knockout round can have a **different** `legsToWin` value — groups with more players may warrant more legs. No wizard step; config is set exclusively post-generation in the Admin tab.
- **Lookup keys**: group-stage matches use `match.boardReference` to index `legsConfig.groups`; knockout matches use `match.round` to index `legsConfig.knockout`. Both fields exist on `Match` today.
- **Resolution timing: board-start (dynamic)**: avoids copying at match-creation time so late admin-tab edits apply to unstarted matches.
- **Rejection on mismatch (400 for board start, 403 for gameplay)**: board start uses 400 because the submitted value is structurally invalid (the schema constraint was violated by the caller); gameplay override uses 403 because the caller is authenticated but lacks the permission to change the value. Both reject rather than clamp so bypass attempts are visible.
- **Cancel knockout clears `legsConfig.knockout`**: bracket round numbering can shift when bracket size changes; preserving stale keys would silently apply wrong values. `cancelKnockoutAction` clears `legsConfig.knockout`. The Admin tab shows an inline notice when config was cleared.
- **No wizard step**: all legs config happens post-generation in the Admin tab. Each group board and each knockout round is configured independently because legs-to-win may vary based on group size or round importance.
- **Admin-tab save: `updateTournamentSettingsAction`**: no new server action required; the existing merge-into-`tournamentSettings` action handles auto-save per row correctly.
- **Global admin fix**: `getBoardUserRoleAction` must call `AuthorizationService.isGlobalAdmin` in addition to `ClubService.getUserRoleInClub` and return `'admin'` for global admins to preserve UI parity with `assertBoardAccess`.
- **`updateMatchGameplaySettingsAction` auth**: always add `authorizeUserResult` at the top of the action (no password fallback path — this action is admin/moderator only). When `legsToWin` is being changed and a tournament config value exists for that match, enforce admin/moderator privilege. When no config value exists, any authenticated caller may change `legsToWin`.

## Open Questions

### Resolved During Planning

- **Where to store config?** `tournamentSettings.legsConfig` — survives generation, accessible without fetching groups/knockout arrays.
- **Lookup rule for group vs knockout?** Group: `match.boardReference` → `legsConfig.groups`; Knockout: `match.round` → `legsConfig.knockout`. Both fields confirmed present on `Match`.
- **Rejection vs. clamp?** Reject with 400 — makes bypass attempts visible.
- **Cancel knockout clears config?** Yes — prevents stale round-number misalignment.
- **Wizard for `group_knockout` knockout?** Skip — admin tab only after bracket generation.
- **`updateMatchGameplaySettingsAction` callers?** Admin/moderator only — no tournament password path.
- **`boardCount` change after config set?** Panel renders only boards 1..current `boardCount`; orphaned `legsConfig.groups` entries retained silently (deletion is lossy and unexpected).

### Resolved During Planning (additional)

- **Legs-to-win valid range**: 1–9 integers. Existing board UI shows 1–8; extend to 1–9 in this PR. All input validation (Zod, UI select) must enforce this range.
- **Full auth on `updateMatchGameplaySettingsAction`**: always require `authorizeUserResult` (no password path). Risk of breaking existing workflows is low — no production flow calls this action unauthenticated.

### Deferred to Implementation

- Exact Mongoose schema type for `legsConfig` — Mixed or explicit subdocument with `groups` and `knockout` nested schemas (both work; verify strict mode doesn't strip nested `Record` keys with Mixed type).
- i18n key names for all new UI strings — follow existing `messages/{en,hu,de}.json` pattern.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
flowchart TB
    subgraph schema [Schema Layer]
        TS["TournamentSettings\n+ legsConfig: {groups, knockout}"]
    end

    subgraph wizard [Creation Wizard]
        W1["Settings step\nGroup Stage panel (bulk + per-board rows)\nKnockout panel (pure-knockout only)"]
        W1 -->|"included in createTournamentAction payload"| TS
    end

    subgraph admin [Admin Tab]
        A1["Legs Config panel\n(auto-save per row)\nupdateTournamentSettingsAction"]
        A1 -->|"merges legsConfig into tournamentSettings"| TS
    end

    subgraph cancel [Cancel Knockout]
        CK["cancelKnockoutAction\nclears legsConfig.knockout"]
        CK -->|"update tournamentSettings"| TS
    end

    subgraph board [Board Start]
        B1["startBoardMatchAction\n1. fetch tournamentSettings.legsConfig\n2. lookup by match.boardReference or match.round\n3. if config + non-admin → enforce (400 on mismatch)\n4. if admin/mod → allow override\n5. MatchService.startMatch(...)"]
        TS -->|"read legsConfig"| B1
    end

    subgraph gameplay [In-Match Override]
        G1["updateMatchGameplaySettingsAction\n+ auth + role check\n+ config enforcement for legsToWin"]
        TS -->|"read legsConfig"| G1
    end

    subgraph ui [Board UI]
        UI1["BoardMatchSetupScreen\nlegacy: free select\nconfig set + non-admin: disabled + lock badge\nconfig set + admin: editable + override badge"]
    end
```

## Implementation Units

- [ ] **Unit 1: Data model — `legsConfig` in `TournamentSettings`**

**Goal:** Add `legsConfig` to the TypeScript interface and Mongoose schema; make it an optional nested structure keyed by board number and round number.

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Modify: `packages/core/src/interfaces/tournament.interface.ts`
- Modify: `packages/core/src/models/tournament.model.ts`

**Approach:**
- Add `legsConfig?: { groups?: Record<number, number>; knockout?: Record<number, number> }` to `TournamentSettings` interface.
- Add corresponding optional Mongoose schema field inside `tournamentSettings`. Use `mongoose.Schema.Types.Mixed` or explicit nested schema — choose based on which preserves nested object keys without `strict` mode stripping.
- No migration needed; existing documents without the field read as `undefined` (correct "no config" fallback per R9/R17).

**Patterns to follow:**
- Existing optional fields in `TournamentSettings` (e.g., `knockoutMethod`, `coverImage`).

**Test scenarios:**
- Happy path: create a tournament document without `legsConfig` → field is `undefined`, no error.
- Happy path: create a tournament document with `legsConfig.groups = { 1: 3, 2: 5 }` → persists and reads back correctly.
- Happy path: create with `legsConfig.knockout = { 1: 3, 2: 5, 3: 7 }` → persists and reads back correctly.
- Edge case: call `generateGroups` on a tournament that has `legsConfig.groups` set → `legsConfig` is still present after save.
- Edge case: call `generateKnockout` on a tournament that has `legsConfig.knockout` set → `legsConfig.knockout` survives (regeneration does not touch `tournamentSettings`).

**Verification:**
- Unit tests pass for schema round-trip.
- `legsConfig` accessible on `tournament.tournamentSettings.legsConfig` after save and reload.

---

- [x] **Unit 2: Creation wizard — CANCELLED**

Legs config is not set during tournament creation. Groups and knockout rounds don't exist yet and their size (which determines appropriate `legsToWin`) is unknown. Configuration happens exclusively in the Admin tab after group/knockout generation.

---

- [ ] **Unit 3: Admin tab — Legs Config panel + cancel knockout clear**

**Goal:** Expose legs config editing in the Admin tab for post-generation management. Each group (board) and each knockout round can have a **different** `legsToWin` value — groups with more players may warrant more legs. Clear `legsConfig.knockout` when knockout is cancelled.

**Requirements:** R11, R12, R13, R14

**Dependencies:** Unit 1

**Files:**
- New: `apps/web/src/components/tournament/LegsConfigPanel.tsx`
- Modify: `apps/web/src/app/[locale]/tournaments/[code]/TournamentPageClient.tsx`
- Modify: `apps/web/src/features/tournaments/actions/manageTournament.action.ts` (add `updateLegsConfigAction`)
- Modify: `packages/services/src/tournament.service.ts` (add `updateLegsConfig`)
- Already done: `packages/services/src/tournament.service.ts` `cancelKnockout` clears `legsConfig.knockout`

**Approach:**
- Create a standalone `LegsConfigPanel` component rendered inside the admin `<TabsContent>` in `TournamentPageClient`.
- Add `TournamentService.updateLegsConfig(code, userId, legsConfig)` — uses `findOne` + `markModified('tournamentSettings.legsConfig')` to avoid the spread-corruption risk in `updateTournamentSettings`.
- Add `updateLegsConfigAction` server action in `manageTournament.action.ts`.
- Panel layout:
  - **Group Stage section** (visible when format includes groups AND `tournament.groups.length > 0`):
    - Shows a note "Generate groups first" when no groups exist.
    - One row per board number (from `tournament.boards`, sorted): label "Board N (X players)" + `<select>` 1–9 + "Not set" option.
    - Bulk row at top: "Set all boards:" select + Apply button.
    - Each row auto-saves on change.
  - **Knockout section** (visible when format includes knockout AND `tournament.knockout.length > 0`):
    - One row per round (sorted by `round` number): label "Round N" + `<select>` 1–9 + "Not set" option.
    - Bulk row at top: "Set all rounds:" select + Apply button.
    - Each row auto-saves on change.
    - Inline cleared notice when `legsConfig.knockout` was cleared after cancel.
  - Both sections: read-only with note when tournament status is `finished`.
  - Inline save state per row: idle → saving spinner → saved checkmark (fades) → error.
- Player count per group: derive from `tournament.groups.find(g => g.board === boardNum)?.matches.length` or player assignments — this is contextual info shown as a hint, not used for enforcement.

**Test scenarios:**
- Happy path: admin changes board 1 legs from 3 to 5 → auto-save fires, `tournamentSettings.legsConfig.groups["1"]` updated.
- Happy path: board 2 set to 5 legs (more players), board 1 set to 3 legs → both values persist independently.
- Happy path: admin bulk-sets all boards to 3 → all board entries updated.
- Happy path: cancel knockout → `legsConfig.knockout` is cleared from the tournament.
- Edge case: save fails → row shows error state, previous value in DB unchanged.
- Edge case: tournament status is `finished` → all inputs disabled with note.
- Edge case: no groups generated → Group Stage panel shows "Generate groups first" note.

**Verification:**
- `updateLegsConfigAction` with `{ groups: { "1": 5, "2": 3 } }` saves correctly without wiping other `tournamentSettings` fields.
- After cancel knockout, `tournament.tournamentSettings.legsConfig.knockout` is `undefined`.

---

- [ ] **Unit 4: Board action enrichment + global admin role fix**

**Goal:** Make `legsConfig` available to the board UI; fix global admin misclassification in `getBoardUserRoleAction`.

**Requirements:** R3 (data fetch prerequisite), R16 (global admin override UI)

**Dependencies:** Unit 1

**Files:**
- Modify: `apps/web/src/features/board/actions/boardPage.action.ts`

**Approach:**
- In `getBoardTournamentAction`: add `legsConfig` to the `tournamentSettings` projection returned. The `TournamentService.getTournamentLite` select string must include `tournamentSettings.legsConfig`.
- In `getBoardUserRoleAction`: after fetching `clubRole` via `ClubService.getUserRoleInClub`, also call `AuthorizationService.isGlobalAdmin(userId)` in parallel. If `isGlobalAdmin` is true, return `{ clubRole: 'admin' }` (to ensure global admins see the override UI).

**Patterns to follow:**
- The `assertBoardAccess` function already calls `isGlobalAdmin` in parallel with the club role check — mirror that pattern in `getBoardUserRoleAction`.

**Test scenarios:**
- Happy path: `getBoardTournamentAction` for a tournament with `legsConfig.groups = { 1: 3 }` → response includes `tournamentSettings.legsConfig.groups[1] === 3`.
- Happy path: `getBoardTournamentAction` for a tournament with no `legsConfig` → `tournamentSettings.legsConfig` is `undefined` (not an error).
- Happy path: global admin user calls `getBoardUserRoleAction` → returns `{ clubRole: 'admin' }`.
- Happy path: regular club member calls `getBoardUserRoleAction` → returns `{ clubRole: 'member' }`.

**Verification:**
- Board page `tournamentSettings` object includes `legsConfig` when it exists.
- Global admin is correctly identified as admin-level in board role response.

---

- [ ] **Unit 5: Board start enforcement — resolve and enforce `legsToWin` from config**

**Goal:** Make `startBoardMatchAction` resolve `legsToWin` from tournament config at match-start time; reject non-privileged overrides.

**Requirements:** R3, R4

**Dependencies:** Unit 1, Unit 4 (config accessible; role check pattern confirmed)

**Files:**
- Modify: `apps/web/src/features/board/actions/boardPage.action.ts`

**Approach:**
- In `startBoardMatchAction`, after `assertBoardAccess`:
  1. Fetch `match` to determine `match.type` (`'group'` or `'knockout'`) and `match.boardReference` or `match.round`.
  2. Fetch `tournament.tournamentSettings.legsConfig` (targeted select, not full tournament).
  3. Determine configured value: if `match.type === 'group'`, look up `legsConfig?.groups?.[boardNumber]`; if `match.type === 'knockout'`, look up `legsConfig?.knockout?.[match.round]`.
  4. Determine caller privilege: check `AuthorizationService.checkAdminOrModerator + isGlobalAdmin` (same as `assertBoardAccess` internals).
  5. If configured value exists AND caller is NOT privileged AND `parsed.legsToWin !== configuredValue` → throw 400 with descriptive message ("legsToWin is set by the tournament organizer and cannot be changed").
  6. If configured value exists AND caller IS privileged → use submitted value as override (logged as admin override).
  7. If no configured value → use submitted value as today (free selection).
  8. Pass resolved `legsToWin` to `MatchService.startMatch`.
- Add `min(1).max(9)` validation to `legsToWin` in `startBoardMatchSchema` (replaces bare `z.number()`).

**Patterns to follow:**
- Existing privilege check pattern in `assertBoardAccess`.
- Targeted MongoDB select used elsewhere in `boardPage.action.ts`.

**Test scenarios:**
- Happy path: config sets group 1 = 3 legs; regular scorer submits 3 → match starts with `legsToWin = 3`.
- Happy path: config absent → regular scorer submits 2 → match starts with `legsToWin = 2`.
- Happy path: config sets group 1 = 3 legs; admin submits 5 (override) → match starts with `legsToWin = 5`.
- Error path: config sets group 1 = 3 legs; non-admin submits 2 → action returns 400 with descriptive error.
- Error path: non-admin submits `legsToWin = 0` → Zod validation rejects before any config check.
- Integration: full lifecycle — tournament with `legsConfig.groups = { 1: 3 }` → start match on board 1 → `match.legsToWin === 3`.
- Integration: knockout match round 2 config set to 5 → start match → `match.legsToWin === 5`.

**Verification:**
- Regular scorer cannot start a match with a value different from the organizer's config.
- Admin override is accepted and correctly persisted on the match.
- Free selection still works when no config is set.

---

- [ ] **Unit 6: Gameplay enforcement — `updateMatchGameplaySettingsAction` auth + role + config**

**Goal:** Add authentication, role check, and config enforcement to `updateMatchGameplaySettingsAction` so the in-match legs change path is locked for non-privileged callers.

**Requirements:** R5

**Dependencies:** Unit 1

**Files:**
- Modify: `apps/web/src/features/matches/actions/matchGameplay.action.ts`

**Approach:**
- Add `authorizeUserResult()` call at the top of `updateMatchGameplaySettingsAction`.
- If auth fails, throw `UnauthorizedError`.
- If `data.legsToWin !== undefined`, fetch the match's tournament, determine the relevant `legsConfig` value (same lookup logic as Unit 5), check privilege (admin/mod/globalAdmin). If not privileged and config exists → throw 403.
- If caller is not authenticated at all → throw 401 (board password-authenticated scorers cannot call this action).

**Patterns to follow:**
- Auth pattern from other match actions in the same file that do have `authorizeUserResult`.
- Config lookup logic from Unit 5.

**Test scenarios:**
- Happy path: admin changes `legsToWin` on ongoing match with config set → accepted.
- Happy path: no config set → any authenticated user can change `legsToWin` (existing behavior preserved where appropriate).
- Error path: unauthenticated caller tries to change `legsToWin` → 401.
- Error path: non-privileged authenticated user tries to change `legsToWin` when config is set → 403.
- Error path: non-privileged user tries to change `legsToWin` when config is NOT set → should still require auth (401 if unauthenticated, allowed if authenticated and no config).

**Verification:**
- Unauthenticated POST to `updateMatchGameplaySettingsAction` is rejected.
- Non-privileged user cannot change `legsToWin` when tournament config is set.
- Admin can change `legsToWin` even when config is set.

---

- [ ] **Unit 7: Board UI enforcement — locked / override display in `BoardMatchSetupScreen`**

**Goal:** Show locked legs-to-win to regular scorers; show editable field with override indicator to admins/mods.

**Requirements:** R15, R16, R17

**Dependencies:** Unit 4 (role and config available on board page); Unit 5 for full end-to-end verification (UI can be developed independently, but manual QA of locked/override behavior should wait until server enforcement is in place)

**Files:**
- Modify: `apps/web/src/features/board/components/BoardMatchSetupScreen.tsx`
- Modify: `apps/web/src/app/[locale]/board/[tournamentId]/page.tsx` (passes role + config to setup screen)
- Modify: `apps/web/src/features/board/types.ts` (if new props needed on Board/Match types)

**Approach:**
- Add props to `BoardMatchSetupScreen`:
  - `configuredLegsToWin?: number` — the organizer-set value for this match (if any).
  - `isPrivileged: boolean` — whether the current user is admin/moderator (from `getBoardUserRoleAction`).
- Derive `isLocked = configuredLegsToWin !== undefined && !isPrivileged`.
- When `isLocked`:
  - Set `disabled` on the legs `<select>`.
  - Add `aria-disabled="true"` and `aria-label` that includes "set by organizer".
  - Show a lock badge or note below the selector ("Set by organizer: X legs").
- When `configuredLegsToWin !== undefined && isPrivileged` (override mode):
  - Selector remains editable.
  - Show an override badge ("Override: organizer set X legs").
  - `aria-describedby` pointing to the override note.
- Pre-fill `legsToWin` with `configuredLegsToWin` when it is set (both locked and override modes).
- Fix legs options array from `[1..8]` to `[1..9]`.
- Update the confirm dialog to show "Organizer config: X legs" when `configuredLegsToWin` is set, so context is preserved through the confirmation step.
- Pass `configuredLegsToWin` and `isPrivileged` from the board page to the setup screen via existing board page state management.

**Patterns to follow:**
- Existing `disabled` + `aria-*` patterns in the project's form components.
- How `getBoardUserRoleAction` result is already used in `apps/web/src/app/[locale]/board/[tournamentId]/page.tsx`.

**Test scenarios:**
- Happy path (UI): config = 3 legs, non-admin → legs selector shows "3", is disabled, lock badge visible.
- Happy path (UI): config = 3 legs, admin → legs selector editable with value "3", override badge visible.
- Happy path (UI): no config → legs selector free, no badge or lock.
- Edge case: config legs value is 9 → shows correctly in disabled selector and in options list (now 1–9).
- Accessibility: disabled legs selector has `aria-disabled` and descriptive `aria-label` in all three states.
- Confirm dialog: when locked, dialog shows organizer-config context.

**Verification:**
- Regular scorer cannot interact with the legs selector when config is set.
- Admin/moderator sees override context and can change the value before starting.
- Board page still functions when no config is set (R17 — free selection preserved).

---

## System-Wide Impact

- **Interaction graph:** `TournamentStatusChanger` → `updateTournamentSettingsAction` → `TournamentService.updateTournamentSettings` (existing chain, no new components introduced). `cancelKnockoutAction` extended to clear `legsConfig.knockout`. `startBoardMatchAction` gains a tournament fetch for config lookup.
- **Error propagation:** Board start rejection (400) surfaces as a user-visible error on the board; existing error handling in `apps/web/src/app/[locale]/board/[tournamentId]/page.tsx` should catch and display it.
- **State lifecycle risks:** If `cancelKnockoutAction` clears `legsConfig.knockout` but the subsequent `generateKnockout` fails, config remains cleared. Acceptable: the admin tab will show no knockout config and the organizer can re-enter it.
- **API surface parity:** The board page's `tournamentSettings` serialization expands — consumers of `getBoardTournamentAction` (i.e., the board page client) will now receive `legsConfig`. No breaking change; new optional field.
- **Integration coverage:** The Unit 1 edge-case test (generation does not wipe `legsConfig`) is the most critical integration scenario and must run against a real in-memory MongoDB instance (Pattern A tests), not mocks.
- **Unchanged invariants:** `MatchService.startMatch` signature unchanged; `legsToWin` continues to be set on the `Match` document. `tournamentSettings` merge behavior in `updateTournamentSettings` is unchanged (additive merge). Existing board scoring, leg tracking, and stats aggregation are unaffected.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Mongoose strict mode silently drops nested `legsConfig` object | Verify with a round-trip test in Unit 1; use explicit nested schema if Mixed type strips keys |
| `updateMatchGameplaySettingsAction` full auth may break existing callers | Full auth is required and intentional (resolved). Verify no production flow calls this unauthenticated before shipping. |
| Cancel knockout clearing `legsConfig.knockout` could surprise organizers mid-tournament | Show a clear inline notice in the Admin tab knockout panel after cancel |
| `getBoardUserRoleAction` global-admin fix could silently elevate previously blocked users | Intentional and correct: mirrors `assertBoardAccess` behavior that already allows global admin board access |

## Documentation / Operational Notes

- No database migration needed — optional Mongoose fields default to `undefined`.
- Add i18n strings to `apps/web/messages/en.json`, `hu.json`, `de.json` for: lock badge, override badge, inline warnings, wizard panel labels, admin tab section label.
- The leg options range in `BoardMatchSetupScreen` changes from 1–8 to 1–9 — minor cosmetic change, no scoring impact.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-14-tournament-legs-config-requirements.md](docs/brainstorms/2026-04-14-tournament-legs-config-requirements.md)
- Related code: `packages/services/src/tournament-group.service.ts` (group generation), `packages/services/src/tournament.service.ts` (knockout generation + `updateTournamentSettings`)
- Test reference: `apps/web/src/tests/simple-tournament-lifecycle.test.ts`
