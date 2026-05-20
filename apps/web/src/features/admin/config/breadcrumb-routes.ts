/** Dynamic admin routes for breadcrumb parent resolution (locale stripped). */

export type AdminBreadcrumbRoute = {
  /** Path pattern after /admin, e.g. `matches/:id` */
  pattern: string;
  /** i18n key under Admin */
  titleKey: string;
  /** Parent list href */
  listHref: string;
};

export const ADMIN_BREADCRUMB_ROUTES: AdminBreadcrumbRoute[] = [
  { pattern: 'users/:id', titleKey: 'layout.sidebar.users', listHref: '/admin/users' },
  { pattern: 'clubs/:id', titleKey: 'layout.sidebar.clubs', listHref: '/admin/clubs' },
  { pattern: 'players/:id', titleKey: 'nav.players', listHref: '/admin/players' },
  { pattern: 'tournaments/:id', titleKey: 'layout.sidebar.tournaments', listHref: '/admin/tournaments' },
  { pattern: 'matches/:id', titleKey: 'nav.matches', listHref: '/admin/matches' },
  { pattern: 'leagues/:id', titleKey: 'layout.sidebar.leagues', listHref: '/admin/leagues' },
  { pattern: 'support/feedback/:id', titleKey: 'layout.sidebar.feedback', listHref: '/admin/support/feedback' },
  { pattern: 'observability/errors/:id', titleKey: 'layout.sidebar.errors', listHref: '/admin/observability/errors' },
];

export function matchAdminBreadcrumbRoute(pathname: string): {
  route: AdminBreadcrumbRoute;
  id: string;
} | null {
  const parts = pathname.split('/').filter(Boolean);
  const adminIdx = parts.indexOf('admin');
  if (adminIdx < 0) return null;
  const afterAdmin = parts.slice(adminIdx + 1);
  if (afterAdmin.length < 2) return null;
  const rel = afterAdmin.join('/');
  const id = afterAdmin[afterAdmin.length - 1]!;

  for (const route of ADMIN_BREADCRUMB_ROUTES) {
    const segs = route.pattern.split('/');
    if (segs.length !== afterAdmin.length) continue;
    const ok = segs.every((s, i) => s.startsWith(':') || s === afterAdmin[i]);
    if (ok) return { route, id };
  }
  return null;
}
