import { test } from '@playwright/test';
import { assertNoCriticalDiagnostics } from './helpers/assertions';
import { attachDiagnostics } from './helpers/diagnostics';
import { gotoAndWaitStable } from './helpers/navigation';

type RouteCase = {
  name: string;
  route: string;
  requiresAuth?: boolean;
};

const tournamentCode = process.env.E2E_TOURNAMENT_CODE || 'N7A8';
const clubCode = process.env.E2E_CLUB_CODE || '68f6afb145352f8e4076ed55';

const routeMatrix: RouteCase[] = [
  { name: 'landing', route: '/en/landing' },
  { name: 'home', route: '/en/home' },
  { name: 'search', route: '/en/search' },
  { name: 'map', route: '/en/map' },
  { name: 'board', route: '/en/board' },
  { name: 'board tournament', route: `/en/board/${tournamentCode}` },
  { name: 'tournament detail', route: `/en/tournaments/${tournamentCode}` },
  { name: 'club detail', route: `/en/clubs/${clubCode}` },
  { name: 'profile', route: '/en/profile', requiresAuth: true },
  { name: 'myclub', route: '/en/myclub', requiresAuth: true },
  { name: 'admin dashboard', route: '/en/admin', requiresAuth: true },
  { name: 'admin users', route: '/en/admin/users', requiresAuth: true },
  { name: 'admin clubs', route: '/en/admin/clubs', requiresAuth: true },
];

test.describe('page matrix diagnostics', () => {
  for (const item of routeMatrix) {
    test(`${item.name} loads without critical diagnostics`, async ({
      page,
    }, testInfo) => {
      const isAuthProject = testInfo.project.name.includes('auth');
      test.skip(
        Boolean(item.requiresAuth) && !isAuthProject,
        'Route is only checked in authenticated project.'
      );

      const diagnostics = await attachDiagnostics(
        page,
        testInfo,
        `page-matrix-${item.name.replace(/\s+/g, '-')}`,
        {
          ignoreResponseUrlPatterns: [
            /googleapis\.com/,
            /google-analytics\.com/,
            /fonts\.gstatic\.com/,
          ],
        }
      );

      await gotoAndWaitStable(page, item.route);
      await page.waitForTimeout(400);

      const { report } = await diagnostics.stop();
      assertNoCriticalDiagnostics(report, {
        allowResponsePatterns: [/\/api\/auth\/session/],
      });
    });
  }
});
