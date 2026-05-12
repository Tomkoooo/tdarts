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

export class AdminLeaguesQueryService {
  static async list(params: {
    q?: string;
    page: number;
    limit: number;
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
      { $sort: { updatedAt: -1 } },
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

  static async getById(leagueId: string): Promise<Record<string, unknown> | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(leagueId)) return null;
    const doc = await LeagueModel.findById(leagueId).lean();
    if (!doc) return null;
    const o = doc as Record<string, unknown>;
    return {
      _id: String(o._id),
      name: o.name,
      description: o.description,
      club: o.club ? String(o.club) : '',
      attachedTournaments: o.attachedTournaments,
      players: o.players,
      removedPlayers: o.removedPlayers,
      pointsConfig: o.pointsConfig,
      pointSystemType: o.pointSystemType,
      isActive: o.isActive,
      verified: o.verified,
      startDate: o.startDate,
      endDate: o.endDate,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }
}
