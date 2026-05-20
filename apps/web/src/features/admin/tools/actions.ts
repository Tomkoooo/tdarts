'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminToolsService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';

export async function adminRevalidateDashboardAction(
  locale: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getServerUser();
    if (!user) return { ok: false, error: 'Unauthorized' };

    const allowed = await AdminAuthorizationService.hasAdminCapability(
      user._id,
      ADMIN_CAPABILITIES.ADMIN_TOOLS_EXECUTE,
    );
    if (!allowed) return { ok: false, error: 'Forbidden' };

    const paths = [`/${locale}/admin`, `/${locale}/admin/observability`];
    await AdminToolsService.logRevalidateAdminDashboard(user._id, { locale, paths });

    for (const p of paths) {
      revalidatePath(p);
    }
    revalidatePath(`/${locale}/admin`, 'layout');

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
