'use server';

import { AuthService } from '@/database/services/auth.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { ClubModel } from '@/database/models/club.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { LeagueModel } from '@/database/models/league.model';
import { UserModel } from '@/database/models/user.model';
import { PlayerModel } from '@/database/models/player.model';
import { TodoService } from '@/database/services/todo.service';
import { FeedbackService } from '@/database/services/feedback.service';
import { FeedbackModel } from '@/database/models/feedback.model';
import { LogModel } from '@/database/models/log.model';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';
import { ApiRequestErrorEventModel } from '@/database/models/api-request-error-event.model';
import { ApiRouteAnomalyModel } from '@/database/models/api-route-anomaly.model';
import { EmailTemplateService } from '@/database/services/emailtemplate.service';
import { EmailTemplateModel } from '@/database/models/emailtemplate.model';
import { sendEmail } from '@/lib/mailer';
import { connectMongo } from '@/lib/mongoose';
import { authorizeUserResult } from '@/shared/lib/guards';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { YearWrapService } from '@/database/services/year-wrap.service';

type Primitive = string | number | boolean;
type QueryParams = Record<string, Primitive>;

const DAY_MS = 24 * 60 * 60 * 1000;

function success(data: unknown, status = 200) {
  return { ok: true, status, data: serializeForClient(data) };
}

function failure(message: string, status = 400) {
  return {
    ok: false,
    status,
    data: { success: false, error: message, message },
  };
}

async function assertGlobalAdmin() {
  const auth = await authorizeUserResult();
  if (!auth.ok) {
    return { error: failure(auth.message || 'Unauthorized', auth.status || 401) };
  }

  const isAdmin = await AuthorizationService.isGlobalAdmin(auth.data.userId);
  if (!isAdmin) {
    return { error: failure('Admin access required', 403) };
  }

  return { userId: auth.data.userId };
}

function toInt(input: Primitive | undefined, fallback: number) {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(input: Primitive | undefined, fallback = false) {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'number') return input !== 0;
  if (typeof input === 'string') return input === 'true' || input === '1';
  return fallback;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveDateRange(params: QueryParams) {
  const endDate = params.end ? new Date(String(params.end)) : new Date();
  const startDate = params.start ? new Date(String(params.start)) : new Date(endDate);
  if (!params.start) {
    const range = String(params.range || '24h');
    if (range === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (range === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (range === '90d') startDate.setDate(startDate.getDate() - 90);
    else startDate.setDate(startDate.getDate() - 1);
  }
  return { startDate, endDate };
}

async function dailyCountSeries(model: any, dateField = 'createdAt', days = 30) {
  const from = new Date(Date.now() - days * DAY_MS);
  const rows = await model.aggregate([
    { $match: { [dateField]: { $gte: from } } },
    {
      $group: {
        _id: {
          y: { $year: `$${dateField}` },
          m: { $month: `$${dateField}` },
          d: { $dayOfMonth: `$${dateField}` },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
  ]);

  return rows.map((row: any) => ({
    date: `${row._id.y}-${String(row._id.m).padStart(2, '0')}-${String(row._id.d).padStart(2, '0')}`,
    count: row.count,
  }));
}

export async function adminUsersListAction(params: QueryParams) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();

    const page = Math.max(1, toInt(params.page, 1));
    const limit = Math.max(1, Math.min(100, toInt(params.limit, 10)));
    const search = String(params.search || '').trim();
    const role = String(params.role || 'all');
    const skip = (page - 1) * limit;

    const query: any = { isDeleted: { $ne: true } };
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ name: rx }, { email: rx }, { username: rx }];
    }
    if (role === 'admin') query.isAdmin = true;
    if (role === 'user') query.isAdmin = false;

    const [users, total, admins, verified, allUserIds] = await Promise.all([
      UserModel.find(query)
        .select('_id name email username isAdmin isVerified createdAt lastLogin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UserModel.countDocuments(query),
      UserModel.countDocuments({ ...query, isAdmin: true }),
      UserModel.countDocuments({ ...query, isVerified: true }),
      UserModel.find(query).select('_id'),
    ]);

    const userIdSet = allUserIds.map((u: any) => u._id);
    const players = await PlayerModel.find({ userRef: { $in: userIdSet } }).select('_id name honors userRef');
    const playerByUserId = new Map<string, any>();
    for (const p of players as any[]) {
      if (p.userRef) playerByUserId.set(String(p.userRef), p);
    }

    const mappedUsers = users.map((user: any) => {
      const player = playerByUserId.get(String(user._id));
      return {
        _id: String(user._id),
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
        isAdmin: Boolean(user.isAdmin),
        isVerified: Boolean(user.isVerified),
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || null,
        playerProfile: player
          ? {
              _id: String(player._id),
              name: player.name || '',
              honors: Array.isArray(player.honors) ? player.honors : [],
            }
          : null,
      };
    });

    const unverified = Math.max(0, total - verified);

    return success({
      users: mappedUsers,
      stats: { total, admins, verified, unverified },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load users', 500);
  }
}

export async function adminUsersToggleAdminAction(userId: string, makeAdmin: boolean) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    await UserModel.findByIdAndUpdate(userId, { isAdmin: makeAdmin }, { new: true });
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to update admin status', 500);
  }
}

export async function adminUsersDeactivateAction(userId: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    await UserModel.findByIdAndUpdate(userId, { isDeleted: true });
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to deactivate user', 500);
  }
}

export async function adminUsersUpdateVerificationAction(userId: string, isVerified: boolean) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    await UserModel.findByIdAndUpdate(userId, { isVerified });
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to update verification', 500);
  }
}

export async function adminUsersSetPasswordAction(userId: string, newPassword: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const user = await UserModel.findById(userId);
    if (!user) return failure('User not found', 404);
    user.password = newPassword;
    await user.save();
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to set password', 500);
  }
}

