import mongoose from 'mongoose';
import { connectMongo, LeagueModel } from '@tdarts/core';

export type AdminLeagueListRow = {
  _id: string;
  name: string;
  clubId: string;
  clubName: string;
  isActive: boolean;
  verified: boolean;
  playersCount: number;
  tournamentsAttached: number;
  updatedAt: string;
};

export type AdminLeaguePointsConfig = {
  groupDropoutPoints: number;
  knockoutBasePoints: number;
  knockoutMultiplier: number;
  winnerBonus: number;
  maxKnockoutRounds: number;
  useFixedRanks: boolean;
  fixedRankPoints?: Record<string, number>;
};

export type AdminLeagueTournamentPoints = {
  tournamentId: string;
  tournamentCode: string;
  tournamentName: string;
  points: number;
  position: number;
  eliminatedIn: string;
};

export type AdminLeagueManualAdjustment = {
  points: number;
  reason: string;
  adjustedById: string;
  adjustedByEmail: string;
  adjustedAt: string;
};

export type AdminLeaguePlayerRow = {
  playerId: string;
  playerName: string;
  totalPoints: number;
  tournamentPoints: AdminLeagueTournamentPoints[];
  manualAdjustments: AdminLeagueManualAdjustment[];
};

export type AdminLeagueRemovedPlayerRow = AdminLeaguePlayerRow & {
  reason: string;
  removedById: string;
  removedByEmail: string;
  removedAt: string;
};

export type AdminLeagueAttachedTournament = {
  mongoId: string;
  tournamentCode: string;
  name: string;
  status: string;
};

export type AdminLeagueDetail = {
  _id: string;
  name: string;
  description: string;
  clubId: string;
  clubName: string;
  createdById: string;
  createdByEmail: string;
  pointSystemType: string;
  isActive: boolean;
  verified: boolean;
  startDate: string | null;
  endDate: string | null;
  pointsConfig: AdminLeaguePointsConfig;
  attachedTournaments: AdminLeagueAttachedTournament[];
  players: AdminLeaguePlayerRow[];
  removedPlayers: AdminLeagueRemovedPlayerRow[];
  createdAt: string;
  updatedAt: string;
};

function refId(ref: unknown): string {
  if (!ref) return '';
  if (typeof ref === 'object' && ref !== null && '_id' in ref) return String((ref as { _id: unknown })._id);
  return String(ref);
}

function mapFixedRankPoints(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, number> = {};
  if (raw instanceof Map) {
    for (const [k, v] of raw.entries()) out[String(k)] = Number(v);
    return Object.keys(out).length ? out : undefined;
  }
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number') out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function mapPointsConfig(raw: Record<string, unknown>): AdminLeaguePointsConfig {
  return {
    groupDropoutPoints: Number(raw.groupDropoutPoints) || 0,
    knockoutBasePoints: Number(raw.knockoutBasePoints) || 0,
    knockoutMultiplier: Number(raw.knockoutMultiplier) || 0,
    winnerBonus: Number(raw.winnerBonus) || 0,
    maxKnockoutRounds: Number(raw.maxKnockoutRounds) || 0,
    useFixedRanks: Boolean(raw.useFixedRanks),
    fixedRankPoints: mapFixedRankPoints(raw.fixedRankPoints),
  };
}

function mapTournamentPoints(
  items: unknown[],
  tournamentMap: Map<string, { code: string; name: string }>,
): AdminLeagueTournamentPoints[] {
  return (items ?? []).map((tp) => {
    const row = tp as Record<string, unknown>;
    const tid = refId(row.tournament);
    const meta = tournamentMap.get(tid);
    return {
      tournamentId: tid,
      tournamentCode: meta?.code ?? '',
      tournamentName: meta?.name ?? '',
      points: Number(row.points) || 0,
      position: Number(row.position) || 0,
      eliminatedIn: String(row.eliminatedIn ?? ''),
    };
  });
}

function mapManualAdjustments(items: unknown[], userMap: Map<string, string>): AdminLeagueManualAdjustment[] {
  return (items ?? []).map((adj) => {
    const row = adj as Record<string, unknown>;
    const adjustedById = refId(row.adjustedBy);
    return {
      points: Number(row.points) || 0,
      reason: String(row.reason ?? ''),
      adjustedById,
      adjustedByEmail: userMap.get(adjustedById) ?? adjustedById,
      adjustedAt:
        row.adjustedAt instanceof Date
          ? row.adjustedAt.toISOString()
          : row.adjustedAt
            ? String(row.adjustedAt)
            : '',
    };
  });
}

