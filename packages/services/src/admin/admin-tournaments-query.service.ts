import mongoose from 'mongoose';
import { connectMongo, TournamentModel } from '@tdarts/core';

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
}
