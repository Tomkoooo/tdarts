# Prior admin panel — UX to carry forward (internal)

The legacy admin UI was removed to allow a clean rebuild. This note captures **what worked well for operators** so the replacement can intentionally restore the same affordances. It is **not** a porting guide: new implementation may differ in stack, APIs, and components.

**See also:** [admin-authorization.md](./admin-authorization.md) — roles, capabilities, and server-side gating for the new admin.

Source code for these behaviors lived under `apps/web/src/app/[locale]/admin/`, `apps/web/src/components/admin/`, and `apps/web/src/features/admin/` until teardown; use git history for details.

## Alerts

**Goal:** Surface **health and attention** items at the top of the dashboard so nothing critical hides behind deep navigation.

**Behavior:** Items such as error volume in the last 24 hours, pending user feedback count, and optional **API traffic anomalies** (routes with unusual call volume, latency, or error spikes vs baseline) with **recency** so operators triage quickly.

## Recent activity (“what happened”)

**Goal:** A **chronological activity stream** answering “what just happened on the platform?”

**Behavior:** Mixed feed (e.g. new users, clubs, tournaments, auth-related events) with timestamps and light visual emphasis so a quick scan replaces opening many sub-pages.

## Latest entries / dashboard hub

**Goal:** The dashboard is a **hub**, not a dead end.

**Behavior:** Aggregate **totals** and **deltas** (e.g. month-over-month), **last-24h** style counters, **small charts** over time where useful, and **deep links** into the relevant admin area for follow-up.

## Quick todo adding

**Goal:** Capture tasks **without leaving the current context**.

**Behavior:** Global keyboard shortcut, compact input, integration with the admin shell (e.g. layout-level shortcut). Optional **command palette** entry for power users.

## Search on heavy list pages

**Goal:** Find one row in large datasets without endless scrolling.

**Behavior:** **Search** (and where needed **filters** / **pagination**) on entity lists such as users, clubs, tournaments, leagues.

## Layout and shell ergonomics

Worth recreating in spirit:

- **Unread feedback badge** on the admin sidebar (polling or push-driven) so support work is visible.
- **Command palette** for jumping between admin sections quickly.
- **Collapsible sidebar** to maximize content space on smaller viewports.

---

When the new admin ships, add Playwright coverage for critical operator flows rather than relying on the removed legacy E2E matrix.
