'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { TournamentService } from '@/database/services/tournament.service';
import { MatchModel } from '@/database/models/match.model';
import { PlayerService } from '@/database/services/player.service';
import { UserModel } from '@/database/models/user.model';
import { TeamInvitationService } from '@/database/services/teaminvitation.service';
import { EmailTemplateService } from '@/database/services/emailtemplate.service';
import { sendEmail } from '@/lib/mailer';
import {
  normalizeEmailLocale,
  renderMinimalEmailLayout,
  textToEmailHtml,
} from '@/lib/email-layout';
import { findUserByEmail, pushWaitingListEntry } from '@/features/tournaments/lib/tournamentPlayers.db';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';

const codeSchema = z.object({
  code: z.string().min(1),
});

const playerPayloadSchema = z.object({
  code: z.string().min(1),
  playerId: z.string().optional(),
  userRef: z.string().optional(),
  name: z.string().optional(),
});

const teamRegistrationMemberSchema = z.object({
  userRef: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
});

const registerTeamSchema = z.object({
  code: z.string().min(1),
  teamName: z.string().min(1),
  members: z.array(teamRegistrationMemberSchema).min(1),
  partnerEmail: z.string().optional(),
  isModeratorMode: z.boolean().optional(),
});

function revalidateTournamentRosterTags(code: string) {
  revalidateTag(`tournament:${code}`, 'max');
  revalidateTag(`tournament:stable:${code}`, 'max');
  revalidateTag(`tournament:volatile:${code}`, 'max');
}

