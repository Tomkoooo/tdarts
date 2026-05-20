'use server';

import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminDashboardService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';
import type { AdminDashboardRange, AdminDashboardSummary } from '@/features/admin/types';

export async function getDashboardDataAction(
  range?: AdminDashboardRange,
): Promise<{ ok: true; data: AdminDashboardSummary } | { ok: false; error: string }> {
  try {
    const user = await getServerUser();
    if (!user) return { ok: false, error: 'Unauthorized' };

    const allowed = await AdminAuthorizationService.hasAdminCapability(
      user._id,
      ADMIN_CAPABILITIES.ADMIN_SHELL,
    );
    if (!allowed) return { ok: false, error: 'Forbidden' };

    const parsedRange = AdminDashboardService.parseRange(range);
    const data = await AdminDashboardService.getSummary({ range: parsedRange });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load dashboard' };
  }
}
