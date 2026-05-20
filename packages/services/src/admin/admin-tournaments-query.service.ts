import mongoose from 'mongoose';
import { connectMongo, TournamentModel, MatchModel, PlayerModel, ClubModel } from '@tdarts/core';

export type AdminTournamentRelationsFilters = {
  playerStatus?: string;
  playerQ?: string;
  matchStatus?: string;
  matchType?: string;
  matchRound?: string;
  matchBoard?: string;
};

export type AdminTournamentRelationPlayer = {
  playerId: string;
  name: string;
  status?: string;
};

export type AdminTournamentRelationMatch = {
  matchId: string;
  status: string;
  type: string;
  round: number;
  boardReference: number;
  player1Name: string;
  player2Name: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminTournamentListRow = {
  _id: string;
  tournamentId: string;
  name: string;
  status: string;
  startDate: string | null;
  format: string;
  clubId: string;
  clubName: string;
  playersCount: number;
  boardsCount: number;
  entryFee: number;
  entryFeeCurrency: string;
  updatedAt: string;
};

const TOURNAMENT_SORT: Record<string, string> = {
  code: 'tournamentId',
  name: 'name',
  status: 'status',
  club: 'clubName',
  players: 'playersCount',
  updated: 'updatedAt',
};

function resolveTournamentAggSort(sort?: { key: string; dir: 'asc' | 'desc' }): Record<string, 1 | -1> {
  if (!sort || !TOURNAMENT_SORT[sort.key]) return { updatedAt: -1 };
  const d = sort.dir === 'asc' ? 1 : -1;
  return { [TOURNAMENT_SORT[sort.key]]: d };
}

export class AdminTournamentsQueryService {
  static async list(params: {
    q?: string;
    clubId?: string;
    status?: string;
    page: number;
    limit: number;
    sort?: { key: string; dir: 'asc' | 'desc' };
  }): Promise<{ total: number; rows: AdminTournamentListRow[] }> {
    await connectMongo();
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {
      isDeleted: { $ne: true },
      isArchived: { $ne: true },
      isSandbox: { $ne: true },
    };
    if (params.clubId && mongoose.Types.ObjectId.isValid(params.clubId)) {
      match.clubId = new mongoose.Types.ObjectId(params.clubId);
    }
    if (params.status && params.status !== 'all') {
      match['tournamentSettings.status'] = params.status;
    }
    const q = params.q?.trim();
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(esc, 'i');
      match.$or = [{ tournamentId: rx }, { 'tournamentSettings.name': rx }];
    }

    const pipeline: mongoose.PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: 'clubs',
          localField: 'clubId',
          foreignField: '_id',
          as: 'club',
        },
      },
      { $unwind: { path: '$club', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          playersCount: { $size: { $ifNull: ['$tournamentPlayers', []] } },
          boardsCount: { $size: { $ifNull: ['$boards', []] } },
        },
      },
      {
        $project: {
          tournamentId: 1,
          name: '$tournamentSettings.name',
          status: '$tournamentSettings.status',
          startDate: '$tournamentSettings.startDate',
          format: '$tournamentSettings.format',
          clubId: 1,
          clubName: '$club.name',
          playersCount: 1,
          boardsCount: 1,
          entryFee: '$tournamentSettings.entryFee',
          entryFeeCurrency: '$tournamentSettings.entryFeeCurrency',
          updatedAt: 1,
        },
      },
      { $sort: resolveTournamentAggSort(params.sort) },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'c' }],
        },
      },
    ];

    const agg = await TournamentModel.aggregate(pipeline);
    const facet = agg[0] as {
      rows: Record<string, unknown>[];
      total: { c: number }[];
    };
    const total = facet?.total?.[0]?.c ?? 0;
    const rows: AdminTournamentListRow[] = (facet?.rows ?? []).map((doc) => ({
      _id: String(doc._id),
      tournamentId: String(doc.tournamentId ?? ''),
      name: String(doc.name ?? ''),
      status: String(doc.status ?? ''),
      startDate: doc.startDate instanceof Date ? doc.startDate.toISOString() : null,
      format: String(doc.format ?? ''),
      clubId: doc.clubId ? String(doc.clubId) : '',
      clubName: String(doc.clubName ?? ''),
      playersCount: Number(doc.playersCount) || 0,
      boardsCount: Number(doc.boardsCount) || 0,
      entryFee: Number(doc.entryFee) || 0,
      entryFeeCurrency: String(doc.entryFeeCurrency ?? 'HUF'),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString(),
    }));

    return { total, rows };
  }

  /** Resolve by Mongo _id or public `tournamentId` code. */
  static async findOneForAdmin(idOrCode: string): Promise<Record<string, unknown> | null> {
    await connectMongo();
    let doc: Record<string, unknown> | null = null;
    if (mongoose.Types.ObjectId.isValid(idOrCode)) {
      doc = (await TournamentModel.findById(idOrCode).lean()) as Record<string, unknown> | null;
    }
    if (!doc) {
      doc = (await TournamentModel.findOne({ tournamentId: idOrCode }).lean()) as Record<string, unknown> | null;
    }
    if (!doc) return null;

    let clubName = '';
    if (doc.clubId && mongoose.Types.ObjectId.isValid(String(doc.clubId))) {
      const club = await ClubModel.findById(doc.clubId).select('name').lean();
      if (club) clubName = String((club as { name?: string }).name ?? '');
    }

    const boards = Array.isArray(doc.boards)
      ? (doc.boards as Record<string, unknown>[]).map((b) => ({
          boardNumber: b.boardNumber,
          name: b.name,
          status: b.status,
          isActive: b.isActive,
          scoliaSerialNumber: b.scoliaSerialNumber,
          hasScoliaToken: Boolean(b.scoliaAccessToken),
        }))
      : [];

    return {
      _id: String(doc._id),
      tournamentId: doc.tournamentId,
      clubId: doc.clubId ? String(doc.clubId) : '',
      clubName,
      tournamentSettings: doc.tournamentSettings,
      boards,
      playersCount: Array.isArray(doc.tournamentPlayers) ? doc.tournamentPlayers.length : 0,
      waitingListCount: Array.isArray(doc.waitingList) ? doc.waitingList.length : 0,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      isActive: doc.isActive,
      isDeleted: doc.isDeleted,
      isArchived: doc.isArchived,
      isSandbox: doc.isSandbox,
      verified: doc.verified,
    };
  }

  static async getStats(filters?: {
    status?: string;
    clubId?: string;
  }): Promise<{
    total: number;
    byStatus: Record<string, number>;
    sandbox: number;
    archived: number;
    avgPlayers: number;
  }> {
    await connectMongo();
    const base: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (filters?.clubId && mongoose.Types.ObjectId.isValid(filters.clubId)) {
      base.clubId = new mongoose.Types.ObjectId(filters.clubId);
    }
    if (filters?.status && filters.status !== 'all') {
      base['tournamentSettings.status'] = filters.status;
    }
    const [total, statusAgg, sandbox, archived, avgAgg] = await Promise.all([
      TournamentModel.countDocuments({ ...base, isArchived: { $ne: true }, isSandbox: { $ne: true } }),
      TournamentModel.aggregate([
        { $match: { ...base, isArchived: { $ne: true }, isSandbox: { $ne: true } } },
        { $group: { _id: '$tournamentSettings.status', count: { $sum: 1 } } },
      ]),
      TournamentModel.countDocuments({ ...base, isSandbox: true }),
      TournamentModel.countDocuments({ ...base, isArchived: true }),
      TournamentModel.aggregate([
        { $match: { ...base, isArchived: { $ne: true }, isSandbox: { $ne: true } } },
        {
          $project: {
            pc: { $size: { $ifNull: ['$tournamentPlayers', []] } },
          },
        },
        { $group: { _id: null, avg: { $avg: '$pc' } } },
      ]),
    ]);
    const byStatus: Record<string, number> = {};
    for (const row of statusAgg as { _id?: string; count?: number }[]) {
      if (row._id) byStatus[String(row._id)] = Number(row.count) || 0;
    }
    const avgRow = avgAgg[0] as { avg?: number } | undefined;
    return {
      total,
      byStatus,
      sandbox,
      archived,
      avgPlayers: Math.round((avgRow?.avg ?? 0) * 10) / 10,
    };
  }

  static async getRelations(
    tournamentId: string,
    filters?: AdminTournamentRelationsFilters,
  ): Promise<{
    players: AdminTournamentRelationPlayer[];
    matches: AdminTournamentRelationMatch[];
    totalPlayers: number;
    totalMatches: number;
  }> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
      return { players: [], matches: [], totalPlayers: 0, totalMatches: 0 };
    }
    const tour = await TournamentModel.findById(tournamentId).select('tournamentPlayers').lean();
    const playerRefs =
      (tour as { tournamentPlayers?: { playerReference?: unknown; status?: string }[] } | null)
        ?.tournamentPlayers ?? [];

    const playerOidList = playerRefs
      .map((p) => p.playerReference)
      .filter((id) => id != null && mongoose.Types.ObjectId.isValid(String(id)))
      .map((id) => new mongoose.Types.ObjectId(String(id)));

    const playerNameMap = new Map<string, string>();
    if (playerOidList.length) {
      const docs = await PlayerModel.find({ _id: { $in: playerOidList } })
        .select('name')
        .lean();
      for (const doc of docs as { _id: mongoose.Types.ObjectId; name?: string }[]) {
        playerNameMap.set(String(doc._id), String(doc.name ?? '').trim() || '—');
      }
    }

    let players: AdminTournamentRelationPlayer[] = [];
    for (const p of playerRefs) {
      const ref = p.playerReference ? String(p.playerReference) : '';
      if (!ref) continue;
      players.push({
        playerId: ref,
        name: playerNameMap.get(ref) ?? ref.slice(-8),
        status: p.status ? String(p.status) : undefined,
      });
    }

    const totalPlayers = players.length;
    if (filters?.playerStatus && filters.playerStatus !== 'all') {
      players = players.filter((p) => p.status === filters.playerStatus);
    }
    const pq = filters?.playerQ?.trim().toLowerCase();
    if (pq) {
      players = players.filter(
        (p) => p.name.toLowerCase().includes(pq) || p.playerId.toLowerCase().includes(pq),
      );
    }

    const matchQuery: Record<string, unknown> = {
      tournamentRef: new mongoose.Types.ObjectId(tournamentId),
    };
    if (filters?.matchStatus && filters.matchStatus !== 'all') {
      matchQuery.status = filters.matchStatus;
    }
    if (filters?.matchType && filters.matchType !== 'all') {
      matchQuery.type = filters.matchType;
    }
    const roundNum = filters?.matchRound ? parseInt(filters.matchRound, 10) : NaN;
    if (Number.isFinite(roundNum)) matchQuery.round = roundNum;
    const boardNum = filters?.matchBoard ? parseInt(filters.matchBoard, 10) : NaN;
    if (Number.isFinite(boardNum)) matchQuery.boardReference = boardNum;

    const [totalMatches, matches] = await Promise.all([
      MatchModel.countDocuments(matchQuery),
      MatchModel.find(matchQuery)
        .select('status type round boardReference player1 player2 createdAt updatedAt')
        .sort({ round: 1, boardReference: 1, updatedAt: -1 })
        .limit(500)
        .lean(),
    ]);
    const pids = new Set<string>();
    for (const m of matches as Record<string, unknown>[]) {
      const p1 = m.player1 as { playerId?: unknown } | null;
      const p2 = m.player2 as { playerId?: unknown } | null;
      if (p1?.playerId) pids.add(String(p1.playerId));
      if (p2?.playerId) pids.add(String(p2.playerId));
    }
    const pMap = new Map<string, string>();
    if (pids.size) {
      const docs = await PlayerModel.find({
        _id: { $in: [...pids].map((id) => new mongoose.Types.ObjectId(id)) },
      })
        .select('name')
        .lean();
      for (const p of docs as { _id: mongoose.Types.ObjectId; name?: string }[]) {
        pMap.set(String(p._id), String(p.name ?? ''));
      }
    }
    const matchRows = (matches as Record<string, unknown>[]).map((m) => {
      const p1 = m.player1 as { playerId?: unknown } | null;
      const p2 = m.player2 as { playerId?: unknown } | null;
      const p1id = p1?.playerId ? String(p1.playerId) : '';
      const p2id = p2?.playerId ? String(p2.playerId) : '';
      const createdAt = m.createdAt instanceof Date ? m.createdAt : null;
      const updatedAt = m.updatedAt instanceof Date ? m.updatedAt : null;
      return {
        matchId: String(m._id),
        status: String(m.status ?? ''),
        type: String(m.type ?? ''),
        round: Number(m.round) || 0,
        boardReference: Number(m.boardReference) || 0,
        player1Name: p1id ? pMap.get(p1id) ?? '—' : '—',
        player2Name: p2id ? pMap.get(p2id) ?? '—' : '—',
        createdAt: createdAt ? createdAt.toISOString() : new Date().toISOString(),
        updatedAt: updatedAt ? updatedAt.toISOString() : new Date().toISOString(),
      };
    });
    return { players, matches: matchRows, totalPlayers, totalMatches };
  }
}