export async function addTournamentPlayerClientAction(
  input: z.infer<typeof playerPayloadSchema>
) {
  const run = withTelemetry(
    'tournaments.roster.addPlayer',
    async (payload: z.infer<typeof playerPayloadSchema>) => {
      const parsed = playerPayloadSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      const userId = authResult.data.userId;
      let targetPlayerId = parsed.playerId;

      if (!targetPlayerId) {
        if (parsed.userRef && parsed.name) {
          const p = await PlayerService.findOrCreatePlayerByUserRef(
            parsed.userRef,
            parsed.name
          );
          targetPlayerId = p._id.toString();
        } else if (parsed.name) {
          const p = await PlayerService.findOrCreatePlayerByName(parsed.name);
          targetPlayerId = p._id.toString();
        } else {
          const p = await PlayerService.findPlayerByUserId(userId);
          if (!p) throw new Error('Player not found');
          targetPlayerId = p._id.toString();
        }
      }

      if (!targetPlayerId) {
        throw new Error('Player resolution failed');
      }
      await TournamentService.addTournamentPlayer(parsed.code, targetPlayerId);
      revalidateTournamentRosterTags(parsed.code);
      revalidateTag('home:tournaments', 'max');
      return serializeForClient({ success: true, playerId: targetPlayerId });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'addTournamentPlayerClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function registerTeamForTournamentClientAction(input: {
  code: string;
  teamName: string;
  members: Array<{ userRef?: string; name?: string; email?: string }>;
  partnerEmail?: string;
  isModeratorMode?: boolean;
}) {
  const run = withTelemetry(
    'tournaments.roster.registerTeam',
    async (payload: {
      code: string;
      teamName: string;
      members: Array<{ userRef?: string; name?: string; email?: string }>;
      partnerEmail?: string;
      isModeratorMode?: boolean;
    }) => {
      const parsed = registerTeamSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      const userId = authResult.data.userId;
      const [user, tournament] = await Promise.all([
        UserModel.findById(userId),
        TournamentService.getTournament(parsed.code),
      ]);
      if (!user) throw new Error('User not found');
      if (!tournament) throw new Error('Tournament not found');

      const clubId =
        (tournament as any)?.clubId?._id?.toString?.() || (tournament as any)?.clubId?.toString?.();
      const canModerate = clubId
        ? await (await import('@/database/services/authorization.service')).AuthorizationService.checkAdminOrModerator(
            userId,
            clubId
          )
        : false;

      if (parsed.isModeratorMode && !canModerate) {
        throw new Error('Only moderators can register a team for others');
      }

      const memberInputs = [...parsed.members];
      const hasSelfMember = memberInputs.some((m) => m.userRef === userId);
      if (!parsed.isModeratorMode && !hasSelfMember) {
        memberInputs.unshift({
          userRef: userId,
          name: user.name || user.username || 'Player',
        });
      }

      const memberPlayers: Array<{ _id: string; userRef?: string | null; name?: string }> = [];
      for (const member of memberInputs) {
        if (member.userRef && member.name) {
          const player = await PlayerService.findOrCreatePlayerByUserRef(member.userRef, member.name);
          memberPlayers.push({
            _id: player._id.toString(),
            userRef: player.userRef?.toString?.() || null,
            name: player.name,
          });
          continue;
        }

        if (member.email && member.name) {
          const existingUser = await findUserByEmail(member.email.toLowerCase().trim());
          if (existingUser) {
            const player = await PlayerService.findOrCreatePlayerByUserRef(
              existingUser._id.toString(),
              existingUser.name || member.name
            );
            memberPlayers.push({
              _id: player._id.toString(),
              userRef: player.userRef?.toString?.() || null,
              name: player.name,
            });
          } else {
            const player = await PlayerService.findOrCreatePlayerByName(member.name);
            memberPlayers.push({
              _id: player._id.toString(),
              userRef: player.userRef?.toString?.() || null,
              name: player.name,
            });
          }
          continue;
        }

        if (member.name) {
          const player = await PlayerService.findOrCreatePlayerByName(member.name);
          memberPlayers.push({
            _id: player._id.toString(),
            userRef: player.userRef?.toString?.() || null,
            name: player.name,
          });
          continue;
        }
      }

      const uniqueMembers = Array.from(new Set(memberPlayers.map((m) => m._id)));
      if (uniqueMembers.length < 2) {
        throw new Error('Team registration requires two members');
      }

      const teamPlayer = await PlayerService.findOrCreateTeam(
        parsed.teamName,
        uniqueMembers[0],
        uniqueMembers[1]
      );

      const selfMember = memberPlayers.find((m) => m.userRef === userId);
      const partnerMember = memberPlayers.find((m) => m.userRef && m.userRef !== userId);
      const partnerEmail = parsed.partnerEmail?.toLowerCase().trim() || null;
      const tournamentName = (tournament as any)?.tournamentSettings?.name || 'Tournament';

      if (selfMember && (partnerMember || partnerEmail)) {
        const partnerUser = partnerMember?.userRef
          ? await UserModel.findById(partnerMember.userRef)
          : partnerEmail
            ? await findUserByEmail(partnerEmail)
            : null;
        const inviteeId = partnerUser?._id?.toString() || partnerMember?.userRef || undefined;
        const inviteeEmail = (partnerUser?.email || partnerEmail || '').toLowerCase();

        if (inviteeEmail) {
          const invitation = await TeamInvitationService.createInvitation(
            (tournament as any)._id.toString(),
            teamPlayer._id.toString(),
            userId,
            inviteeId,
            inviteeEmail
          );

          const acceptUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invitations/${invitation.token}`;
          const declineUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invitations/${invitation.token}?action=decline`;
          const locale = normalizeEmailLocale(partnerUser?.locale || user.locale || 'hu');
          const template = await EmailTemplateService.getRenderedTemplate(
            'team_invitation',
            {
              inviterName: user.name || user.username || 'Player',
              inviteeName: partnerUser?.name || inviteeEmail.split('@')[0],
              teamName: parsed.teamName,
              tournamentName,
              tournamentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/tournaments/${parsed.code}`,
              acceptUrl,
              declineUrl,
              currentYear: new Date().getFullYear(),
            },
            { locale }
          );

          const fallbackText =
            locale === 'en'
              ? `${user.name || user.username} invited you to "${parsed.teamName}" for ${tournamentName}.\n\nAccept: ${acceptUrl}\nDecline: ${declineUrl}`
              : `${user.name || user.username} meghivott a(z) "${parsed.teamName}" csapatba (${tournamentName}).\n\nElfogadas: ${acceptUrl}\nElutasitas: ${declineUrl}`;

          await Promise.allSettled([
            sendEmail({
              to: [inviteeEmail],
              subject:
                template?.subject ||
                (locale === 'en'
                  ? `Team invitation - ${tournamentName}`
                  : `Csapat meghivo - ${tournamentName}`),
              text: template?.text || fallbackText,
              html:
                template?.html ||
                renderMinimalEmailLayout({
                  locale,
                  title: tournamentName,
                  heading: locale === 'en' ? 'Team invitation' : 'Csapat meghivo',
                  bodyHtml: textToEmailHtml(fallbackText),
                }),
            }),
            pushWaitingListEntry(parsed.code, teamPlayer._id.toString(), 'Waiting for partner confirmation'),
          ]);

          return {
            success: true,
            playerId: teamPlayer._id.toString(),
            message: 'waiting_for_partner',
            note: 'Invitation sent to partner',
          };
        }
      }

      await TournamentService.addTournamentPlayer(parsed.code, teamPlayer._id.toString());
      revalidateTournamentRosterTags(parsed.code);
      return {
        success: true,
        playerId: teamPlayer._id.toString(),
      };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'registerTeamForTournamentClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function removeTournamentPlayerClientAction(input: {
  code: string;
  playerId: string;
}) {
  const run = withTelemetry(
    'tournaments.roster.removePlayer',
    async (payload: { code: string; playerId: string }) => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const parsed = z
        .object({ code: z.string().min(1), playerId: z.string().min(1) })
        .parse(payload);
      await TournamentService.removeTournamentPlayer(parsed.code, parsed.playerId);
      revalidateTournamentRosterTags(parsed.code);
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'tournaments',
        actionName: 'removeTournamentPlayerClient',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function updateTournamentPlayerStatusClientAction(input: {
  code: string;
  playerId: string;
  status: string;
}) {
  const run = withTelemetry(
    'tournaments.roster.updateStatus',
    async (payload: { code: string; playerId: string; status: string }) => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const parsed = z
        .object({
          code: z.string().min(1),
          playerId: z.string().min(1),
          status: z.string().min(1),
        })
        .parse(payload);
      await TournamentService.updateTournamentPlayerStatus(
        parsed.code,
        parsed.playerId,
        parsed.status
      );
      revalidateTournamentRosterTags(parsed.code);
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'tournaments',
        actionName: 'updateTournamentPlayerStatusClient',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function addToWaitingListClientAction(input: {
  code: string;
  playerId?: string;
  userRef?: string;
  name?: string;
}) {
  const run = withTelemetry(
    'tournaments.waitlist.add',
    async (payload: {
      code: string;
      playerId?: string;
      userRef?: string;
      name?: string;
    }) => {
      const parsed = playerPayloadSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const result = await TournamentService.addToWaitingList(
        parsed.code,
        authResult.data.userId,
        {
          playerId: parsed.playerId,
          userRef: parsed.userRef,
          name: parsed.name,
        }
      );
      revalidateTournamentRosterTags(parsed.code);
      return serializeForClient({ success: true, ...result });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'addToWaitingListClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function removeFromWaitingListClientAction(input: {
  code: string;
  playerId: string;
}) {
  const run = withTelemetry(
    'tournaments.waitlist.remove',
    async (payload: { code: string; playerId: string }) => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const parsed = z
        .object({ code: z.string().min(1), playerId: z.string().min(1) })
        .parse(payload);
      await TournamentService.removeFromWaitingList(
        parsed.code,
        authResult.data.userId,
        parsed.playerId
      );
      revalidateTournamentRosterTags(parsed.code);
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'tournaments',
        actionName: 'removeFromWaitingListClient',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function promoteFromWaitingListClientAction(input: {
  code: string;
  playerId: string;
}) {
  const run = withTelemetry(
    'tournaments.waitlist.promote',
    async (payload: { code: string; playerId: string }) => {
      const parsed = z
        .object({ code: z.string().min(1), playerId: z.string().min(1) })
        .parse(payload);
      await TournamentService.promoteFromWaitingList(parsed.code, parsed.playerId);
      revalidateTournamentRosterTags(parsed.code);
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'tournaments',
        actionName: 'promoteFromWaitingListClient',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function subscribeToTournamentNotificationsClientAction(input: {
  code: string;
}) {
  const run = withTelemetry(
    'tournaments.notifications.subscribe',
    async (payload: { code: string }) => {
      const parsed = codeSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const user = await UserModel.findById(authResult.data.userId).select('email');
      const email = user?.email || '';
      if (!email) throw new Error('No email found for user');
      await TournamentService.subscribeToNotifications(
        parsed.code,
        authResult.data.userId,
        email
      );
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'tournaments',
        actionName: 'subscribeToTournamentNotificationsClient',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function unsubscribeFromTournamentNotificationsClientAction(input: {
  code: string;
}) {
  const run = withTelemetry(
    'tournaments.notifications.unsubscribe',
    async (payload: { code: string }) => {
      const parsed = codeSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      await TournamentService.unsubscribeFromNotifications(
        parsed.code,
        authResult.data.userId
      );
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'tournaments',
        actionName: 'unsubscribeFromTournamentNotificationsClient',
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getMatchByIdClientAction(input: { matchId: string }) {
  const run = withTelemetry(
    'matches.getById',
    async (payload: { matchId: string }) => {
      const matchId = z.string().min(1).parse(payload.matchId);
      const match = await MatchModel.findById(matchId)
        .populate('player1.playerId', 'name')
        .populate('player2.playerId', 'name')
        .populate('legs.winnerId', 'name')
        .populate('tournamentRef', 'clubId tournamentId tournamentSettings');
      return serializeForClient({ success: true, match });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'matches', actionName: 'getMatchByIdClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getMatchLegsClientAction(input: { matchId: string }) {
  const run = withTelemetry(
    'matches.getLegs',
    async (payload: { matchId: string }) => {
      const matchId = z.string().min(1).parse(payload.matchId);
      const match = await MatchModel.findById(matchId)
        .populate('legs.winnerId', 'name')
        .populate('player1.playerId', 'name')
        .populate('player2.playerId', 'name')
        .populate('tournamentRef', 'clubId tournamentId tournamentSettings');
      return serializeForClient({
        success: true,
        match,
        legs: match?.legs || [],
      });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'matches', actionName: 'getMatchLegsClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getTournamentPlayerMatchesClientAction(input: {
  code: string;
  playerId: string;
}) {
  const run = withTelemetry(
    'tournaments.playerMatches.get',
    async (payload: { code: string; playerId: string }) => {
      const parsed = z
        .object({ code: z.string().min(1), playerId: z.string().min(1) })
        .parse(payload);

      const tournament = await TournamentService.getTournament(parsed.code);
      if (!tournament || !(tournament as any)._id) {
        return { success: true, matches: [] };
      }

      const matches = await MatchModel.find({
        tournamentRef: (tournament as any)._id,
        $or: [{ 'player1.playerId': parsed.playerId }, { 'player2.playerId': parsed.playerId }],
      })
        .populate('player1.playerId', 'name')
        .populate('player2.playerId', 'name')
        .sort({ createdAt: -1 });

      const mapped = matches.map((match: any) => {
        const p1Id = String(match?.player1?.playerId?._id || match?.player1?.playerId || '');
        const isPlayer1 = p1Id === parsed.playerId;
        const playerData = isPlayer1 ? match.player1 : match.player2;
        const matchObj = match.toObject ? match.toObject() : match;
        return {
          ...matchObj,
          average: playerData?.average || 0,
          firstNineAvg: playerData?.firstNineAvg || 0,
          checkout: playerData?.highestCheckout ? String(playerData.highestCheckout) : undefined,
          status: match.status || 'pending',
          winnerId: match.winnerId ? String(match.winnerId) : undefined,
        };
      });

      return serializeForClient({ success: true, matches: mapped });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'getTournamentPlayerMatchesClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getTournamentHeadToHeadClientAction(input: {
  code: string;
  opponentId: string;
}) {
  const run = withTelemetry(
    'tournaments.headToHead.get',
    async (payload: { code: string; opponentId: string }) => {
      const parsed = z
        .object({ code: z.string().min(1), opponentId: z.string().min(1) })
        .parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const currentPlayer = await PlayerService.findPlayerByUserId(authResult.data.userId);
      if (!currentPlayer) throw new Error('Current player not found');
      const data = await TournamentService.getHeadToHead(
        currentPlayer._id.toString(),
        parsed.opponentId,
        { tournamentCode: parsed.code }
      );
      return serializeForClient({ success: true, data });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'getTournamentHeadToHeadClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function getTournamentLiveMatchesClientAction(input: { code: string }) {
  const run = withTelemetry(
    'tournaments.liveMatches.get',
    async (payload: { code: string }) => {
      const parsed = codeSchema.parse(payload);
      const matches = await TournamentService.getLiveMatches(parsed.code);
      return serializeForClient({ success: true, matches });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'getTournamentLiveMatchesClient' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
