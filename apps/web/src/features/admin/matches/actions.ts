'use server';

import { connectMongo, PlayerModel } from '@tdarts/core';
import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminMatchesMutationService,
  AdminMatchesQueryService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';
import type {
  AdminMatchDetail,
  AdminMatchListRow,
  AdminMatchTournamentBucket,
} from '@tdarts/services';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';
import { toListSort, type AdminListParams } from '@/features/admin/lib/list-params';

export type AdminMatchesListParams = AdminListParams & {
  manualOnly?: boolean;
  status?: string;
  type?: string;
  round?: string;
  board?: string;
};

function parseMatchFilters(params: AdminMatchesListParams) {
  const roundNum = params.round ? parseInt(params.round, 10) : undefined;
  const boardNum = params.board ? parseInt(params.board, 10) : undefined;
  return {
    q: params.q,
    manualOnly: params.manualOnly,
    status: params.status,
    type: params.type,
    round: Number.isFinite(roundNum) ? roundNum : undefined,
    boardReference: Number.isFinite(boardNum) ? boardNum : undefined,
  };
}

export async function adminListMatchTournamentBucketsAction(
  params: AdminMatchesListParams,
): Promise<
  | { ok: true; total: number; rows: AdminMatchTournamentBucket[] }
  | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_MATCHES_READ);
    const { total, rows } = await AdminMatchesQueryService.listTournamentBuckets({
      ...parseMatchFilters(params),
      page: params.page,
      limit: params.limit,
    });
    return { ok: true, total, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load tournaments' };
  }
}

export async function adminListMatchesForTournamentAction(
  tournamentRef: string,
  params: {
    q?: string;
    manualOnly?: boolean;
    status?: string;
    type?: string;
    round?: number;
    boardReference?: number;
    page: number;
    limit: number;
  },
): Promise<
  { ok: true; total: number; rows: AdminMatchListRow[] } | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_MATCHES_READ);
    const { total, rows } = await AdminMatchesQueryService.listForTournament(tournamentRef, params);
    return { ok: true, total, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load matches' };
  }
}

export async function adminListMatchesAction(
  params: AdminMatchesListParams,
): Promise<
  { ok: true; total: number; rows: AdminMatchListRow[] } | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_MATCHES_READ);
    const { total, rows } = await AdminMatchesQueryService.list({
      ...parseMatchFilters(params),
      page: params.page,
      limit: params.limit,
      sort: toListSort(params),
    });
    return { ok: true, total, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load matches' };
  }
}

export async function adminGetMatchDetailAction(
  matchId: string,
): Promise<{ ok: true; match: AdminMatchDetailView } | { ok: false; error: string }> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_MATCHES_READ);
    const match = await AdminMatchesQueryService.getById(matchId);
    if (!match) return { ok: false, error: 'Match not found' };
    await connectMongo();
    const enrich = async (summary: typeof match.player1) => {
      if (!summary) return null;
      const doc = await PlayerModel.findById(summary.playerId).select('name').lean();
      const name = doc ? String((doc as { name?: string }).name ?? '') : '';
      return { ...summary, playerName: name || undefined };
    };
    const [player1, player2] = await Promise.all([enrich(match.player1), enrich(match.player2)]);
    return {
      ok: true,
      match: {
        ...match,
        player1,
        player2,
        winnerLabel:
          match.winnerId === player1?.playerId
            ? player1?.playerName ?? 'Player 1'
            : match.winnerId === player2?.playerId
              ? player2?.playerName ?? 'Player 2'
              : null,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load match' };
  }
}

export type AdminMatchDetailView = AdminMatchDetail & {
  player1: (AdminMatchDetail['player1'] & { playerName?: string }) | null;
  player2: (AdminMatchDetail['player2'] & { playerName?: string }) | null;
  winnerLabel: string | null;
};

async function requireMatchWrite() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_WRITE);
  if (!ok) throw new Error('Forbidden');
  return user;
}

export async function adminSwapMatchPlayerAction(
  locale: string,
  matchId: string,
  slot: 'player1' | 'player2',
  newPlayerId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireMatchWrite();
    await AdminMatchesMutationService.swapPlayer(actor._id, matchId, slot, newPlayerId);
    revalidatePath(`/${locale}/admin/matches/${matchId}`);
    revalidatePath(`/${locale}/admin/matches`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminUpdateMatchAction(
  locale: string,
  matchId: string,
  patch: {
    status?: 'pending' | 'ongoing' | 'finished';
    type?: 'group' | 'knockout';
    round?: number;
    boardReference?: number;
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireMatchWrite();
    await AdminMatchesMutationService.updateAdminFields(actor._id, matchId, patch);
    revalidatePath(`/${locale}/admin/matches/${matchId}`);
    revalidatePath(`/${locale}/admin/matches`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminRevertMatchOverrideAction(
  locale: string,
  matchId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireMatchWrite();
    await AdminMatchesMutationService.revertManualOverride(actor._id, matchId);
    revalidatePath(`/${locale}/admin/matches/${matchId}`);
    revalidatePath(`/${locale}/admin/matches`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
