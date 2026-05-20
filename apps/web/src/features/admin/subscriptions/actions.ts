'use server';

import { AdminSubscriptionsQueryService, ADMIN_CAPABILITIES } from '@tdarts/services';
import type { AdminSubscriptionRow } from '@tdarts/services';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';
import { toListSort, type AdminListParams } from '@/features/admin/lib/list-params';

export async function adminListSubscriptionsAction(
  params: AdminListParams,
): Promise<
  { ok: true; total: number; rows: AdminSubscriptionRow[] } | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_SUBSCRIPTIONS_READ);
    const { total, rows } = await AdminSubscriptionsQueryService.list({
      q: params.q,
      page: params.page,
      limit: params.limit,
      sort: toListSort(params),
    });
    return { ok: true, total, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load subscriptions' };
  }
}
