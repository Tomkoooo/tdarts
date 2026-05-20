import mongoose from 'mongoose';
import { connectMongo, MatchModel, TournamentModel, UserModel, PlayerModel } from '@tdarts/core';

export type AdminMatchTournamentBucket = {
  tournamentRef: string;
  tournamentCode: string;
  tournamentName: string;
  matchCount: number;
  lastUpdated: string;
};

export type AdminMatchListRow = {
  _id: string;
  tournamentRef: string;
  tournamentCode: string;
  tournamentName: string;
  player1Name: string;
  player2Name: string;
  status: string;
  type: string;
  round: number;
  manualOverride: boolean;
  createdAt: string;
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

type MatchListFilters = {
  q?: string;
  manualOnly?: boolean;
  status?: string;
  type?: string;
  round?: number;
  boardReference?: number;
  tournamentRef?: string;
};

async function buildMatchFilter(filters: MatchListFilters): Promise<Record<string, unknown>> {
  await connectMongo();
  const match: Record<string, unknown> = {};
  if (filters.manualOnly) match.manualOverride = true;
  if (filters.status && filters.status !== 'all') match.status = filters.status;
  if (filters.type && filters.type !== 'all') match.type = filters.type;
  if (filters.round != null && Number.isFinite(filters.round)) match.round = filters.round;
  if (filters.boardReference != null && Number.isFinite(filters.boardReference)) {
    match.boardReference = filters.boardReference;
  }
  if (filters.tournamentRef && mongoose.Types.ObjectId.isValid(filters.tournamentRef)) {
    match.tournamentRef = new mongoose.Types.ObjectId(filters.tournamentRef);
  }

  const q = filters.q?.trim();
  if (q) {
    const or: Record<string, unknown>[] = [];
    if (mongoose.Types.ObjectId.isValid(q)) {
      or.push({ _id: new mongoose.Types.ObjectId(q) });
      or.push({ tournamentRef: new mongoose.Types.ObjectId(q) });
    }
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(esc, 'i');
    const [tours, players] = await Promise.all([
      TournamentModel.find({
        $or: [{ tournamentId: rx }, { 'tournamentSettings.name': rx }],
      })
        .select('_id')
        .limit(50)
        .lean(),
      PlayerModel.find({ name: rx }).select('_id').limit(50).lean(),
    ]);
    const tourIds = (tours as { _id: mongoose.Types.ObjectId }[]).map((t) => t._id);
    const playerIds = (players as { _id: mongoose.Types.ObjectId }[]).map((p) => p._id);
    if (tourIds.length) or.push({ tournamentRef: { $in: tourIds } });
    if (playerIds.length) {
      or.push({ 'player1.playerId': { $in: playerIds } });
      or.push({ 'player2.playerId': { $in: playerIds } });
    }
    if (or.length) match.$or = or;
  }
  return match;
}

async function enrichMatchRows(docs: Record<string, unknown>[]): Promise<AdminMatchListRow[]> {
  const tids = [...new Set(docs.map((d) => String(d.tournamentRef)))];
  const tMap = new Map<string, { code: string; name: string }>();
  if (tids.length) {
    const oidList = tids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const tours = await TournamentModel.find({ _id: { $in: oidList } })
      .select('tournamentId tournamentSettings.name')
      .lean();
    for (const t of tours as {
      _id: mongoose.Types.ObjectId;
      tournamentId?: string;
      tournamentSettings?: { name?: string };
    }[]) {
      tMap.set(String(t._id), {
        code: String(t.tournamentId ?? ''),
        name: String(t.tournamentSettings?.name ?? t.tournamentId ?? ''),
      });
    }
  }

  const playerIds = new Set<string>();
  for (const d of docs) {
    const p1 = d.player1 as { playerId?: unknown } | null;
    const p2 = d.player2 as { playerId?: unknown } | null;
    if (p1?.playerId) playerIds.add(String(p1.playerId));
    if (p2?.playerId) playerIds.add(String(p2.playerId));
  }
  const pMap = new Map<string, string>();
  if (playerIds.size) {
    const pDocs = await PlayerModel.find({
      _id: {
        $in: [...playerIds]
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id)),
      },
    })
      .select('name')
      .lean();
    for (const p of pDocs as { _id: mongoose.Types.ObjectId; name?: string }[]) {
      pMap.set(String(p._id), String(p.name ?? ''));
    }
  }

  return docs.map((d) => {
    const tour = tMap.get(String(d.tournamentRef));
    const p1 = d.player1 as { playerId?: unknown } | null;
    const p2 = d.player2 as { playerId?: unknown } | null;
    const p1id = p1?.playerId ? String(p1.playerId) : '';
    const p2id = p2?.playerId ? String(p2.playerId) : '';
    return {
      _id: String(d._id),
      tournamentRef: d.tournamentRef ? String(d.tournamentRef) : '',
      tournamentCode: tour?.code ?? '',
      tournamentName: tour?.name ?? '',
      player1Name: p1id ? pMap.get(p1id) ?? p1id.slice(0, 8) : '—',
      player2Name: p2id ? pMap.get(p2id) ?? p2id.slice(0, 8) : '—',
      status: String(d.status ?? ''),
      type: String(d.type ?? ''),
      round: Number(d.round) || 0,
      manualOverride: Boolean(d.manualOverride),
      createdAt:
        d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : new Date().toISOString(),
    };
  });
}