export async function adminUsersSendResetAction(userId: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const user = await UserModel.findById(userId);
    if (!user) return failure('User not found', 404);
    await AuthService.forgotPassword(user.email);
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to send reset email', 500);
  }
}

export async function adminUsersSendEmailAction(payload: {
  userId: string;
  subject: string;
  message: string;
  language: 'hu' | 'en';
}) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const user = await UserModel.findById(payload.userId).select('email name');
    if (!user?.email) return failure('User email not found', 404);
    const html = `<p>${String(payload.message || '').replace(/\n/g, '<br/>')}</p>`;
    await sendEmail({
      to: [user.email],
      subject: payload.subject,
      text: payload.message,
      html,
    });
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to send email', 500);
  }
}

export async function adminClubsListAction(params: QueryParams) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();

    const page = Math.max(1, toInt(params.page, 1));
    const limit = Math.max(1, Math.min(100, toInt(params.limit, 10)));
    const search = String(params.search || '').trim();
    const verifiedFilter = String(params.verified || 'all');
    const skip = (page - 1) * limit;

    const query: any = {};
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ name: rx }, { location: rx }, { description: rx }];
    }
    if (verifiedFilter === 'verified') query.verified = true;
    if (verifiedFilter === 'unverified') query.verified = false;

    const [clubs, total, active, deleted, verified] = await Promise.all([
      ClubModel.find(query)
        .select('name description location subscriptionModel createdAt isActive verified members')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ClubModel.countDocuments(query),
      ClubModel.countDocuments({ ...query, isActive: true }),
      ClubModel.countDocuments({ ...query, isActive: false }),
      ClubModel.countDocuments({ ...query, verified: true }),
    ]);

    const clubIds = clubs.map((c: any) => c._id);
    const tournamentCounts = await TournamentModel.aggregate([
      { $match: { clubId: { $in: clubIds } } },
      { $group: { _id: '$clubId', count: { $sum: 1 } } },
    ]);
    const tournamentByClub = new Map<string, number>(
      tournamentCounts.map((row: any) => [String(row._id), Number(row.count || 0)])
    );

    const mapped = clubs.map((club: any) => ({
      _id: String(club._id),
      name: club.name || '',
      description: club.description || '',
      location: club.location || '',
      subscriptionModel: club.subscriptionModel || 'free',
      createdAt: club.createdAt,
      isDeleted: !club.isActive,
      memberCount: Array.isArray(club.members) ? club.members.length : 0,
      tournamentCount: tournamentByClub.get(String(club._id)) || 0,
      verified: Boolean(club.verified),
    }));

    return success({
      clubs: mapped,
      stats: {
        total,
        active,
        deleted,
        verified,
        unverified: Math.max(0, total - verified),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load clubs', 500);
  }
}

export async function adminTournamentsListAction(params: QueryParams) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();

    const page = Math.max(1, toInt(params.page, 1));
    const limit = Math.max(1, Math.min(100, toInt(params.limit, 10)));
    const search = String(params.search || '').trim();
    const statusFilter = String(params.status || 'all');
    const verifiedFilter = String(params.verified || 'all');
    const sandboxFilter = String(params.sandbox || 'all');
    const skip = (page - 1) * limit;

    const query: any = {};
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ 'tournamentSettings.name': rx }, { tournamentId: rx }];
    }
    if (statusFilter !== 'all') query['tournamentSettings.status'] = statusFilter;
    if (verifiedFilter === 'verified') query.verified = true;
    if (verifiedFilter === 'unverified') query.verified = false;
    if (sandboxFilter === 'sandbox') query.isSandbox = true;
    if (sandboxFilter === 'active') query.isSandbox = false;

    const tournaments = await TournamentModel.find(query)
      .populate('clubId', 'name')
      .populate('league', 'name verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const [total, aggRows] = await Promise.all([
      TournamentModel.countDocuments(query),
      TournamentModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $in: ['$tournamentSettings.status', ['active', 'group-stage', 'knockout']] }, 1, 0],
              },
            },
            finished: { $sum: { $cond: [{ $eq: ['$tournamentSettings.status', 'finished'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$tournamentSettings.status', 'pending'] }, 1, 0] } },
            totalPlayers: { $sum: { $size: { $ifNull: ['$tournamentPlayers', []] } } },
            verified: { $sum: { $cond: [{ $eq: ['$verified', true] }, 1, 0] } },
            sandbox: { $sum: { $cond: [{ $eq: ['$isSandbox', true] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const statsRow = aggRows[0] || {};
    const mapped = tournaments.map((t: any) => ({
      _id: String(t._id),
      name: t.tournamentSettings?.name || '',
      tournamentId: t.tournamentId || '',
      description: t.tournamentSettings?.description || '',
      status: t.tournamentSettings?.status || 'pending',
      tournamentType: t.tournamentSettings?.format || 'group',
      startDate: t.tournamentSettings?.startDate,
      endDate: t.tournamentSettings?.endDate,
      playerCount: Array.isArray(t.tournamentPlayers) ? t.tournamentPlayers.length : 0,
      clubId: {
        _id: String(t.clubId?._id || ''),
        name: t.clubId?.name || '-',
      },
      createdAt: t.createdAt,
      isDeleted: Boolean(t.isDeleted),
      verified: Boolean(t.verified),
      league: t.league
        ? {
            _id: String(t.league._id),
            name: t.league.name || '',
            verified: Boolean(t.league.verified),
          }
        : undefined,
      isSandbox: Boolean(t.isSandbox),
    }));

    return success({
      tournaments: mapped,
      stats: {
        total: Number(statsRow.total || 0),
        active: Number(statsRow.active || 0),
        finished: Number(statsRow.finished || 0),
        pending: Number(statsRow.pending || 0),
        totalPlayers: Number(statsRow.totalPlayers || 0),
        verified: Number(statsRow.verified || 0),
        unverified: Math.max(0, Number(statsRow.total || 0) - Number(statsRow.verified || 0)),
        sandbox: Number(statsRow.sandbox || 0),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load tournaments', 500);
  }
}

export async function adminLeaguesListAction(params: QueryParams) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();

    const page = Math.max(1, toInt(params.page, 1));
    const limit = Math.max(1, Math.min(100, toInt(params.limit, 10)));
    const search = String(params.search || '').trim();
    const verifiedFilter = String(params.verified || 'all');
    const skip = (page - 1) * limit;

    const query: any = {};
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ name: rx }, { description: rx }];
    }
    if (verifiedFilter === 'verified') query.verified = true;
    if (verifiedFilter === 'unverified') query.verified = false;

    const [leagues, total, verified] = await Promise.all([
      LeagueModel.find(query).populate('club', 'name verified').sort({ createdAt: -1 }).skip(skip).limit(limit),
      LeagueModel.countDocuments(query),
      LeagueModel.countDocuments({ ...query, verified: true }),
    ]);

    const mapped = leagues.map((l: any) => ({
      _id: String(l._id),
      name: l.name || '',
      description: l.description || '',
      pointSystemType: l.pointSystemType || 'platform',
      verified: Boolean(l.verified),
      isActive: Boolean(l.isActive),
      createdAt: l.createdAt,
      club: {
        _id: String(l.club?._id || ''),
        name: l.club?.name || '',
        verified: Boolean(l.club?.verified),
      },
    }));

    return success({
      leagues: mapped,
      stats: {
        total,
        verified,
        unverified: Math.max(0, total - verified),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load leagues', 500);
  }
}

export async function adminLeaguesListForClubAction(clubId: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();

    const leagues = await LeagueModel.find({ club: clubId }).sort({ createdAt: -1 });
    const data = leagues.map((league: any) => ({
      _id: String(league._id),
      name: league.name || '',
      description: league.description || '',
      pointSystemType: league.pointSystemType || 'platform',
      verified: Boolean(league.verified),
      isActive: Boolean(league.isActive),
      createdAt: league.createdAt,
      players: Array.isArray(league.players)
        ? league.players.map((p: any) => ({
            playerId: String(p.player),
            totalPoints: Number(p.totalPoints || 0),
            fromTournaments: [],
          }))
        : [],
    }));

    return success({ success: true, data });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load club leagues', 500);
  }
}

export async function adminLeaguesCreateForClubAction(payload: Record<string, unknown>) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();

    const pointRules = (payload.pointRules || {}) as Record<string, unknown>;
    const created = await LeagueModel.create({
      name: String(payload.name || ''),
      description: String(payload.description || ''),
      club: String(payload.clubId || ''),
      createdBy: guard.userId,
      pointSystemType: 'platform',
      pointsConfig: {
        groupDropoutPoints: Number(pointRules.groupDropout || 0),
        knockoutBasePoints: Number(pointRules.firstPlace || 0),
        knockoutMultiplier: Number(pointRules.multiplier || 1),
      },
    });

    return success({ success: true, data: created });
  } catch (error: any) {
    return failure(error?.message || 'Failed to create league', 500);
  }
}

export async function adminLeaguesUpdateAction(leagueId: string, payload: Record<string, unknown>) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();

    const pointRules = (payload.pointRules || {}) as Record<string, unknown>;
    const update: any = {
      name: payload.name,
      description: payload.description,
    };
    if (Object.keys(pointRules).length > 0) {
      update.pointsConfig = {
        groupDropoutPoints: Number(pointRules.groupDropout || 0),
        knockoutBasePoints: Number(pointRules.firstPlace || 0),
        knockoutMultiplier: Number(pointRules.multiplier || 1),
      };
    }

    const updated = await LeagueModel.findByIdAndUpdate(leagueId, update, { new: true });
    if (!updated) return failure('League not found', 404);
    return success({ success: true, data: updated });
  } catch (error: any) {
    return failure(error?.message || 'Failed to update league', 500);
  }
}

export async function adminLeaguesDeleteAction(leagueId: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    await LeagueModel.findByIdAndDelete(leagueId);
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to delete league', 500);
  }
}

export async function adminLeaguesAddPlayerAction(leagueId: string, playerId: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const league = await LeagueModel.findById(leagueId);
    if (!league) return failure('League not found', 404);
    const exists = (league.players || []).some((p: any) => String(p.player) === playerId);
    if (!exists) {
      league.players.push({
        player: playerId as any,
        totalPoints: 0,
        tournamentPoints: [],
        manualAdjustments: [],
      } as any);
      await league.save();
    }
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to add player', 500);
  }
}

export async function adminLeaguesUpdatePlayerPointsAction(
  leagueId: string,
  playerId: string,
  points: number
) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    await LeagueModel.updateOne(
      { _id: leagueId, 'players.player': playerId },
      { $set: { 'players.$.totalPoints': Number(points || 0) } }
    );
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to update player points', 500);
  }
}

