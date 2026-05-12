import mongoose from 'mongoose';
import { connectMongo, SubscriptionModel, UserModel, ClubModel } from '@tdarts/core';

export type AdminSubscriptionRow = {
  _id: string;
  userId: string;
  userEmail: string;
  clubId: string;
  clubName: string;
  createdAt: string;
};

export class AdminSubscriptionsQueryService {
  static async list(params: { page: number; limit: number }): Promise<{ total: number; rows: AdminSubscriptionRow[] }> {
    await connectMongo();
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;

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
      { $sort: { createdAt: -1 } },
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
    const rows: AdminSubscriptionRow[] = (facet?.rows ?? []).map((doc) => ({
      _id: String(doc._id),
      userId: doc.userId ? String(doc.userId) : '',
      userEmail: String(doc.userEmail ?? ''),
      clubId: doc.clubId ? String(doc.clubId) : '',
      clubName: String(doc.clubName ?? ''),
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
    }));

    return { total, rows };
  }
}
