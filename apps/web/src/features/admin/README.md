# Admin feature

UI is built from **[next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter)** (**Claude** theme, dark). Full rules: `docs/docs-internal/admin-phases/TEMPLATE.md`.

## Phases shipped in repo

| Phase | Status |
|-------|--------|
| 0 Template mapping | `docs/docs-internal/admin-phases/TEMPLATE-MAPPING.md` |
| 1 Shell + Claude theme + RBAC nav | `components/layout/*`, `config/nav.ts` |
| 2 Overview + dashboard data | `overview/AdminOverview.tsx` |
| 3 Directory tables | Users, clubs, players, tournaments, matches, leagues (`list/` + `*DirectoryTable`) |
| 4 Detail & relations | Tabbed detail views (`detail/`, `*DetailView`) + relation links + flag forms |
| 5 Operations | Observability hub, feedback inbox, tools, feature-access debug |
| 6 Governance | System settings (`system/AdminSystemSettingsPanel`, `system/actions.ts`) |
| 7 Extended | Subscriptions directory, announcements (content), data explorer (`/admin/data`) |
| Ads | Stub until ads branch merge — `/admin/ads` unchanged |

## Docs

| Doc | Purpose |
|-----|---------|
| `docs/docs-internal/admin-phases/TEMPLATE.md` | **Required** porting guide |
| `docs/docs-internal/admin-phases/PLAN.md` | Phases 0–7 |
| `docs/docs-internal/admin-phases/TEMPLATE-MAPPING.md` | Nav ↔ routes ↔ capabilities |
| `docs/docs-internal/admin-rbac-and-actions.md` | RBAC |
| `docs/admin/admin-backend-requirements.md` | Backend backlog |

## Server layer (keep)

| Path | Purpose |
|------|---------|
| `actions/getDashboardData.action.ts` | Overview metrics |
| `actions/getAdminContext.action.ts` | Session + capabilities |
| `{domain}/actions.ts` | Domain mutations/queries |
| `lib/admin-capabilities.ts` | Client capability strings |
| `types/index.ts` | View DTOs |

## UI (starter ports)

| tDarts path | Starter source |
|-------------|----------------|
| `components/layout/admin-shell.tsx` | `src/app/dashboard/layout.tsx` |
| `components/layout/admin-app-sidebar.tsx` | `src/components/layout/app-sidebar.tsx` |
| `components/layout/admin-header.tsx` | `src/components/layout/header.tsx` |
| `overview/AdminOverview.tsx` | `src/features/overview/components/overview.tsx` |
| `config/nav.ts` | `src/config/nav-config.ts` (RBAC: capabilities, not Clerk) |
| `src/styles/themes/admin-claude.css` | `src/styles/themes/claude.css` |

## Rules

1. Routes: `app/[locale]/admin/*` only.
2. No Clerk; no starter mock data.
3. Client: never import `@tdarts/services`.
4. Theme: `data-theme="claude"` + `dark` on admin layout.