export async function adminLeaguesRemovePlayerAction(leagueId: string, playerId: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    await LeagueModel.updateOne({ _id: leagueId }, { $pull: { players: { player: playerId } } });
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to remove player', 500);
  }
}

export async function adminPlayersUpdateProfileAction(
  playerId: string,
  payload: { name?: string; honors?: unknown[] }
) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const update: any = {};
    if (typeof payload.name === 'string') update.name = payload.name;
    if (Array.isArray(payload.honors)) update.honors = payload.honors;
    const player = await PlayerModel.findByIdAndUpdate(playerId, update, { new: true });
    if (!player) return failure('Player not found', 404);
    return success({ success: true, player });
  } catch (error: any) {
    return failure(error?.message || 'Failed to update player profile', 500);
  }
}

export async function adminEmailsListTemplatesAction() {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    const templates = await EmailTemplateService.getAllTemplates();
    return success({ success: true, templates });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load email templates', 500);
  }
}

export async function adminEmailsUpdateTemplateAction(
  templateId: string,
  payload: { subject?: string; htmlContent?: string; textContent?: string; isActive?: boolean }
) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    const updated = await EmailTemplateService.updateTemplate(templateId, payload as any, guard.userId);
    if (!updated) return failure('Template not found', 404);
    return success({ success: true, template: updated });
  } catch (error: any) {
    return failure(error?.message || 'Failed to update template', 500);
  }
}

