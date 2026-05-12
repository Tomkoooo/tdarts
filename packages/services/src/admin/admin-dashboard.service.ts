import mongoose from 'mongoose';
import {
  connectMongo,
  ClubModel,
  FeedbackModel,
  TournamentModel,
  UserModel,
  StressRunModel,
} from '@tdarts/core';

export type AdminDashboardSummary = {
  usersTotal: number;
  usersLast7d: number;
  clubsActive: number;
  tournamentsByStatus: Record<string, number>;
  feedbackOpenHigh: number;
  stressRunsRecent: { id: string; status: string; createdAt: string }[];
};

export class AdminDashboardService {
  static async getSummary(): Promise<AdminDashboardSummary> {
    await connectMongo();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      usersTotal,
      usersLast7d,
      clubsActive,
      tournamentAgg,
      feedbackOpenHigh,
      stressRuns,
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
    ]);

    const tournamentsByStatus: Record<string, number> = {};
    for (const row of tournamentAgg as { _id?: string; count?: number }[]) {
      if (row._id) tournamentsByStatus[String(row._id)] = Number(row.count) || 0;
    }

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
    };
  }
}
