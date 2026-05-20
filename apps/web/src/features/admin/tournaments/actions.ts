'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminTournamentsMutationService,
  AdminTournamentsQueryService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';
import type { AdminTournamentListRow } from '@tdarts/services';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';
import { toListSort, type AdminListParams } from '@/features/admin/lib/list-params';

export type AdminTournamentsListParams = AdminListParams & {
  status?: string;
};

export async function adminListTournamentsAction(
  params: AdminTournamentsListParams,
): Promise<
  { ok: true; total: number; rows: AdminTournamentListRow[] } | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_READ);
    const { total, rows } = await AdminTournamentsQueryService.list({
      q: params.q,
      page: params.page,
      limit: params.limit,
      sort: toListSort(params),
      status: params.status && params.status !== 'all' ? params.status : undefined,
    });
    return { ok: true, total, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load tournaments' };
  }
}

export async function adminGetTournamentStatsAction(filters?: {
  status?: string;
  clubId?: string;
}) {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_READ);
    const stats = await AdminTournamentsQueryService.getStats(filters);
    return { ok: true as const, stats };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminGetTournamentRelationsAction(
  tournamentId: string,
  filters?: {
    playerStatus?: string;
    playerQ?: string;
    matchStatus?: string;
    matchType?: string;
    matchRound?: string;
    matchBoard?: string;
  },
) {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_READ);
    const relations = await AdminTournamentsQueryService.getRelations(tournamentId, filters);
    return { ok: true as const, relations };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminGetTournamentDetailAction(
  idOrCode: string,
): Promise<{ ok: true; tournament: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_READ);
    const tournament = await AdminTournamentsQueryService.findOneForAdmin(idOrCode);
    if (!tournament) return { ok: false, error: 'Tournament not found' };
    return { ok: true, tournament };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load tournament' };
  }
}

async function requireTournamentWrite() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_WRITE);
  if (!ok) throw new Error('Forbidden');
  return user;
}

export async function adminPatchTournamentFieldsAction(
  locale: string,
  tournamentMongoId: string,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireTournamentWrite();
    const settingsName = patch['tournamentSettings.name'];
    const settingsStatus = patch['tournamentSettings.status'];
    const nested = patch.tournamentSettings as { name?: string; status?: string } | undefined;
    const name =
      typeof settingsName === 'string'
        ? settingsName
        : typeof nested?.name === 'string'
          ? nested.name
          : undefined;
    const status =
      typeof settingsStatus === 'string'
        ? settingsStatus
        : typeof nested?.status === 'string'
          ? nested.status
          : undefined;
    const clubId = patch.clubId !== undefined ? patch.clubId : undefined;

    if (name !== undefined || status !== undefined || clubId !== undefined) {
      await AdminTournamentsMutationService.updateSettings(actor._id, tournamentMongoId, {
        name,
        status,
        clubId: clubId === null || clubId === '' ? undefined : (clubId as string),
      });
    }

    const flagKeys = ['isArchived', 'isSandbox', 'isDeleted', 'verified'] as const;
    const hasFlags = flagKeys.some((k) => typeof patch[k] === 'boolean');
    if (hasFlags) {
      await AdminTournamentsMutationService.updateFlags(actor._id, tournamentMongoId, {
        isArchived: typeof patch.isArchived === 'boolean' ? patch.isArchived : undefined,
        isSandbox: typeof patch.isSandbox === 'boolean' ? patch.isSandbox : undefined,
        isDeleted: typeof patch.isDeleted === 'boolean' ? patch.isDeleted : undefined,
        verified: typeof patch.verified === 'boolean' ? patch.verified : undefined,
      });
    }

    revalidatePath(`/${locale}/admin/tournaments/${tournamentMongoId}`);
    revalidatePath(`/${locale}/admin/tournaments`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminUpdateTournamentFlagsAction(
  locale: string,
  tournamentMongoId: string,
  form: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireTournamentWrite();
    const patch = {
      isArchived: form.get('isArchived') === 'on',
      isSandbox: form.get('isSandbox') === 'on',
      isDeleted: form.get('isDeleted') === 'on',
      verified: form.get('verified') === 'on',
    };
    await AdminTournamentsMutationService.updateFlags(actor._id, tournamentMongoId, patch);
    revalidatePath(`/${locale}/admin/tournaments/${tournamentMongoId}`);
    revalidatePath(`/${locale}/admin/tournaments`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminRotateTournamentPasswordAction(
  locale: string,
  tournamentMongoId: string,
): Promise<{ ok: boolean; newPassword?: string; error?: string }> {
  try {
    const actor = await requireTournamentWrite();
    const { newPassword } = await AdminTournamentsMutationService.rotateHumanPassword(actor._id, tournamentMongoId);
    revalidatePath(`/${locale}/admin/tournaments/${tournamentMongoId}`);
    return { ok: true, newPassword };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
