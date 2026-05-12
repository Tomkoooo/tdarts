import mongoose from 'mongoose';
import { connectMongo, MatchModel, TournamentModel } from '@tdarts/core';

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

export class AdminMatchesQueryService {
  static async list(params: {
    q?: string;
    page: number;
    limit: number;
    manualOnly?: boolean;
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

    const [total, docs] = await Promise.all([
      MatchModel.countDocuments(match),
      MatchModel.find(match)
        .select('tournamentRef status type round manualOverride updatedAt')
        .sort({ updatedAt: -1 })
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

  static async getById(matchId: string): Promise<Record<string, unknown> | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(matchId)) return null;
    const doc = await MatchModel.findById(matchId).lean();
    if (!doc) return null;
    const o = doc as Record<string, unknown>;
    return {
      _id: String(o._id),
      tournamentRef: o.tournamentRef ? String(o.tournamentRef) : '',
      status: o.status,
      type: o.type,
      round: o.round,
      manualOverride: o.manualOverride,
      manualChangeType: o.manualChangeType,
      manualChangedBy: o.manualChangedBy ? String(o.manualChangedBy) : null,
      previousState: o.previousState,
      player1: o.player1,
      player2: o.player2,
      winnerId: o.winnerId ? String(o.winnerId) : null,
      legs: o.legs,
      updatedAt: o.updatedAt,
    };
  }
}
