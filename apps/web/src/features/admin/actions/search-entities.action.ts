'use server';

import {
  AdminEntitySearchService,
  ADMIN_CAPABILITIES,
  type AdminEntitySearchHit,
  type AdminEntitySearchKind,
} from '@tdarts/services';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';
import type { AdminCapability } from '@/features/admin/lib/admin-capabilities';

const KIND_CAPABILITY: Record<AdminEntitySearchKind, AdminCapability> = {
  user: ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE,
  player: ADMIN_CAPABILITIES.ADMIN_PLAYERS_READ,
  tournament: ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_READ,
  club: ADMIN_CAPABILITIES.ADMIN_CLUBS_READ,
};

export async function adminSearchEntitiesAction(
  q: string,
  kind: AdminEntitySearchKind,
  limit = 12,
): Promise<{ ok: true; hits: AdminEntitySearchHit[] } | { ok: false; error: string }> {
  try {
    await requireAdminCapability(KIND_CAPABILITY[kind]);
    const hits = await AdminEntitySearchService.search(q, kind, limit);
    return { ok: true, hits };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Search failed' };
  }
}
