# Admin feature (frontend reset)

The previous admin **UI / design system** was removed so a new interactive dashboard can be built from scratch.

## What remains (use these)

| Path | Purpose |
|------|---------|
| `*/actions.ts` | Server actions (auth + `@tdarts/services`) — **do not delete** |
| `lib/admin-capabilities.ts` | Client-safe capability string constants (no Mongo/nodemailer import) |
| `lib/AdminRouteStub.tsx` | Temporary route placeholder until real UI exists |
| `../../docs/admin/admin-backend-requirements.md` | Spec for **new** backend APIs when the new UI needs them |

## What was removed

- v0 shell (sidebar, header, KPI/charts)
- Design preview (`ui/design-preview/`)
- All entity tables, forms, and wired pages
- Admin CSS tokens in `globals.css` (`--color-admin-*`, `.admin-text-*`)

## Rules for the next UI agent

1. **Frontend only** in this folder and `app/[locale]/admin/`.
2. If an API or server action is missing, document it in `docs/admin/admin-backend-requirements.md` (or a new file under `docs/admin/`) — do not change `packages/services` from the UI task unless explicitly scoped.
3. Import capabilities from `@/features/admin/lib/admin-capabilities` in client components, not from `@tdarts/services`.
4. Reuse existing `actions.ts` where possible before requesting new endpoints.
