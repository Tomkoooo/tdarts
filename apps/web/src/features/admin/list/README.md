# Admin list pages (URL-driven data)

Server list pages follow this pattern (see [UI-CONTRACT.md](../../../../../../docs/docs-internal/admin-phases/UI-CONTRACT.md)):

1. **RSC page** (`app/[locale]/admin/.../page.tsx`) reads `searchParams`, calls a `*QueryService.list()`, passes `rows` to a table component using `AdminDataGrid`.
2. **Filters / search** use client components that debounce or update URL via `router.replace` (`AdminListSearch`, `AdminListSelect`, `AdminListParamInput`).
3. **Pagination** uses `AdminListPagination` with preserved query keys (page omitted when `1`).
4. **Table chrome** (columns, saved views, bulk UI) stays in `AdminDataGrid` — `localStorage` only, not server filters.

Reference implementations: `app/[locale]/admin/users/page.tsx`, `clubs/page.tsx`, `tournaments/page.tsx`.
