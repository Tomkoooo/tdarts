'use server';

import {
  AdminLeaguesQueryService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';
import type { AdminLeagueDetail, AdminLeagueListRow } from '@tdarts/services';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';
import { toListSort, type AdminListParams } from '@/features/admin/lib/list-params';

export async function adminListLeaguesAction(
  params: AdminListParams,
): Promise<
  { ok: true; total: number; rows: AdminLeagueListRow[] } | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_LEAGUES_READ);
    const { total, rows } = await AdminLeaguesQueryService.list({
      q: params.q,
      page: params.page,
      limit: params.limit,
      sort: toListSort(params),
    });
    return { ok: true, total, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load leagues' };
  }
}

export async function adminGetLeagueDetailAction(
  leagueId: string,
): Promise<
  { ok: true; league: AdminLeagueDetail } | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_LEAGUES_READ);
    const league = await AdminLeaguesQueryService.getById(leagueId);
    if (!league) return { ok: false, error: 'League not found' };
    return { ok: true, league };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load league' };
  }
}
