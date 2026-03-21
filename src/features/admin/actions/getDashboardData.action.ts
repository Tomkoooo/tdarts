'use server';

import { subDays, subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { UserModel } from '@/database/models/user.model';
import { ClubModel } from '@/database/models/club.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { FeedbackModel } from '@/database/models/feedback.model';
import { LogModel } from '@/database/models/log.model';
import { ApiRouteAnomalyModel } from '@/database/models/api-route-anomaly.model';
import { authorizeUserResult } from '@/shared/lib/guards';
import { AuthorizationService } from '@/database/services/authorization.service';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { connectMongo } from '@/lib/mongoose';
import {
  adminOperationalErrorFilter,
  adminRecentActivityExcludeNoiseFilter,
} from '@/features/admin/lib/operationalAdminLogFilters';

type CountWindow = { total: number; month: number; prevMonth: number; day: number };

function growth(month: number, prevMonth: number): number {
  if (prevMonth === 0) return month > 0 ? 100 : 0;
  return Math.round(((month - prevMonth) / prevMonth) * 100);
}

async function countWindow(model: any, dateField: string): Promise<CountWindow> {
  const now = new Date();
  const startThisMonth = startOfMonth(now);
  const startPrevMonth = startOfMonth(subMonths(now, 1));
  const endPrevMonth = endOfMonth(subMonths(now, 1));
  const last24h = subDays(now, 1);

  const [total, month, prevMonth, day] = await Promise.all([
    model.countDocuments({}),
    model.countDocuments({ [dateField]: { $gte: startThisMonth } }),
    model.countDocuments({ [dateField]: { $gte: startPrevMonth, $lte: endPrevMonth } }),
    model.countDocuments({ [dateField]: { $gte: last24h } }),
  ]);

  return { total, month, prevMonth, day };
}

export async function getAdminDashboardDataAction() {
  const run = withTelemetry(
    'admin.dashboard.getData',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const isAdmin = await AuthorizationService.isGlobalAdmin(authResult.data.userId);
      if (!isAdmin) {
        return {
          ok: false as const,
          code: 'FORBIDDEN' as const,
          status: 403,
          message: 'Admin access required',
        };
      }

      await connectMongo();

      const [users, clubs, tournaments, feedbacks] = await Promise.all([
        countWindow(UserModel, 'createdAt'),
        countWindow(ClubModel, 'createdAt'),
        countWindow(TournamentModel, 'createdAt'),
        countWindow(FeedbackModel, 'createdAt'),
      ]);

      const [errorsTotal, errorsMonth, errorsPrevMonth, errorsDay] = await Promise.all([
        LogModel.countDocuments(adminOperationalErrorFilter),
        LogModel.countDocuments({
          ...adminOperationalErrorFilter,
          timestamp: { $gte: startOfMonth(new Date()) },
        }),
        LogModel.countDocuments({
          ...adminOperationalErrorFilter,
          timestamp: {
            $gte: startOfMonth(subMonths(new Date(), 1)),
            $lte: endOfMonth(subMonths(new Date(), 1)),
          },
        }),
        LogModel.countDocuments({
          ...adminOperationalErrorFilter,
          timestamp: { $gte: subDays(new Date(), 1) },
        }),
      ]);

      const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
      const [userSeries, tournamentSeries] = await Promise.all(
        months.map(async (monthDate) => {
          const from = startOfMonth(monthDate);
          const to = endOfMonth(monthDate);
          const [u, t] = await Promise.all([
            UserModel.countDocuments({ createdAt: { $gte: from, $lte: to } }),
            TournamentModel.countDocuments({ createdAt: { $gte: from, $lte: to } }),
          ]);
          return { month: format(monthDate, 'MMM'), users: u, tournaments: t };
        })
      ).then((rows) => [
        rows.map((row) => ({ month: row.month, value: row.users })),
        rows.map((row) => ({ month: row.month, value: row.tournaments })),
      ]);

      const recentLogs = await LogModel.find(adminRecentActivityExcludeNoiseFilter)
        .sort({ timestamp: -1 })
        .limit(12)
        .select('message category timestamp')
        .lean();

      const anomalies = await ApiRouteAnomalyModel.find({ resolvedAt: null })
        .sort({ lastDetectedAt: -1 })
        .limit(20)
        .lean();

      const pendingFeedback = await FeedbackModel.countDocuments({
        status: { $in: ['pending', 'in-progress'] },
      });

      const payload = {
        stats: {
          totalUsers: users.total,
          totalClubs: clubs.total,
          totalTournaments: tournaments.total,
          totalErrors: errorsTotal,
          totalFeedback: feedbacks.total,
          newUsersThisMonth: users.month,
          newClubsThisMonth: clubs.month,
          newTournamentsThisMonth: tournaments.month,
          errorsThisMonth: errorsMonth,
          feedbackThisMonth: feedbacks.month,
          userGrowth: growth(users.month, users.prevMonth),
          clubGrowth: growth(clubs.month, clubs.prevMonth),
          tournamentGrowth: growth(tournaments.month, tournaments.prevMonth),
          errorGrowth: growth(errorsMonth, errorsPrevMonth),
          feedbackGrowth: growth(feedbacks.month, feedbacks.prevMonth),
          newUsersLast24h: users.day,
          newClubsLast24h: clubs.day,
          newTournamentsLast24h: tournaments.day,
          errorsLast24h: errorsDay,
          feedbackLast24h: feedbacks.day,
        },
        userChartData: {
          labels: userSeries.map((item) => item.month),
          datasets: [
            {
              label: 'Users',
              data: userSeries.map((item) => item.value),
              backgroundColor: '#3b82f6',
              borderColor: '#2563eb',
            },
          ],
        },
        tournamentChartData: {
          labels: tournamentSeries.map((item) => item.month),
          datasets: [
            {
              label: 'Tournaments',
              data: tournamentSeries.map((item) => item.value),
              backgroundColor: '#f59e0b',
              borderColor: '#d97706',
            },
          ],
        },
        activities: recentLogs.map((log: any) => ({
          id: String(log._id),
          type:
            log.category === 'user'
              ? 'user'
              : log.category === 'club'
                ? 'club'
                : log.category === 'tournament'
                  ? 'tournament'
                  : 'auth',
          message: String(log.message || ''),
          time: log.timestamp ? new Date(log.timestamp).toLocaleString('hu-HU') : '',
        })),
        alerts: {
          errors24h: errorsDay,
          pendingFeedback,
          anomalyCount: anomalies.length,
          anomalies,
        },
      };

      return serializeForClient(payload);
    },
    {
      method: 'ACTION',
      metadata: { feature: 'admin', actionName: 'getAdminDashboardData' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(undefined);
}
