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

export type AdminDashboardActivityItem = {
  id: string;
  kind:
    | 'user_signup'
    | 'club_activity'
    | 'tournament_change'
    | 'feedback_unread'
    | 'critical_feedback'
    | 'api_errors'
    | 'api_spike';
  title: string;
  subtitle?: string;
  href?: string;
  timestamp: string;
  tone: 'default' | 'warning' | 'critical';
};

export type AdminDashboardSummary = {
  range: AdminDashboardRange;
  usersTotal: number;
  usersLast7d: number;
  usersNew24h: number;
  usersDelta24h: number;
  usersTrend: AdminMetricTrend;
  clubsActive: number;
  clubsNew24h: number;
  clubsDelta24h: number;
  clubsTrend: AdminMetricTrend;
  tournamentsByStatus: Record<string, number>;
  tournamentsTotal: number;
  feedbackOpenHigh: number;
  userSignupsByDay: { day: string; count: number }[];
  feedbackOpenByPriority: Record<string, number>;
  apiErrorEvents24h: number;
  apiErrorsDelta24h: number;
  apiErrorsTrend: AdminMetricTrend;
  topErrorRoutes: { routeKey: string; method: string; errors: number }[];
  recentAdminActivity: {
    id: string;
    operation: string;
    message: string;
    timestamp: string;
  }[];
  activityFeed: AdminDashboardActivityItem[];
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
      usersNew24h,
      usersPrior24h,
      clubsActive,
      clubsLast7d,
      clubsPrior7d,
      clubsNew24h,
      clubsPrior24h,
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
      UserModel.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: since24 } }),
      UserModel.countDocuments({
        isDeleted: { $ne: true },
        createdAt: { $gte: since48, $lt: since24 },
      }),
      ClubModel.countDocuments({ isActive: true }),
      ClubModel.countDocuments({ isActive: true, createdAt: { $gte: since7 } }),
      ClubModel.countDocuments({
        isActive: true,
        createdAt: { $gte: since14, $lt: since7 },
      }),
      ClubModel.countDocuments({ isActive: true, createdAt: { $gte: since24 } }),
      ClubModel.countDocuments({
        isActive: true,
        createdAt: { $gte: since48, $lt: since24 },
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

    const activityFeed = await AdminDashboardService.buildActivityFeed({
      apiErrors24h: apiErrorEvents24h,
      apiErrorsDelta24h: apiErrorEvents24h - apiErrorsPrior24h,
    });

    return {
      range,
      usersTotal,
      usersLast7d,
      usersNew24h,
      usersDelta24h: usersNew24h - usersPrior24h,
      usersTrend: {
        current: usersLast7d,
        previous: usersPrior7d,
        periodLabel: 'vs prior 7d',
      },
      clubsActive,
      clubsNew24h,
      clubsDelta24h: clubsNew24h - clubsPrior24h,
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
      apiErrorsDelta24h: apiErrorEvents24h - apiErrorsPrior24h,
      apiErrorsTrend: {
        current: apiErrorEvents24h,
        previous: apiErrorsPrior24h,
        periodLabel: 'vs prior 24h',
      },
      topErrorRoutes,
      recentAdminActivity,
      activityFeed,
    };
  }

  static async buildActivityFeed(opts?: {
    apiErrors24h?: number;
    apiErrorsDelta24h?: number;
  }): Promise<AdminDashboardActivityItem[]> {
    await connectMongo();
    const since7 = new Date(Date.now() - 7 * MS_DAY);
    const items: AdminDashboardActivityItem[] = [];

    const [recentUsers, recentClubs, recentTournaments, unreadFeedback, criticalFeedback] =
      await Promise.all([
        UserModel.find({ isDeleted: { $ne: true }, createdAt: { $gte: since7 } })
          .sort({ createdAt: -1 })
          .limit(6)
          .select('name email username createdAt')
          .lean(),
        ClubModel.find({ updatedAt: { $gte: since7 } })
          .sort({ updatedAt: -1 })
          .limit(6)
          .select('name updatedAt')
          .lean(),
        TournamentModel.find({
          isDeleted: { $ne: true },
          updatedAt: { $gte: since7 },
        })
          .sort({ updatedAt: -1 })
          .limit(6)
          .select('tournamentId tournamentSettings updatedAt')
          .lean(),
        FeedbackModel.find({
          isReadByAdmin: { $ne: true },
          status: { $in: ['pending', 'in-progress'] },
        })
          .sort({ createdAt: -1 })
          .limit(6)
          .select('title priority createdAt')
          .lean(),
        FeedbackModel.find({
          priority: 'critical',
          status: { $in: ['pending', 'in-progress'] },
        })
          .sort({ createdAt: -1 })
          .limit(4)
          .select('title createdAt')
          .lean(),
      ]);

    for (const u of recentUsers as {
      _id?: unknown;
      name?: string;
      email?: string;
      username?: string;
      createdAt?: Date;
    }[]) {
      const ts = u.createdAt instanceof Date ? u.createdAt : new Date();
      items.push({
        id: `user-${String(u._id)}`,
        kind: 'user_signup',
        title: `Új felhasználó: ${u.name || u.username || u.email || '—'}`,
        subtitle: u.email,
        href: `/admin/users/${String(u._id)}`,
        timestamp: ts.toISOString(),
        tone: 'default',
      });
    }

    for (const c of recentClubs as { _id?: unknown; name?: string; updatedAt?: Date }[]) {
      const ts = c.updatedAt instanceof Date ? c.updatedAt : new Date();
      items.push({
        id: `club-${String(c._id)}`,
        kind: 'club_activity',
        title: `Klub frissítve: ${c.name ?? '—'}`,
        href: `/admin/clubs/${String(c._id)}`,
        timestamp: ts.toISOString(),
        tone: 'default',
      });
    }

    for (const t of recentTournaments as {
      _id?: unknown;
      tournamentId?: string;
      tournamentSettings?: { name?: string; status?: string };
      updatedAt?: Date;
    }[]) {
      const ts = t.updatedAt instanceof Date ? t.updatedAt : new Date();
      const settings = t.tournamentSettings;
      items.push({
        id: `tournament-${String(t._id)}`,
        kind: 'tournament_change',
        title: `Verseny: ${settings?.name ?? t.tournamentId ?? '—'}`,
        subtitle: settings?.status ? `státusz: ${settings.status}` : undefined,
        href: `/admin/tournaments/${String(t._id)}`,
        timestamp: ts.toISOString(),
        tone: 'default',
      });
    }

    for (const f of unreadFeedback as {
      _id?: unknown;
      title?: string;
      priority?: string;
      createdAt?: Date;
    }[]) {
      const ts = f.createdAt instanceof Date ? f.createdAt : new Date();
      items.push({
        id: `feedback-unread-${String(f._id)}`,
        kind: 'feedback_unread',
        title: `Olvasatlan visszajelzés: ${f.title ?? '—'}`,
        subtitle: f.priority,
        href: `/admin/support/feedback/${String(f._id)}`,
        timestamp: ts.toISOString(),
        tone: f.priority === 'high' || f.priority === 'critical' ? 'warning' : 'default',
      });
    }

    for (const f of criticalFeedback as { _id?: unknown; title?: string; createdAt?: Date }[]) {
      const ts = f.createdAt instanceof Date ? f.createdAt : new Date();
      items.push({
        id: `feedback-critical-${String(f._id)}`,
        kind: 'critical_feedback',
        title: `Kritikus visszajelzés: ${f.title ?? '—'}`,
        href: `/admin/support/feedback/${String(f._id)}`,
        timestamp: ts.toISOString(),
        tone: 'critical',
      });
    }

    const api24 = opts?.apiErrors24h ?? 0;
    const apiDelta = opts?.apiErrorsDelta24h ?? 0;
    if (api24 > 0) {
      items.push({
        id: 'api-errors-24h',
        kind: 'api_errors',
        title: `API hibák (24h): ${api24}`,
        subtitle: apiDelta !== 0 ? `${apiDelta >= 0 ? '+' : ''}${apiDelta} az előző 24h-hoz képest` : undefined,
        href: '/admin/observability/errors',
        timestamp: new Date().toISOString(),
        tone: api24 > 20 ? 'critical' : api24 > 5 ? 'warning' : 'default',
      });
    }
    if (apiDelta >= 10) {
      items.push({
        id: 'api-spike',
        kind: 'api_spike',
        title: 'API hiba spike észlelve',
        subtitle: `+${apiDelta} hiba az előző 24 órához képest`,
        href: '/admin/observability/api',
        timestamp: new Date().toISOString(),
        tone: 'critical',
      });
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items.slice(0, 24);
  }
}
