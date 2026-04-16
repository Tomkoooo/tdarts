---
date: 2026-04-14
topic: tournament-legs-config
---

# Tournament Legs-to-Win Configuration

## Problem Frame

Tournament organizers have no way to pre-configure how many legs a player must win per match for each group or knockout round. Currently, whoever starts a match on the board manually selects `legsToWin` — opening the door to accidental or inconsistent settings. Organizers need full control over match format, with scorers locked out from changing it and admins retaining an emergency override.

## User Flow

```
flowchart TB
    Creation["Creation wizard\n(new step: Match Format)"]
    AdminTab["Admin tab\n(Legs Config panel)"]
    BoardStart["Board: start match"]
    Scorer["Regular scorer\nlegsToWin = locked read-only"]
    AdminOverride["Admin/mod scorer\nlegsToWin = editable + override indicator"]

    Creation -->|"sets legsToWin per group/round"| TournamentDoc["Tournament doc\nlegs config stored"]
    AdminTab -->|"auto-saves legsToWin per group/round"| TournamentDoc
    TournamentDoc -->|"pre-fills match at start time"| BoardStart
    BoardStart --> Scorer
    BoardStart --> AdminOverride
```

## Requirements

**Data model**

- R1. Legs-to-win configuration is stored on the tournament document in a way that survives group-generation and knockout-bracket-generation operations (both currently replace their respective arrays wholesale). Exact storage location is a planning decision, but must be resilient to regeneration.
- R2. Each group and each knockout round must be individually addressable for legs-to-win, allowing different values per group (e.g. all groups = 3 legs) and per knockout round (e.g. QF = 3, SF = 5, Final = 7).
- R3. When a board scorer starts a match, `match.legsToWin` is resolved dynamically from the tournament's stored configuration for that group or knockout round, at board-start time (not at match-creation time). This ensures late admin edits apply to all unstarted matches.
- R4. The server validates that the submitted `legsToWin` matches the tournament's configured value when the caller is not an admin or moderator — if a value is configured, non-privileged callers cannot override it server-side.
- R5. `updateMatchGameplaySettingsAction` (which can change `legsToWin` on an ongoing match) must respect the same role check: non-privileged callers cannot change `legsToWin` when the tournament has configured a value for that match's group/round.

**Tournament creation wizard**

- R6. The creation wizard gains a "Match Format" step (or section) after the format/structure step.
- R7. The Match Format step contains a **Group Stage** panel (shown only if format includes groups) and a **Knockout Rounds** panel (shown only if format includes knockout). If only one panel applies, only that panel is shown. If neither panel would be shown, the step is skipped or hidden.
- R8. Each panel provides:
  - A bulk "Set all" input: one numeric value field + apply button that fills all groups/rounds with that value at once.
  - Individual per-group or per-knockout-round rows, each with a legs-to-win selector that can differ from the bulk value.
- R9. Legs-to-win values are optional at creation; a group or round with no value set falls back to the current free-selection behavior on the board.
- R10. The legs-to-win selector accepts integers between 1 and 9 only; zero, negative, non-integer, and out-of-range values are rejected with inline error messages.

**Admin tab – Legs Config panel**

- R11. The Admin tab includes a "Legs Configuration" section with the same group/round controls as the creation wizard.
- R12. Changes auto-save per row on blur/change; no explicit Save button is needed. Each row shows a loading state while saving and an inline success or error indicator on completion.
- R13. The panel is editable while tournament status is `pending`, `active`, `group-stage`, or `knockout`; it is read-only (visually locked with a brief explanation) when status is `finished`.
- R14. When legs config is changed for a group or round that already has at least one match started (status `ongoing` or `finished`), a non-blocking warning is shown inline: "X matches in this group have already started and will not be affected."

**Board enforcement**

- R15. When a group/round has a configured `legsToWin`, the legs selector in `BoardMatchSetupScreen` is **disabled** (read-only) for regular scorers. The pre-filled value is shown clearly. The selector has appropriate ARIA attributes (`aria-disabled`, descriptive `aria-label`) and a visible lock badge or note.
- R16. Admins and moderators see the same pre-filled value but the selector remains **editable**, with a visible override indicator (e.g. "Override: set by organizer" badge). The override indicator is announced via `aria-describedby` for screen readers.
- R17. If a group/round has no `legsToWin` configured, the board behaves as it does today (scorer selects freely).

## Success Criteria

- An organizer can set legs-to-win for every group and every knockout round before a tournament starts.
- A scorer at the board cannot accidentally change or circumvent a pre-configured legs value (UI locked + server enforced).
- An admin or moderator can still override a locked value on the board for exceptional situations.
- Setting one value for all groups or all knockout rounds takes no more than two interactions (type value → apply).
- Late admin-tab edits apply to all matches not yet started.

## Scope Boundaries

- Sets-to-win (`setsToWin`) are out of scope; only legs are addressed.
- Per-match overrides from the tournament management UI (not the board) are out of scope; admin override happens at board-start time only.
- This does not change how legs are scored, tracked, or aggregated — only how `legsToWin` is sourced.

## Key Decisions

- **Per group and per knockout round** (not a single tournament-wide default): gives organizers fine-grained control, e.g. group stage = 3 legs, QF = 3, SF = 5, Final = 7.
- **Optional at creation**: existing tournaments and creation flows are unaffected if the field is left empty.
- **Locked for scorers, editable for admins/mods**: balances control with operational flexibility. Enforced both client-side and server-side.
- **Resolved at board-start time** (not match-creation): late admin-tab edits apply to all unstarted matches.
- **Auto-save per row**: changes in the Legs Config panel save immediately on blur/change with per-row feedback.

## Dependencies / Assumptions

- `tournament.groups[]` and `tournament.knockout[]` generation services both replace their arrays wholesale; legs config storage must survive this (e.g. stored in `tournamentSettings` or a separate parallel config map keyed by board/round).
- The board page action (`boardPage.action.ts`) currently does not fetch `groups[]` or `knockout[]` data — the tournament fetch at board time must be extended, or the legs config must be queryable independently.
- Role check for board-level override (`admin` / `moderator`) must also account for global admin users, who pass `assertBoardAccess` but currently return only `clubRole` from `getBoardUserRoleAction` (global admin may be misclassified as `member`).

## Outstanding Questions

### Resolve Before Planning
*(none — all blocking questions resolved)*

### Deferred to Planning

- [Affects R1][Technical] Where to store legs config to survive group/knockout generation: options include `tournamentSettings.legsConfig` (a plain object keyed by board/round), or preserving existing values during generation. Planning must choose and verify no existing generation code silently drops custom fields.
- [Affects R3][Technical] Exact lookup rule for how a group-stage match maps to its group entry (e.g. `match.boardReference === group.board` or `group.matches.includes(match._id)`) must be confirmed against the data model.
- [Affects R4, R5][Technical] Server enforcement strategy: reject with 400 if mismatch, or silently clamp to the configured value? Confirm which is less disruptive for existing board software.
- [Affects R16][Needs research] `getBoardUserRoleAction` returns club role only — confirm whether global admin handling needs to be added or if the role-check logic should use `assertBoardAccess` logic directly.
- [Affects R6–R8][Technical] For `group_knockout` format, knockout round count may not exist at wizard time (bracket is generated after groups complete) — determine whether knockout legs config in the wizard is set as templates applied at bracket-generation time.

## Next Steps
→ `/ce:plan` for structured implementation planning