export async function adminEmailsSendTestAction(templateId: string, recipientEmail: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    const template = await EmailTemplateModel.findById(templateId);
    if (!template) return failure('Template not found', 404);
    await sendEmail({
      to: [recipientEmail],
      subject: template.subject,
      text: template.textContent,
      html: template.htmlContent,
    });
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to send test email', 500);
  }
}

export async function adminEmailsSetActiveAction(templateId: string, isActive: boolean) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    const updated = await EmailTemplateService.updateTemplate(templateId, { isActive } as any, guard.userId);
    if (!updated) return failure('Template not found', 404);
    return success({ success: true, template: updated });
  } catch (error: any) {
    return failure(error?.message || 'Failed to toggle template state', 500);
  }
}

function buildErrorQuery(params: QueryParams) {
  const days = Math.max(1, toInt(params.days, 7));
  const category = String(params.category || 'all');
  const level = String(params.level || 'all');
  const showAuthErrors = toBool(params.showAuthErrors, false);
  const showExpectedErrors = toBool(params.showExpectedErrors, false);
  const schemaVersion = String(params.schemaVersion || 'new');
  const from = new Date(Date.now() - days * DAY_MS);

  const query: any = { timestamp: { $gte: from } };
  if (category !== 'all') query.category = category;
  if (level !== 'all') query.level = level;
  if (!showAuthErrors) query.category = query.category || { $ne: 'auth' };
  if (!showExpectedErrors) query.expected = { $ne: true };

  if (schemaVersion === 'new') {
    query.$or = [
      { errorCode: { $exists: true, $ne: null } },
      { operation: { $exists: true, $ne: null } },
      { requestId: { $exists: true, $ne: null } },
      { errorType: { $exists: true, $ne: null } },
      { expected: { $exists: true } },
    ];
  } else if (schemaVersion === 'legacy') {
    query.$and = [
      {
        $nor: [
          { errorCode: { $exists: true, $ne: null } },
          { operation: { $exists: true, $ne: null } },
          { requestId: { $exists: true, $ne: null } },
          { errorType: { $exists: true, $ne: null } },
        ],
      },
    ];
  }

  return query;
}

export async function adminErrorsStatsAction(params: QueryParams) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const query = buildErrorQuery(params);

    const [totalErrors, recentErrors, categoryAgg, levelAgg, newCount] = await Promise.all([
      LogModel.countDocuments(query),
      LogModel.find(query).sort({ timestamp: -1 }).limit(100),
      LogModel.aggregate([{ $match: query }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      LogModel.aggregate([{ $match: query }, { $group: { _id: '$level', count: { $sum: 1 } } }]),
      LogModel.countDocuments({
        ...query,
        $or: [
          { errorCode: { $exists: true, $ne: null } },
          { operation: { $exists: true, $ne: null } },
          { requestId: { $exists: true, $ne: null } },
          { errorType: { $exists: true, $ne: null } },
          { expected: { $exists: true } },
        ],
      }),
    ]);

    const errorsByCategory = categoryAgg.reduce((acc: Record<string, number>, row: any) => {
      acc[String(row._id || 'unknown')] = Number(row.count || 0);
      return acc;
    }, {});
    const errorsByLevel = levelAgg.reduce((acc: Record<string, number>, row: any) => {
      acc[String(row._id || 'unknown')] = Number(row.count || 0);
      return acc;
    }, {});

    return success({
      totalErrors,
      errorsByCategory,
      errorsByLevel,
      recentErrors,
      structuredCounts: {
        all: totalErrors,
        new: newCount,
        legacy: Math.max(0, totalErrors - newCount),
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load error stats', 500);
  }
}

export async function adminErrorsDailyAction(params: QueryParams) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const query = buildErrorQuery(params);
    const rows = await LogModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            y: { $year: '$timestamp' },
            m: { $month: '$timestamp' },
            d: { $dayOfMonth: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
    ]);

    return success({
      success: true,
      data: rows.map((row: any) => ({
        date: `${row._id.y}-${String(row._id.m).padStart(2, '0')}-${String(row._id.d).padStart(2, '0')}`,
        count: Number(row.count || 0),
      })),
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load daily errors', 500);
  }
}

export async function adminFeedbackListAction(params: QueryParams) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    const result = await FeedbackService.getAllFeedback({
      page: Math.max(1, toInt(params.page, 1)),
      limit: Math.max(1, Math.min(100, toInt(params.limit, 10))),
      search: params.search ? String(params.search) : undefined,
      status: params.status && params.status !== 'all' ? String(params.status) : undefined,
      priority: params.priority && params.priority !== 'all' ? String(params.priority) : undefined,
      category: params.category && params.category !== 'all' ? String(params.category) : undefined,
    });
    return success({ success: true, ...result });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load feedback', 500);
  }
}

export async function adminFeedbackGetByIdAction(id: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    const feedback = await FeedbackService.getFeedbackById(id);
    if (!feedback) return failure('Feedback not found', 404);
    return success({ success: true, feedback });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load feedback detail', 500);
  }
}

export async function adminFeedbackUpdateAction(id: string, payload: Record<string, unknown>) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    const updated = await FeedbackService.updateFeedback(id, payload as any, guard.userId);
    return success({ success: true, feedback: updated });
  } catch (error: any) {
    return failure(error?.message || 'Failed to update feedback', 500);
  }
}

export async function adminFeedbackDeleteAction(id: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await FeedbackService.deleteFeedback(id);
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to delete feedback', 500);
  }
}

