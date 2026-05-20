'use server';

import {
  AdminListKpiService,
  type AdminListKpiQuery,
  type AdminListKpiSnapshot,
} from '@tdarts/services';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';
import { ADMIN_CAPABILITIES, type AdminCapability } from '@/features/admin/lib/admin-capabilities';

export type AdminListKpiDomain = 'users' | 'clubs' | 'tournaments' | 'players' | 'matches' | 'leagues';

const CAP: Record<AdminListKpiDomain, AdminCapability> = {
  users: ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE,
  clubs: ADMIN_CAPABILITIES.ADMIN_CLUBS_READ,
  tournaments: ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_READ,
  players: ADMIN_CAPABILITIES.ADMIN_PLAYERS_READ,
  matches: ADMIN_CAPABILITIES.ADMIN_MATCHES_READ,
  leagues: ADMIN_CAPABILITIES.ADMIN_LEAGUES_READ,
};

export type AdminListKpiActionInput = AdminListKpiQuery & {
  domain: AdminListKpiDomain;
};

export async function adminGetListKpiAction(
  domain: AdminListKpiDomain,
  query?: AdminListKpiQuery,
): Promise<{ ok: true; snapshot: AdminListKpiSnapshot } | { ok: false; error: string }> {
  try {
    await requireAdminCapability(CAP[domain]);
    const q: AdminListKpiQuery = {
      range: query?.range ?? null,
      from: query?.from ?? null,
      to: query?.to ?? null,
      group: query?.group ?? null,
    };
    const loaders: Record<AdminListKpiDomain, (input: AdminListKpiQuery) => Promise<AdminListKpiSnapshot>> = {
      users: (input) => AdminListKpiService.users(input),
      clubs: (input) => AdminListKpiService.clubs(input),
      tournaments: (input) => AdminListKpiService.tournaments(input),
      players: (input) => AdminListKpiService.players(input),
      matches: (input) => AdminListKpiService.matches(input),
      leagues: (input) => AdminListKpiService.leagues(input),
    };
    const snapshot = await loaders[domain](q);
    return { ok: true, snapshot };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
