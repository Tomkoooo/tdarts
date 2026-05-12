import mongoose from 'mongoose';
import {
  connectMongo,
  ClubModel,
  FeedbackModel,
  TournamentModel,
  UserModel,
  StressRunModel,
  ApiRequestMetricModel,
  ApiRequestErrorEventModel,
} from '@tdarts/core';

export type AdminDashboardSummary = {
  usersTotal: number;
  usersLast7d: number;
  clubsActive: number;
  tournamentsByStatus: Record<string, number>;
  feedbackOpenHigh: number;
  stressRunsRecent: { id: string; status: string; createdAt: string }[];
  userSignupsByDay: { day: string; count: number }[];
  feedbackOpenByPriority: Record<string, number>;
  apiErrorEvents24h: number;
  topErrorRoutes: { routeKey: string; method: string; errors: number }[];
};

export class AdminDashboardService {
  static async getSummary(): Promise<AdminDashboardSummary> {
    await connectMongo();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      usersTotal,
      usersLast7d,
      clubsActive,
      tournamentAgg,
      feedbackOpenHigh,
      stressRuns,
      signupsAgg,
      feedbackPriAgg,
      apiErrorEvents24h,
      topRoutesAgg,
    ] = await Promise.all([
      UserModel.countDocuments({ isDeleted: { $ne: true } }),
      UserModel.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: since } }),
      ClubModel.countDocuments({ isActive: true }),
      TournamentModel.aggregate([
        {
          $match: {
            isDeleted: { $ne: true },
            isArchived: { $ne: true },
            isSandbox: { $ne: true },
          },
        },
        { $group: { _id: '$tournamentSettings.status', count: { $sum: 1 } } },
      ]),
      FeedbackModel.countDocuments({
        status: { $in: ['pending', 'in-progress'] },
        priority: { $in: ['high', 'critical'] },
      }),
      StressRunModel.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('status createdAt')
        .lean(),
      UserModel.aggregate([
        { $match: { isDeleted: { $ne: true }, createdAt: { $gte: since14 } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      FeedbackModel.aggregate([
        { $match: { status: { $in: ['pending', 'in-progress'] } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      ApiRequestErrorEventModel.countDocuments({ occurredAt: { $gte: since24 } }),
      ApiRequestMetricModel.aggregate([
        { $match: { bucket: { $gte: since24 } } },
        {
          $group: {
            _id: { routeKey: '$routeKey', method: '$method' },
            errors: { $sum: '$errorCount' },
          },
        },
        { $sort: { errors: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const tournamentsByStatus: Record<string, number> = {};
    for (const row of tournamentAgg as { _id?: string; count?: number }[]) {
      if (row._id) tournamentsByStatus[String(row._id)] = Number(row.count) || 0;
    }

    const userSignupsByDay = (signupsAgg as { _id?: string; count?: number }[]).map((r) => ({
      day: String(r._id ?? ''),
      count: Number(r.count) || 0,
    }));

    const feedbackOpenByPriority: Record<string, number> = {};
    for (const row of feedbackPriAgg as { _id?: string; count?: number }[]) {
      if (row._id) feedbackOpenByPriority[String(row._id)] = Number(row.count) || 0;
    }

    const topErrorRoutes = (topRoutesAgg as { _id?: { routeKey?: string; method?: string }; errors?: number }[]).map(
      (r) => ({
        routeKey: String(r._id?.routeKey ?? ''),
        method: String(r._id?.method ?? ''),
        errors: Number(r.errors) || 0,
      }),
    );

    return {
      usersTotal,
      usersLast7d,
      clubsActive,
      tournamentsByStatus,
      feedbackOpenHigh,
      stressRunsRecent: stressRuns.map((r) => {
        const row = r as { _id?: mongoose.Types.ObjectId; status?: string; createdAt?: Date };
        return {
          id: String(row._id),
          status: String(row.status ?? ''),
          createdAt:
            row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date().toISOString(),
        };
      }),
      userSignupsByDay,
      feedbackOpenByPriority,
      apiErrorEvents24h,
      topErrorRoutes,
    };
  }
}