export async function adminFeedbackMarkReadAction(id: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    await FeedbackModel.findByIdAndUpdate(id, { isReadByAdmin: true, updatedAt: new Date() });
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to mark feedback read', 500);
  }
}

export async function adminFeedbackReplyAction(id: string, content: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    const updated = await FeedbackService.addMessage(
      id,
      { sender: guard.userId, content, isInternal: false },
      false
    );
    return success({ success: true, data: updated });
  } catch (error: any) {
    return failure(error?.message || 'Failed to reply to feedback', 500);
  }
}

export async function adminTodosListAction() {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    const todos = await TodoService.getAllTodos();
    return success({ todos });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load todos', 500);
  }
}

export async function adminTodosStatsAction() {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    const stats = await TodoService.getTodoStats();
    return success({ stats });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load todo stats', 500);
  }
}

export async function adminTodosCreateAction(payload: Record<string, unknown>) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    const todo = await TodoService.createTodo(guard.userId, {
      title: String(payload.title || ''),
      description: payload.description ? String(payload.description) : undefined,
      priority: payload.priority as any,
      category: payload.category as any,
      assignedTo: payload.assignedTo ? String(payload.assignedTo) : undefined,
      dueDate: payload.dueDate ? new Date(String(payload.dueDate)) : undefined,
      tags: Array.isArray(payload.tags) ? (payload.tags as string[]) : undefined,
      isPublic: typeof payload.isPublic === 'boolean' ? Boolean(payload.isPublic) : true,
    });
    return success({ success: true, todo });
  } catch (error: any) {
    return failure(error?.message || 'Failed to create todo', 500);
  }
}

export async function adminTodosUpdateAction(id: string, payload: Record<string, unknown>) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    const todo = await TodoService.updateTodo(id, guard.userId, {
      ...payload,
      dueDate: payload.dueDate ? new Date(String(payload.dueDate)) : undefined,
    } as any);
    return success({ success: true, todo });
  } catch (error: any) {
    return failure(error?.message || 'Failed to update todo', 500);
  }
}

export async function adminTodosDeleteAction(id: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await TodoService.deleteTodo(id);
    return success({ success: true });
  } catch (error: any) {
    return failure(error?.message || 'Failed to delete todo', 500);
  }
}

export async function adminSettingsGetSystemInfoAction() {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const [users, clubs, tournaments, leagues] = await Promise.all([
      UserModel.estimatedDocumentCount(),
      ClubModel.estimatedDocumentCount(),
      TournamentModel.estimatedDocumentCount(),
      LeagueModel.estimatedDocumentCount(),
    ]);
    const used = process.memoryUsage().heapUsed;
    const total = process.memoryUsage().heapTotal || 1;
    return success({
      version: process.env.npm_package_version || 'unknown',
      uptime: `${Math.floor(process.uptime())}s`,
      memory: {
        used: `${Math.round(used / 1024 / 1024)} MB`,
        total: `${Math.round(total / 1024 / 1024)} MB`,
        percentage: Math.round((used / total) * 100),
      },
      database: {
        status: 'connected',
        collections: 4,
        documents: users + clubs + tournaments + leagues,
      },
      features: {
        subscriptionEnabled: Boolean(process.env.SUBSCRIPTION_ENABLED),
        socketEnabled: Boolean(process.env.SOCKET_SERVER_URL),
        leaguesEnabled: true,
        detailedStatisticsEnabled: true,
      },
      environment: {
        emailUsername: process.env.EMAIL_USER || '',
        nodeEnv: process.env.NODE_ENV || 'development',
        subscriptionEnabled: process.env.SUBSCRIPTION_ENABLED || 'false',
        socketServerUrl: process.env.SOCKET_SERVER_URL || '',
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load system info', 500);
  }
}

export async function adminChartsClubsDailyAction() {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const data = await dailyCountSeries(ClubModel, 'createdAt');
    return success({ success: true, data });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load clubs daily chart', 500);
  }
}

export async function adminChartsTournamentsDailyAction() {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const data = await dailyCountSeries(TournamentModel, 'createdAt');
    return success({ success: true, data });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load tournaments daily chart', 500);
  }
}

export async function adminChartsFeedbackDailyAction() {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const data = await dailyCountSeries(FeedbackModel, 'createdAt');
    return success({ success: true, data });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load feedback daily chart', 500);
  }
}

function buildTelemetryMatch(params: QueryParams) {
  const { startDate, endDate } = resolveDateRange(params);
  const routeKey = String(params.routeKey || '').trim();
  const method = String(params.method || '').toUpperCase();
  const search = String(params.search || '').trim();
  const match: any = {
    bucket: { $gte: startDate, $lte: endDate },
  };
  if (routeKey) match.routeKey = routeKey;
  if (method && method !== 'ALL') match.method = method;
  if (search) match.routeKey = { $regex: escapeRegex(search), $options: 'i' };
  return { match, startDate, endDate };
}

