import {
  connectMongo,
  ClubModel,
  FeedbackModel,
  TournamentModel,
  UserModel,
  ApiRequestMetricModel,
  ApiRequestErrorEventModel,
} from '@tdarts/core';
import { AdminObservabilityService } from './admin-observability.service';

export type AdminDashboardRange = '24h' | '7d' | '30d';

export type AdminMetricTrend = {
  current: number;
  previous: number;
  periodLabel: string;
};

export type AdminDashboardSummary = {
  range: AdminDashboardRange;
  usersTotal: number;
  usersLast7d: number;
  usersTrend: AdminMetricTrend;
  clubsActive: number;
  clubsTrend: AdminMetricTrend;
  tournamentsByStatus: Record<string, number>;
  tournamentsTotal: number;
  feedbackOpenHigh: number;
  userSignupsByDay: { day: string; count: number }[];
  feedbackOpenByPriority: Record<string, number>;
  apiErrorEvents24h: number;
  apiErrorsTrend: AdminMetricTrend;
  topErrorRoutes: { routeKey: string; method: string; errors: number }[];
  recentAdminActivity: {
    id: string;
    operation: string;
    message: string;
    timestamp: string;
  }[];
};

const MS_DAY = 24 * 60 * 60 * 1000;

/** Bounded dashboard aggregations — keep match windows indexed; target p95 < 500ms per getSummary (see phase-03 runbook). */
export class AdminDashboardService {
  static parseRange(raw?: string | null): AdminDashboardRange {
    if (raw === '24h' || raw === '30d') return raw;
    return '7d';
  }

  static rangeToSince(range: AdminDashboardRange): Date {
    const ms =
      range === '24h' ? MS_DAY : range === '30d' ? 30 * MS_DAY : 7 * MS_DAY;
    return new Date(Date.now() - ms);
  }

  static async getSummary(opts?: { range?: AdminDashboardRange }): Promise<AdminDashboardSummary> {
    await connectMongo();
    const range = opts?.range ?? '7d';
    const sinceRange = AdminDashboardService.rangeToSince(range);

    const since7 = new Date(Date.now() - 7 * MS_DAY);
    const since14 = new Date(Date.now() - 14 * MS_DAY);
    const since24 = new Date(Date.now() - MS_DAY);
    const since48 = new Date(Date.now() - 2 * MS_DAY);

    const [
      usersTotal,
      usersLast7d,
      usersPrior7d,
      clubsActive,
      clubsLast7d,
      clubsPrior7d,
      tournamentAgg,
      feedbackOpenHigh,
      signupsAgg,
      feedbackPriAgg,
      apiErrorEvents24h,
      apiErrorsPrior24h,
      topRoutesAgg,
    ] = await Promise.all([
      UserModel.countDocuments({ isDeleted: { $ne: true } }),
      UserModel.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: since7 } }),
      UserModel.countDocuments({
        isDeleted: { $ne: true },
        createdAt: { $gte: since14, $lt: since7 },
      }),
      ClubModel.countDocuments({ isActive: true }),
      ClubModel.countDocuments({ isActive: true, createdAt: { $gte: since7 } }),
      ClubModel.countDocuments({
        isActive: true,
        createdAt: { $gte: since14, $lt: since7 },
      }),
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
      UserModel.aggregate([
        { $match: { isDeleted: { $ne: true }, createdAt: { $gte: sinceRange } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 90 },
      ]),
      FeedbackModel.aggregate([
        { $match: { status: { $in: ['pending', 'in-progress'] } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      ApiRequestErrorEventModel.countDocuments({ occurredAt: { $gte: since24 } }),
      ApiRequestErrorEventModel.countDocuments({
        occurredAt: { $gte: since48, $lt: since24 },
      }),
      ApiRequestMetricModel.aggregate([
        { $match: { bucket: { $gte: sinceRange } } },
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
    const tournamentsTotal = Object.values(tournamentsByStatus).reduce((a, b) => a + b, 0);

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

    const auditRaw = await AdminObservabilityService.listLogs({ adminOnly: true, limit: 5 });
    const recentAdminActivity = auditRaw.map((l) => {
      const ts = l.timestamp as unknown;
      return {
        id: String(l._id ?? ''),
        operation: String(l.operation ?? ''),
        message: String(l.message ?? ''),
        timestamp: ts instanceof Date ? ts.toISOString() : String(ts ?? ''),
      };
    });

    return {
      range,
      usersTotal,
      usersLast7d,
      usersTrend: {
        current: usersLast7d,
        previous: usersPrior7d,
        periodLabel: 'vs prior 7d',
      },
      clubsActive,
      clubsTrend: {
        current: clubsLast7d,
        previous: clubsPrior7d,
        periodLabel: 'new active clubs vs prior 7d',
      },
      tournamentsByStatus,
      tournamentsTotal,
      feedbackOpenHigh,
      userSignupsByDay,
      feedbackOpenByPriority,
      apiErrorEvents24h,
      apiErrorsTrend: {
        current: apiErrorEvents24h,
        previous: apiErrorsPrior24h,
        periodLabel: 'vs prior 24h',
      },
      topErrorRoutes,
      recentAdminActivity,
    };
  }
}