function resolveLeagueSort(sort?: { key: string; dir: 'asc' | 'desc' }): Record<string, 1 | -1> {
  const m: Record<string, string> = {
    name: 'name',
    club: 'clubName',
    players: 'playersCount',
    tournaments: 'tournamentsAttached',
    updated: 'updatedAt',
  };
  if (!sort || !m[sort.key]) return { updatedAt: -1 };
  const d = sort.dir === 'asc' ? 1 : -1;
  return { [m[sort.key]]: d };
}

export class AdminLeaguesQueryService {
  static async list(params: {
    q?: string;
    page: number;
    limit: number;
    sort?: { key: string; dir: 'asc' | 'desc' };
  }): Promise<{ total: number; rows: AdminLeagueListRow[] }> {
    await connectMongo();
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {};
    const q = params.q?.trim();
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.name = new RegExp(esc, 'i');
    }

    const pipeline: mongoose.PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: 'clubs',
          localField: 'club',
          foreignField: '_id',
          as: 'clubDoc',
        },
      },
      { $unwind: { path: '$clubDoc', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          playersCount: { $size: { $ifNull: ['$players', []] } },
          tournamentsAttached: { $size: { $ifNull: ['$attachedTournaments', []] } },
        },
      },
      {
        $project: {
          name: 1,
          club: 1,
          clubName: '$clubDoc.name',
          isActive: 1,
          verified: 1,
          playersCount: 1,
          tournamentsAttached: 1,
          updatedAt: 1,
        },
      },
      { $sort: resolveLeagueSort(params.sort) },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'c' }],
        },
      },
    ];

    const agg = await LeagueModel.aggregate(pipeline);
    const facet = agg[0] as { rows: Record<string, unknown>[]; total: { c: number }[] };
    const total = facet?.total?.[0]?.c ?? 0;
    const rows: AdminLeagueListRow[] = (facet?.rows ?? []).map((doc) => ({
      _id: String(doc._id),
      name: String(doc.name ?? ''),
      clubId: doc.club ? String(doc.club) : '',
      clubName: String(doc.clubName ?? ''),
      isActive: Boolean(doc.isActive),
      verified: Boolean(doc.verified),
      playersCount: Number(doc.playersCount) || 0,
      tournamentsAttached: Number(doc.tournamentsAttached) || 0,
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString(),
    }));

    return { total, rows };
  }

  static async getById(leagueId: string): Promise<AdminLeagueDetail | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(leagueId)) return null;

    const doc = await LeagueModel.findById(leagueId)
      .populate('club', 'name')
      .populate('createdBy', 'email')
      .populate('attachedTournaments', 'tournamentId tournamentSettings.name tournamentSettings.status')
      .populate('players.player', 'name')
      .populate('players.tournamentPoints.tournament', 'tournamentId tournamentSettings.name')
      .populate('players.manualAdjustments.adjustedBy', 'email')
      .populate('removedPlayers.player', 'name')
      .populate('removedPlayers.tournamentPoints.tournament', 'tournamentId tournamentSettings.name')
      .populate('removedPlayers.manualAdjustments.adjustedBy', 'email')
      .populate('removedPlayers.removedBy', 'email')
      .lean();

    if (!doc) return null;
    const o = doc as Record<string, unknown>;

    const club = o.club as { _id?: mongoose.Types.ObjectId; name?: string } | string | null;
    const createdBy = o.createdBy as { _id?: mongoose.Types.ObjectId; email?: string } | string | null;

    const tournamentMap = new Map<string, { code: string; name: string }>();
    const attachedTournaments: AdminLeagueAttachedTournament[] = [];
    for (const t of (o.attachedTournaments as unknown[]) ?? []) {
      if (!t || typeof t !== 'object') continue;
      const tr = t as Record<string, unknown>;
      const mongoId = String(tr._id ?? '');
      const settings = tr.tournamentSettings as Record<string, unknown> | undefined;
      const code = String(tr.tournamentId ?? '');
      const name = String(settings?.name ?? code);
      const status = String(settings?.status ?? '');
      tournamentMap.set(mongoId, { code, name });
      attachedTournaments.push({ mongoId, tournamentCode: code, name, status });
    }

    const userMap = new Map<string, string>();
    const collectUser = (u: unknown) => {
      if (!u || typeof u !== 'object') return;
      const row = u as { _id?: mongoose.Types.ObjectId; email?: string };
      if (row._id) userMap.set(String(row._id), String(row.email ?? row._id));
    };
    collectUser(createdBy);

    const mapPlayerRow = (p: unknown, extra?: Partial<AdminLeagueRemovedPlayerRow>): AdminLeaguePlayerRow | AdminLeagueRemovedPlayerRow => {
      const row = p as Record<string, unknown>;
      const player = row.player as { _id?: mongoose.Types.ObjectId; name?: string } | string | null;
      const playerId = refId(player);
      const playerName =
        player && typeof player === 'object' ? String(player.name ?? playerId) : playerId;

      const tournamentPointsRaw = (row.tournamentPoints as unknown[]) ?? [];
      const tpTournamentMap = new Map(tournamentMap);
      for (const tp of tournamentPointsRaw) {
        const tpr = tp as Record<string, unknown>;
        const tour = tpr.tournament as Record<string, unknown> | string | null;
        if (tour && typeof tour === 'object') {
          const tid = String(tour._id ?? '');
          const settings = tour.tournamentSettings as Record<string, unknown> | undefined;
          tpTournamentMap.set(tid, {
            code: String(tour.tournamentId ?? ''),
            name: String(settings?.name ?? tour.tournamentId ?? ''),
          });
        }
      }

      const manualAdjustments = ((row.manualAdjustments as unknown[]) ?? []).map((adj) => {
        const ar = adj as Record<string, unknown>;
        const by = ar.adjustedBy;
        collectUser(by);
        return adj;
      });

      const base: AdminLeaguePlayerRow = {
        playerId,
        playerName,
        totalPoints: Number(row.totalPoints) || 0,
        tournamentPoints: mapTournamentPoints(tournamentPointsRaw, tpTournamentMap),
        manualAdjustments: mapManualAdjustments(manualAdjustments, userMap),
      };

      if (!extra) return base;

      const removedBy = row.removedBy;
      collectUser(removedBy);
      const removedById = refId(removedBy);
      return {
        ...base,
        reason: String(row.reason ?? ''),
        removedById,
        removedByEmail: userMap.get(removedById) ?? removedById,
        removedAt:
          row.removedAt instanceof Date
            ? row.removedAt.toISOString()
            : row.removedAt
              ? String(row.removedAt)
              : '',
      };
    };

    const players = ((o.players as unknown[]) ?? [])
      .map((p) => mapPlayerRow(p) as AdminLeaguePlayerRow)
      .sort((a, b) => b.totalPoints - a.totalPoints);

    const removedPlayers = ((o.removedPlayers as unknown[]) ?? []).map((p) =>
      mapPlayerRow(p, {} as AdminLeagueRemovedPlayerRow),
    ) as AdminLeagueRemovedPlayerRow[];

    return {
      _id: String(o._id),
      name: String(o.name ?? ''),
      description: String(o.description ?? ''),
      clubId: club && typeof club === 'object' ? String(club._id) : String(club ?? ''),
      clubName: club && typeof club === 'object' ? String(club.name ?? '') : '',
      createdById:
        createdBy && typeof createdBy === 'object' ? String(createdBy._id) : String(createdBy ?? ''),
      createdByEmail:
        createdBy && typeof createdBy === 'object'
          ? String(createdBy.email ?? createdBy._id)
          : String(createdBy ?? ''),
      pointSystemType: String(o.pointSystemType ?? ''),
      isActive: Boolean(o.isActive),
      verified: Boolean(o.verified),
      startDate: o.startDate instanceof Date ? o.startDate.toISOString() : o.startDate ? String(o.startDate) : null,
      endDate: o.endDate instanceof Date ? o.endDate.toISOString() : o.endDate ? String(o.endDate) : null,
      pointsConfig: mapPointsConfig((o.pointsConfig as Record<string, unknown>) ?? {}),
      attachedTournaments,
      players,
      removedPlayers,
      createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}
