import mongoose from 'mongoose';
import { connectMongo, SubscriptionModel } from '@tdarts/core';

export type AdminSubscriptionRow = {
  _id: string;
  userId: string;
  userEmail: string;
  clubId: string;
  clubName: string;
  createdAt: string;
  /** userId set but no matching user document */
  missingUser?: boolean;
  /** clubId set but no matching club document */
  missingClub?: boolean;
};

function resolveSubscriptionAggSort(sort?: { key: string; dir: 'asc' | 'desc' }): Record<string, 1 | -1> {
  const m: Record<string, string> = {
    user: 'userEmail',
    club: 'clubName',
    created: 'createdAt',
  };
  if (!sort || !m[sort.key]) return { createdAt: -1 };
  const d = sort.dir === 'asc' ? 1 : -1;
  return { [m[sort.key]]: d };
}

export class AdminSubscriptionsQueryService {
  static async list(params: {
    q?: string;
    page: number;
    limit: number;
    sort?: { key: string; dir: 'asc' | 'desc' };
  }): Promise<{ total: number; rows: AdminSubscriptionRow[] }> {
    await connectMongo();
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;

    const q = params.q?.trim();
    const postLookupMatch: Record<string, unknown> = {};
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(esc, 'i');
      postLookupMatch.$or = [{ userEmail: rx }, { clubName: rx }];
    }

    const pipeline: mongoose.PipelineStage[] = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'u',
        },
      },
      { $unwind: { path: '$u', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'clubs',
          localField: 'clubId',
          foreignField: '_id',
          as: 'c',
        },
      },
      { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: 1,
          clubId: 1,
          createdAt: 1,
          userEmail: '$u.email',
          clubName: '$c.name',
        },
      },
      ...(Object.keys(postLookupMatch).length ? [{ $match: postLookupMatch }] : []),
      { $sort: resolveSubscriptionAggSort(params.sort) },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'c' }],
        },
      },
    ];

    const agg = await SubscriptionModel.aggregate(pipeline);
    const facet = agg[0] as { rows: Record<string, unknown>[]; total: { c: number }[] };
    const total = facet?.total?.[0]?.c ?? 0;
    const rows: AdminSubscriptionRow[] = (facet?.rows ?? []).map((doc) => {
      const userId = doc.userId ? String(doc.userId) : '';
      const clubId = doc.clubId ? String(doc.clubId) : '';
      const userEmail = String(doc.userEmail ?? '');
      const clubName = String(doc.clubName ?? '');
      const createdAt =
        doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : typeof doc.createdAt === 'string'
            ? new Date(doc.createdAt).toISOString()
            : new Date().toISOString();
      return {
        _id: String(doc._id),
        userId,
        userEmail,
        clubId,
        clubName,
        createdAt,
        missingUser: Boolean(userId) && !userEmail,
        missingClub: Boolean(clubId) && !clubName,
      };
    });

    return { total, rows };
  }

  /** Users following this club (subscriptions collection rows + user lookup). */
  static async listByClubId(
    clubId: string,
    limit = 200,
  ): Promise<{ rows: AdminSubscriptionRow[]; brokenRefs: boolean }> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(clubId)) return { rows: [], brokenRefs: false };
    const cap = Math.min(Math.max(limit, 1), 500);
    const clubOid = new mongoose.Types.ObjectId(clubId);
    const pipeline: mongoose.PipelineStage[] = [
      { $match: { clubId: clubOid } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'u',
        },
      },
      { $unwind: { path: '$u', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'clubs',
          localField: 'clubId',
          foreignField: '_id',
          as: 'c',
        },
      },
      { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: 1,
          clubId: 1,
          createdAt: 1,
          userEmail: '$u.email',
          clubName: '$c.name',
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: cap },
    ];
    const facet = await SubscriptionModel.aggregate(pipeline);
    let brokenRefs = false;
    const rows: AdminSubscriptionRow[] = (facet as Record<string, unknown>[]).map((doc) => {
      const userId = doc.userId ? String(doc.userId) : '';
      const userEmail = String(doc.userEmail ?? '');
      const clubId = doc.clubId ? String(doc.clubId) : '';
      const clubName = String(doc.clubName ?? '');
      const missingUser = Boolean(userId) && !userEmail;
      const missingClub = Boolean(clubId) && !clubName;
      if (missingUser || missingClub) brokenRefs = true;
      const createdAt =
        doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : typeof doc.createdAt === 'string'
            ? new Date(doc.createdAt).toISOString()
            : new Date().toISOString();
      return {
        _id: String(doc._id),
        userId,
        userEmail,
        clubId,
        clubName,
        createdAt,
        missingUser: missingUser || undefined,
        missingClub: missingClub || undefined,
      };
    });
    return { rows, brokenRefs };
  }
}