export async function adminTelemetryOverviewAction(params: QueryParams) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const { match, startDate, endDate } = buildTelemetryMatch(params);
    const windowMs = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - windowMs);
    const prevEnd = new Date(startDate.getTime());

    const [rows, prevRows, activeAnomalies, errAgg] = await Promise.all([
      ApiRequestMetricModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: '$count' },
            totalErrors: { $sum: '$errorCount' },
            totalDurationMs: { $sum: '$totalDurationMs' },
            peakLatencyMs: { $max: '$maxDurationMs' },
            totalRequestBytes: { $sum: '$totalRequestBytes' },
            totalResponseBytes: { $sum: '$totalResponseBytes' },
          },
        },
      ]),
      ApiRequestMetricModel.aggregate([
        { $match: { ...match, bucket: { $gte: prevStart, $lte: prevEnd } } },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: '$count' },
            totalErrors: { $sum: '$errorCount' },
            totalDurationMs: { $sum: '$totalDurationMs' },
          },
        },
      ]),
      ApiRouteAnomalyModel.countDocuments({ isActive: true }),
      ApiRequestErrorEventModel.aggregate([
        { $match: { occurredAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            count4xx: { $sum: { $cond: [{ $and: [{ $gte: ['$status', 400] }, { $lt: ['$status', 500] }] }, 1, 0] } },
            count5xx: { $sum: { $cond: [{ $gte: ['$status', 500] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const cur = rows[0] || {};
    const prev = prevRows[0] || {};
    const totalCalls = Number(cur.totalCalls || 0);
    const totalErrors = Number(cur.totalErrors || 0);
    const totalDurationMs = Number(cur.totalDurationMs || 0);
    const totalRequestBytes = Number(cur.totalRequestBytes || 0);
    const totalResponseBytes = Number(cur.totalResponseBytes || 0);
    const errorRate = totalCalls > 0 ? totalErrors / totalCalls : 0;
    const avgLatencyMs = totalCalls > 0 ? totalDurationMs / totalCalls : 0;
    const avgPacketBytes = totalCalls > 0 ? (totalRequestBytes + totalResponseBytes) / totalCalls : 0;
    const baselineCalls = Number(prev.totalCalls || 0);
    const baselineErrors = Number(prev.totalErrors || 0);
    const baselineDuration = Number(prev.totalDurationMs || 0);
    const baselineErrorRate = baselineCalls > 0 ? baselineErrors / baselineCalls : 0;
    const baselineAvgLatencyMs = baselineCalls > 0 ? baselineDuration / baselineCalls : 0;

    const status =
      errorRate > 0.12 || avgLatencyMs > 900 ? 'critical' : errorRate > 0.05 || avgLatencyMs > 450 ? 'degraded' : 'healthy';
    const incident = errAgg[0] || {};

    return success({
      data: {
        status,
        kpis: {
          totalCalls,
          totalErrors,
          errorRate,
          avgLatencyMs,
          peakLatencyMs: Number(cur.peakLatencyMs || 0),
          totalRequestBytes,
          totalResponseBytes,
          totalMovedBytes: totalRequestBytes + totalResponseBytes,
          avgPacketBytes,
          baselineAvgLatencyMs,
          baselineErrorRate,
        },
        incidents: {
          activeAnomalies,
          count4xx: Number(incident.count4xx || 0),
          count5xx: Number(incident.count5xx || 0),
        },
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load telemetry overview', 500);
  }
}

export async function adminTelemetryTrendsAction(params: QueryParams) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const { match } = buildTelemetryMatch(params);
    const granularity = String(params.granularity || 'hour');
    const tz = String(params.tz || 'UTC');
    const unit = granularity === 'day' ? 'day' : granularity === 'minute' ? 'minute' : 'hour';

    const rows = await ApiRequestMetricModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: '$bucket',
              unit,
              timezone: tz,
            },
          },
          calls: { $sum: '$count' },
          errors: { $sum: '$errorCount' },
          duration: { $sum: '$totalDurationMs' },
          requestBytes: { $sum: '$totalRequestBytes' },
          responseBytes: { $sum: '$totalResponseBytes' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const points = rows.map((row: any) => {
      const calls = Number(row.calls || 0);
      const errors = Number(row.errors || 0);
      const requestBytes = Number(row.requestBytes || 0);
      const responseBytes = Number(row.responseBytes || 0);
      return {
        label: new Date(row._id).toLocaleString('hu-HU', { hour12: false }),
        calls,
        baselineCalls: 0,
        errors,
        errorRate: calls > 0 ? errors / calls : 0,
        avgLatencyMs: calls > 0 ? Number(row.duration || 0) / calls : 0,
        baselineLatencyMs: 0,
        requestBytes,
        responseBytes,
        totalBytes: requestBytes + responseBytes,
        avgPacketBytes: calls > 0 ? (requestBytes + responseBytes) / calls : 0,
      };
    });

    return success({ data: { points } });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load telemetry trends', 500);
  }
}

export async function adminTelemetryIncidentsAction(params: QueryParams) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const { startDate, endDate } = resolveDateRange(params);
    const [anomalies, errors] = await Promise.all([
      ApiRouteAnomalyModel.find({ isActive: true }).sort({ ratio: -1, lastObservedAt: -1 }).limit(100),
      ApiRequestErrorEventModel.find({ occurredAt: { $gte: startDate, $lte: endDate } })
        .sort({ occurredAt: -1 })
        .limit(200),
    ]);

    return success({
      data: {
        anomalies: anomalies.map((a: any) => ({
          routeKey: a.routeKey,
          method: a.method,
          signal: a.signal,
          ratio: Number(a.ratio || 0),
          currentValue: Number(a.currentValue || 0),
          baselineValue: Number(a.baselineValue || 0),
          lastDetectedAt: a.lastDetectedAt,
        })),
        errors: errors.map((e: any) => ({
          id: String(e._id),
          occurredAt: e.occurredAt,
          routeKey: e.routeKey,
          method: e.method,
          status: Number(e.status || 0),
          durationMs: Number(e.durationMs || 0),
          requestBytes: Number(e.requestBytes || 0),
          responseBytes: Number(e.responseBytes || 0),
          source: e.source || '',
          errorMessage: e.errorMessage || '',
        })),
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load telemetry incidents', 500);
  }
}

export async function adminTelemetryRoutesAction(params: QueryParams) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const { match } = buildTelemetryMatch(params);
    const page = Math.max(1, toInt(params.page, 1));
    const limit = Math.max(1, Math.min(100, toInt(params.limit, 20)));
    const sortBy = String(params.sortBy || 'errors');
    const sortDir = String(params.sortDir || 'desc') === 'asc' ? 1 : -1;
    const onlyProblematic = toBool(params.onlyProblematic, false);

    const grouped = await ApiRequestMetricModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: { routeKey: '$routeKey', method: '$method' },
          totalCalls: { $sum: '$count' },
          totalErrors: { $sum: '$errorCount' },
          totalDurationMs: { $sum: '$totalDurationMs' },
          maxDurationMs: { $max: '$maxDurationMs' },
          totalRequestBytes: { $sum: '$totalRequestBytes' },
          totalResponseBytes: { $sum: '$totalResponseBytes' },
          lastSeen: { $max: '$bucket' },
        },
      },
    ]);

    let rows = grouped.map((row: any) => {
      const totalCalls = Number(row.totalCalls || 0);
      const totalErrors = Number(row.totalErrors || 0);
      const totalRequestBytes = Number(row.totalRequestBytes || 0);
      const totalResponseBytes = Number(row.totalResponseBytes || 0);
      const totalTrafficBytes = totalRequestBytes + totalResponseBytes;
      return {
        routeKey: row._id.routeKey,
        method: row._id.method,
        totalCalls,
        totalErrors,
        errorRate: totalCalls > 0 ? totalErrors / totalCalls : 0,
        avgLatencyMs: totalCalls > 0 ? Number(row.totalDurationMs || 0) / totalCalls : 0,
        totalRequestBytes,
        totalResponseBytes,
        totalTrafficBytes,
        avgPacketBytes: totalCalls > 0 ? totalTrafficBytes / totalCalls : 0,
        baselineAvgLatencyMs: 0,
        latencyRatio: 0,
        baselineErrorRate: 0,
        errorRateRatio: 0,
        avgIncomingPacketBytes: totalCalls > 0 ? totalRequestBytes / totalCalls : 0,
        avgOutgoingPacketBytes: totalCalls > 0 ? totalResponseBytes / totalCalls : 0,
        lastSeen: row.lastSeen,
      };
    });

    if (onlyProblematic) {
      rows = rows.filter((r: any) => r.errorRate > 0.02 || r.avgLatencyMs > 400 || r.avgPacketBytes > 512 * 1024);
    }

    const sortKeyMap: Record<string, string> = {
      route: 'routeKey',
      calls: 'totalCalls',
      errors: 'totalErrors',
      errorrate: 'errorRate',
      latency: 'avgLatencyMs',
      traffic: 'totalTrafficBytes',
      lastseen: 'lastSeen',
    };
    const sortField = sortKeyMap[String(sortBy).toLowerCase()] || 'totalErrors';
    rows.sort((a: any, b: any) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av === bv) return 0;
      return av > bv ? sortDir : -sortDir;
    });

    const total = rows.length;
    const paged = rows.slice((page - 1) * limit, page * limit);

    const insights = {
      highBaselineLatency: rows.filter((r: any) => r.avgLatencyMs > 600).slice(0, 10),
      latencyRegressed: rows.filter((r: any) => r.avgLatencyMs > 400 && r.totalCalls > 30).slice(0, 10),
      largestIncomingPackets: [...rows].sort((a: any, b: any) => b.avgIncomingPacketBytes - a.avgIncomingPacketBytes).slice(0, 10),
      largestOutgoingPackets: [...rows].sort((a: any, b: any) => b.avgOutgoingPacketBytes - a.avgOutgoingPacketBytes).slice(0, 10),
      risingErrorRate: rows.filter((r: any) => r.errorRate > 0.03).slice(0, 10),
    };

    return success({
      data: paged,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      insights,
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load telemetry routes', 500);
  }
}

function parseMaybeJson(body: string | undefined) {
  if (!body) return { value: null, parseError: false };
  try {
    return { value: JSON.parse(body), parseError: false };
  } catch {
    return { value: body, parseError: true };
  }
}

export async function adminTelemetryRouteDetailsAction(params: QueryParams) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const routeKey = String(params.routeKey || '').trim();
    const method = String(params.method || '').toUpperCase();
    if (!routeKey || !method) return failure('routeKey and method are required', 400);
    const { startDate, endDate } = resolveDateRange(params);
    const granularity = String(params.granularity || 'hour');
    const tz = String(params.tz || 'UTC');
    const unit = granularity === 'day' ? 'day' : granularity === 'minute' ? 'minute' : 'hour';

    const [summaryRows, trendRows, recentErrors, selected] = await Promise.all([
      ApiRequestMetricModel.aggregate([
        { $match: { routeKey, method, bucket: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: '$count' },
            totalErrors: { $sum: '$errorCount' },
            totalDurationMs: { $sum: '$totalDurationMs' },
            maxLatencyMs: { $max: '$maxDurationMs' },
            totalRequestBytes: { $sum: '$totalRequestBytes' },
            totalResponseBytes: { $sum: '$totalResponseBytes' },
          },
        },
      ]),
      ApiRequestMetricModel.aggregate([
        { $match: { routeKey, method, bucket: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: {
              $dateTrunc: {
                date: '$bucket',
                unit,
                timezone: tz,
              },
            },
            calls: { $sum: '$count' },
            errors: { $sum: '$errorCount' },
            duration: { $sum: '$totalDurationMs' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ApiRequestErrorEventModel.find({
        routeKey,
        method,
        occurredAt: { $gte: startDate, $lte: endDate },
      })
        .sort({ occurredAt: -1 })
        .limit(100),
      params.errorId ? ApiRequestErrorEventModel.findById(String(params.errorId)) : Promise.resolve(null),
    ]);

    const sum = summaryRows[0] || {};
    const totalCalls = Number(sum.totalCalls || 0);
    const totalErrors = Number(sum.totalErrors || 0);
    const totalTrafficBytes = Number(sum.totalRequestBytes || 0) + Number(sum.totalResponseBytes || 0);

    const trend = trendRows.map((row: any) => ({
      label: new Date(row._id).toLocaleString('hu-HU', { hour12: false }),
      calls: Number(row.calls || 0),
      errors: Number(row.errors || 0),
      avgLatencyMs: Number(row.calls || 0) > 0 ? Number(row.duration || 0) / Number(row.calls || 0) : 0,
    }));

    const recent = recentErrors.map((e: any) => ({
      id: String(e._id),
      occurredAt: e.occurredAt,
      method: e.method,
      routeKey: e.routeKey,
      status: Number(e.status || 0),
      durationMs: Number(e.durationMs || 0),
      requestBytes: Number(e.requestBytes || 0),
      responseBytes: Number(e.responseBytes || 0),
      source: e.source || '',
      errorMessage: e.errorMessage || '',
    }));

    const selectedError = selected
      ? (() => {
          const parsedReq = parseMaybeJson(selected.requestBody);
          const parsedRes = parseMaybeJson(selected.responseBody);
          return {
            id: String(selected._id),
            occurredAt: selected.occurredAt,
            routeKey: selected.routeKey,
            method: selected.method,
            status: selected.status,
            source: selected.source,
            durationMs: Number(selected.durationMs || 0),
            requestBytes: Number(selected.requestBytes || 0),
            responseBytes: Number(selected.responseBytes || 0),
            request: {
              headers: selected.requestHeaders || {},
              query: selected.requestQuery || {},
              body: parsedReq.value,
              bodyTruncated: Boolean(selected.requestBodyTruncated),
              bodyParseError: parsedReq.parseError,
              contentType: selected.contentType || null,
            },
            response: {
              headers: selected.responseHeaders || {},
              body: parsedRes.value,
              bodyTruncated: Boolean(selected.responseBodyTruncated),
              bodyParseError: parsedRes.parseError,
              errorMessage: selected.errorMessage || null,
            },
          };
        })()
      : null;

    return success({
      data: {
        routeKey,
        method,
        summary: {
          totalCalls,
          baselineCalls: 0,
          totalErrors,
          errorRate: totalCalls > 0 ? totalErrors / totalCalls : 0,
          baselineErrorRate: 0,
          avgLatencyMs: totalCalls > 0 ? Number(sum.totalDurationMs || 0) / totalCalls : 0,
          baselineAvgLatencyMs: 0,
          maxLatencyMs: Number(sum.maxLatencyMs || 0),
          totalTrafficBytes,
          avgPacketBytes: totalCalls > 0 ? totalTrafficBytes / totalCalls : 0,
          baselineAvgPacketBytes: 0,
        },
        trend,
        recentErrors: recent,
        selectedError,
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to load route details', 500);
  }
}

export async function adminTelemetryErrorResetsAction(payload: Record<string, unknown>) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();

    const routesRaw = Array.isArray(payload.routes)
      ? payload.routes
      : payload.routeKey
        ? [{ routeKey: payload.routeKey, method: payload.method }]
        : [];

    const routes = routesRaw
      .map((r: any) => ({
        routeKey: String(r.routeKey || '').trim(),
        method: String(r.method || 'ALL').toUpperCase(),
      }))
      .filter((r: any) => r.routeKey);

    if (routes.length === 0) {
      return failure('No routes supplied', 400);
    }

    let resolved = 0;
    for (const route of routes) {
      const errorMatch: any = { routeKey: route.routeKey, isResolved: false };
      const anomalyMatch: any = { routeKey: route.routeKey, isActive: true };
      if (route.method !== 'ALL') {
        errorMatch.method = route.method;
        anomalyMatch.method = route.method;
      }
      const res = await ApiRequestErrorEventModel.updateMany(errorMatch, {
        $set: { isResolved: true, resolvedAt: new Date() },
      });
      resolved += Number((res as any).modifiedCount || 0);
      await ApiRouteAnomalyModel.updateMany(anomalyMatch, {
        $set: { isActive: false, lastObservedAt: new Date() },
      });
    }

    return success({
      success: true,
      data: {
        totalRoutesProcessed: routes.length,
        totalResolvedCount: resolved,
      },
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to reset telemetry errors', 500);
  }
}

export async function adminTelemetryExportAction(params: QueryParams) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    const [overview, incidents, routes] = await Promise.all([
      adminTelemetryOverviewAction(params),
      adminTelemetryIncidentsAction(params),
      adminTelemetryRoutesAction({ ...params, page: 1, limit: 200 }),
    ]);
    const overviewData = (overview as any)?.data ?? null;
    const incidentsData = (incidents as any)?.data ?? null;
    const routesData = (routes as any)?.data ?? null;

    return success({
      success: true,
      mode: String(params.mode || 'default'),
      generatedAt: new Date().toISOString(),
      filters: params,
      overview: overviewData,
      incidents: incidentsData,
      routes: routesData,
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to export telemetry snapshot', 500);
  }
}

export async function adminYearWrapWrapAction(year: number, confirm: string) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    if (!confirm || !String(confirm).trim()) {
      return failure('Confirmation is required', 400);
    }
    const result = await YearWrapService.performYearlyReset(year);
    return success({ success: true, ...result });
  } catch (error: any) {
    return failure(error?.message || 'Failed to perform year wrap', 500);
  }
}

export async function adminYearWrapRestoreAction(year: number) {
  try {
    const guard = await assertGlobalAdmin();
    if ('error' in guard) return guard.error;
    await connectMongo();
    const players = await PlayerModel.find({ 'previousSeasons.year': year });
    let restored = 0;
    for (const player of players as any[]) {
      const season = (player.previousSeasons || []).find((s: any) => Number(s.year) === Number(year));
      if (!season) continue;
      player.stats = season.stats;
      if (Array.isArray(season.tournamentHistory) && season.tournamentHistory.length > 0) {
        const current = Array.isArray(player.tournamentHistory) ? player.tournamentHistory : [];
        player.tournamentHistory = [...season.tournamentHistory, ...current];
      }
      player.previousSeasons = (player.previousSeasons || []).filter((s: any) => Number(s.year) !== Number(year));
      await player.save();
      restored += 1;
    }
    return success({
      success: true,
      message: `Restored ${restored} player records for ${year}.`,
      restored,
    });
  } catch (error: any) {
    return failure(error?.message || 'Failed to restore year stats', 500);
  }
}
