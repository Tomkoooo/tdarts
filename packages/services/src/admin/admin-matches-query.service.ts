import mongoose from 'mongoose';
import { connectMongo, MatchModel, TournamentModel, UserModel } from '@tdarts/core';

export type AdminMatchListRow = {
  _id: string;
  tournamentRef: string;
  tournamentCode: string;
  status: string;
  type: string;
  round: number;
  manualOverride: boolean;
  updatedAt: string;
};

export type AdminMatchPreviousState = {
  player1LegsWon?: number;
  player2LegsWon?: number;
  winnerId?: string;
  status?: string;
};

export type AdminMatchPlayerSummary = {
  playerId: string;
  legsWon: number;
  legsLost: number;
  average: number;
};

export type AdminMatchDetail = {
  _id: string;
  tournamentRef: string;
  tournamentCode: string;
  tournamentName: string;
  boardReference: number;
  status: string;
  type: string;
  round: number;
  bracketPosition?: number;
  winnerId: string | null;
  player1: AdminMatchPlayerSummary | null;
  player2: AdminMatchPlayerSummary | null;
  legsCount: number;
  /** Full leg documents for inspector (can be large). */
  legs: unknown[] | null;
  manualOverride: boolean;
  overrideTimestamp: string | null;
  manualChangeType: string | null;
  manualChangedById: string | null;
  manualChangedByEmail: string | null;
  previousState: AdminMatchPreviousState | null;
  updatedAt: string;
};

function mapPlayerSummary(raw: unknown): AdminMatchPlayerSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const playerId = p.playerId ? String(p.playerId) : '';
  if (!playerId) return null;
  return {
    playerId,
    legsWon: Number(p.legsWon) || 0,
    legsLost: Number(p.legsLost) || 0,
    average: Number(p.average) || 0,
  };
}

function mapPreviousState(raw: unknown): AdminMatchPreviousState | null {
  if (!raw || typeof raw !== 'object') return null;
  const ps = raw as Record<string, unknown>;
  const hasData =
    ps.player1LegsWon !== undefined ||
    ps.player2LegsWon !== undefined ||
    ps.winnerId !== undefined ||
    ps.status !== undefined;
  if (!hasData) return null;
  return {
    player1LegsWon: ps.player1LegsWon !== undefined ? Number(ps.player1LegsWon) : undefined,
    player2LegsWon: ps.player2LegsWon !== undefined ? Number(ps.player2LegsWon) : undefined,
    winnerId: ps.winnerId ? String(ps.winnerId) : undefined,
    status: ps.status ? String(ps.status) : undefined,
  };
}

export class AdminMatchesQueryService {
  static async list(params: {
    q?: string;
    page: number;
    limit: number;
    manualOnly?: boolean;
    sort?: { key: string; dir: 'asc' | 'desc' };
  }): Promise<{ total: number; rows: AdminMatchListRow[] }> {
    await connectMongo();
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {};
    if (params.manualOnly) match.manualOverride = true;

    const q = params.q?.trim();
    if (q && mongoose.Types.ObjectId.isValid(q)) {
      match.tournamentRef = new mongoose.Types.ObjectId(q);
    }

    const MATCH_SORT_KEYS: Record<string, string> = {
      tournament: 'tournamentRef',
      type: 'type',
      round: 'round',
      status: 'status',
      updated: 'updatedAt',
    };
    const fallbackSort = { updatedAt: -1 } as Record<string, 1 | -1>;
    let sortSpec: Record<string, 1 | -1> = fallbackSort;
    const sk = params.sort?.key ? MATCH_SORT_KEYS[params.sort.key] : undefined;
    if (params.sort && sk) {
      sortSpec = { [sk]: params.sort.dir === 'asc' ? (1 as const) : (-1 as const) };
    }

    const [total, docs] = await Promise.all([
      MatchModel.countDocuments(match),
      MatchModel.find(match).select('tournamentRef status type round manualOverride updatedAt').sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const tids = [...new Set((docs as { tournamentRef?: mongoose.Types.ObjectId }[]).map((d) => String(d.tournamentRef)))];
    const tMap = new Map<string, string>();
    if (tids.length) {
      const oidList = tids.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
      const tours = await TournamentModel.find({ _id: { $in: oidList } })
        .select('tournamentId')
        .lean();
      for (const t of tours as { _id: mongoose.Types.ObjectId; tournamentId?: string }[]) {
        tMap.set(String(t._id), String(t.tournamentId ?? ''));
      }
    }

    const rows: AdminMatchListRow[] = (docs as Record<string, unknown>[]).map((d) => ({
      _id: String(d._id),
      tournamentRef: d.tournamentRef ? String(d.tournamentRef) : '',
      tournamentCode: tMap.get(String(d.tournamentRef)) ?? '',
      status: String(d.status ?? ''),
      type: String(d.type ?? ''),
      round: Number(d.round) || 0,
      manualOverride: Boolean(d.manualOverride),
      updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : new Date().toISOString(),
    }));

    return { total, rows };
  }

  static async getById(matchId: string): Promise<AdminMatchDetail | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(matchId)) return null;
    const doc = await MatchModel.findById(matchId).lean();
    if (!doc) return null;
    const o = doc as Record<string, unknown>;

    let tournamentCode = '';
    let tournamentName = '';
    const tournamentRef = o.tournamentRef ? String(o.tournamentRef) : '';
    if (tournamentRef && mongoose.Types.ObjectId.isValid(tournamentRef)) {
      const tour = await TournamentModel.findById(tournamentRef)
        .select('tournamentId tournamentSettings.name')
        .lean();
      if (tour) {
        const tr = tour as Record<string, unknown>;
        tournamentCode = String(tr.tournamentId ?? '');
        const settings = tr.tournamentSettings as Record<string, unknown> | undefined;
        tournamentName = String(settings?.name ?? tournamentCode);
      }
    }

    let manualChangedByEmail: string | null = null;
    const manualChangedById = o.manualChangedBy ? String(o.manualChangedBy) : null;
    if (manualChangedById && mongoose.Types.ObjectId.isValid(manualChangedById)) {
      const user = await UserModel.findById(manualChangedById).select('email').lean();
      if (user) manualChangedByEmail = String((user as { email?: string }).email ?? manualChangedById);
    }

    const legs = o.legs as unknown[] | undefined;

    return {
      _id: String(o._id),
      tournamentRef,
      tournamentCode,
      tournamentName,
      boardReference: Number(o.boardReference) || 0,
      status: String(o.status ?? ''),
      type: String(o.type ?? ''),
      round: Number(o.round) || 0,
      bracketPosition: o.bracketPosition !== undefined ? Number(o.bracketPosition) : undefined,
      winnerId: o.winnerId ? String(o.winnerId) : null,
      player1: mapPlayerSummary(o.player1),
      player2: mapPlayerSummary(o.player2),
      legsCount: Array.isArray(legs) ? legs.length : 0,
      legs: Array.isArray(legs) ? legs : null,
      manualOverride: Boolean(o.manualOverride),
      overrideTimestamp:
        o.overrideTimestamp instanceof Date
          ? o.overrideTimestamp.toISOString()
          : o.overrideTimestamp
            ? String(o.overrideTimestamp)
            : null,
      manualChangeType: o.manualChangeType ? String(o.manualChangeType) : null,
      manualChangedById,
      manualChangedByEmail,
      previousState: mapPreviousState(o.previousState),
      updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}