export class AdminMatchesQueryService {
  static async listTournamentBuckets(params: {
    q?: string;
    page: number;
    limit: number;
    manualOnly?: boolean;
    status?: string;
    type?: string;
    round?: number;
    boardReference?: number;
  }): Promise<{ total: number; rows: AdminMatchTournamentBucket[] }> {
    await connectMongo();
    const limit = Math.min(Math.max(params.limit, 1), 50);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;
    const match = await buildMatchFilter(params);

    const agg = await MatchModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$tournamentRef',
          matchCount: { $sum: 1 },
          lastUpdated: { $max: '$updatedAt' },
        },
      },
      { $sort: { lastUpdated: -1 } },
      {
        $facet: {
          meta: [{ $count: 'total' }],
          rows: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ]);

    const facet = agg[0] as {
      meta: { total: number }[];
      rows: { _id: mongoose.Types.ObjectId; matchCount: number; lastUpdated: Date }[];
    };
    const total = facet.meta[0]?.total ?? 0;
    const bucketRows = facet.rows ?? [];
    const tourIds = bucketRows.map((r) => r._id).filter(Boolean);
    const tMap = new Map<string, { code: string; name: string }>();
    if (tourIds.length) {
      const tours = await TournamentModel.find({ _id: { $in: tourIds } })
        .select('tournamentId tournamentSettings.name')
        .lean();
      for (const t of tours as {
        _id: mongoose.Types.ObjectId;
        tournamentId?: string;
        tournamentSettings?: { name?: string };
      }[]) {
        tMap.set(String(t._id), {
          code: String(t.tournamentId ?? ''),
          name: String(t.tournamentSettings?.name ?? t.tournamentId ?? ''),
        });
      }
    }

    const rows: AdminMatchTournamentBucket[] = bucketRows.map((r) => {
      const ref = String(r._id);
      const tour = tMap.get(ref);
      return {
        tournamentRef: ref,
        tournamentCode: tour?.code ?? ref.slice(-6),
        tournamentName: tour?.name ?? tour?.code ?? ref.slice(-6),
        matchCount: r.matchCount,
        lastUpdated:
          r.lastUpdated instanceof Date ? r.lastUpdated.toISOString() : new Date().toISOString(),
      };
    });

    return { total, rows };
  }

  static async listForTournament(
    tournamentRef: string,
    params: Omit<MatchListFilters, 'tournamentRef'> & { page: number; limit: number },
  ): Promise<{ total: number; rows: AdminMatchListRow[] }> {
    await connectMongo();
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;
    const match = await buildMatchFilter({ ...params, tournamentRef });

    const [total, docs] = await Promise.all([
      MatchModel.countDocuments(match),
      MatchModel.find(match)
        .select(
          'tournamentRef status type round manualOverride createdAt updatedAt player1 player2 boardReference',
        )
        .sort({ round: 1, boardReference: 1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const rows = await enrichMatchRows(docs as Record<string, unknown>[]);
    return { total, rows };
  }

  static async list(params: {
    q?: string;
    page: number;
    limit: number;
    manualOnly?: boolean;
    status?: string;
    type?: string;
    round?: number;
    boardReference?: number;
    sort?: { key: string; dir: 'asc' | 'desc' };
  }): Promise<{ total: number; rows: AdminMatchListRow[] }> {
    await connectMongo();
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;

    const match = await buildMatchFilter(params);

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
      MatchModel.find(match)
        .select(
          'tournamentRef status type round manualOverride createdAt updatedAt player1 player2 boardReference',
        )
        .sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const rows = await enrichMatchRows(docs as Record<string, unknown>[]);
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
