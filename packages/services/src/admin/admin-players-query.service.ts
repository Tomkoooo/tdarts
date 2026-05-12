import mongoose from 'mongoose';
import { connectMongo, PlayerModel } from '@tdarts/core';

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
  static async list(params: { q?: string; page: number; limit: number }): Promise<{
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

    const [total, docs] = await Promise.all([
      PlayerModel.countDocuments(query),
      PlayerModel.find(query)
        .select('name country userRef stats.mmr stats.oacMmr stats.tournamentsPlayed')
        .sort({ _id: -1 })
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
}
