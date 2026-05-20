import mongoose from 'mongoose';
import { connectMongo, PlayerModel, UserModel } from '@tdarts/core';

export type AdminPlayerLinkedUser = { _id: string; email: string; name: string; username: string };
export type AdminPlayerTournamentHistoryRow = {
  tournamentId: string;
  name?: string;
  placement?: number;
  date?: string;
};

export type AdminPlayerAdminContext = {
  linkedUser: AdminPlayerLinkedUser | null;
  recentTournaments: AdminPlayerTournamentHistoryRow[];
};

export type AdminPlayerListRow = {
  _id: string;
  name: string;
  country: string | null;
  hasUser: boolean;
  mmr: number;
  oacMmr: number;
  tournamentsPlayed: number;
};

export class AdminPlayersQueryService {
  static async list(params: {
    q?: string;
    page: number;
    limit: number;
    sort?: { key: string; dir: 'asc' | 'desc' };
  }): Promise<{
    total: number;
    rows: AdminPlayerListRow[];
  }> {
    await connectMongo();
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    const q = params.q?.trim();
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.name = new RegExp(esc, 'i');
    }

    const PLAYER_SORT_FIELD: Record<string, string> = {
      name: 'name',
      mmr: 'stats.mmr',
      oac: 'stats.oacMmr',
      tp: 'stats.tournamentsPlayed',
    };
    const sortSpec =
      params.sort && PLAYER_SORT_FIELD[params.sort.key]
        ? ({ [PLAYER_SORT_FIELD[params.sort.key]]: params.sort.dir === 'asc' ? 1 : -1 } as Record<
            string,
            1 | -1
          >)
        : ({ _id: -1 } as Record<string, 1 | -1>);

    const [total, docs] = await Promise.all([
      PlayerModel.countDocuments(query),
      PlayerModel.find(query).select('name country userRef stats.mmr stats.oacMmr stats.tournamentsPlayed').sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const rows: AdminPlayerListRow[] = (docs as Record<string, unknown>[]).map((doc) => {
      const stats = doc.stats as Record<string, number> | undefined;
      return {
        _id: String(doc._id),
        name: String(doc.name ?? ''),
        country: doc.country != null ? String(doc.country) : null,
        hasUser: Boolean(doc.userRef),
        mmr: Number(stats?.mmr) || 0,
        oacMmr: Number(stats?.oacMmr) || 0,
        tournamentsPlayed: Number(stats?.tournamentsPlayed) || 0,
      };
    });

    return { total, rows };
  }

  static async getById(playerId: string): Promise<Record<string, unknown> | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(playerId)) return null;
    const doc = await PlayerModel.findById(playerId).lean();
    if (!doc) return null;
    const o = doc as Record<string, unknown>;
    return {
      _id: String(o._id),
      name: o.name,
      country: o.country,
      userRef: o.userRef ? String(o.userRef) : null,
      type: o.type,
      stats: o.stats,
      tournamentHistory: o.tournamentHistory,
      honors: o.honors,
      publicConsent: o.publicConsent,
      profilePicture: o.profilePicture,
    };
  }

  static async getPlayerAdminContext(playerId: string): Promise<AdminPlayerAdminContext | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(playerId)) return null;
    const doc = await PlayerModel.findById(playerId)
      .select('userRef tournamentHistory')
      .lean();
    if (!doc) return null;
    const o = doc as Record<string, unknown>;
    let linkedUser: AdminPlayerLinkedUser | null = null;
    if (o.userRef) {
      const user = await UserModel.findById(o.userRef).select('email name username').lean();
      if (user) {
        const u = user as Record<string, unknown>;
        linkedUser = {
          _id: String(u._id),
          email: String(u.email ?? ''),
          name: String(u.name ?? ''),
          username: String(u.username ?? ''),
        };
      }
    }
    const history = Array.isArray(o.tournamentHistory) ? o.tournamentHistory : [];
    const recentTournaments: AdminPlayerTournamentHistoryRow[] = history.slice(0, 15).map((entry) => {
      const h = entry as Record<string, unknown>;
      const date = h.date ?? h.snapshotDate;
      return {
        tournamentId: String(h.tournamentId ?? h.tournamentRef ?? '—'),
        name: h.name != null ? String(h.name) : h.tournamentName != null ? String(h.tournamentName) : undefined,
        placement: typeof h.placement === 'number' ? h.placement : typeof h.position === 'number' ? h.position : undefined,
        date: date instanceof Date ? date.toISOString() : date != null ? String(date) : undefined,
      };
    });
    return { linkedUser, recentTournaments };
  }
}
