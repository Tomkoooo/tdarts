'use server';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { TournamentService } from '@/database/services/tournament.service';
import { PlayerService } from '@/database/services/player.service';
import { AuthService } from '@/database/services/auth.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { TeamInvitationService } from '@/database/services/teaminvitation.service';
import { EmailTemplateService } from '@/database/services/emailtemplate.service';
import { sendEmail } from '@/lib/mailer';
import { normalizeEmailLocale, renderMinimalEmailLayout, textToEmailHtml } from '@/lib/email-layout';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { GuardFailureResult } from '@/shared/lib/telemetry/types';
import {
  findPlayerById,
  findPlayersByIds,
  findPlayerWithRelations,
  findTournamentForAuth,
  findTournamentForInvitation,
  findUserByEmail,
  findUserById,
  pushWaitingListEntry,
} from '@/features/tournaments/lib/tournamentPlayers.db';

const tournamentMemberSchema = z.object({
  playerId: z.string().optional(),
  _id: z.string().optional(),
  userRef: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
});

const addTournamentPlayerBodySchema = z.object({
  playerId: z.string().optional(),
  userRef: z.string().optional(),
  name: z.string().optional(),
  members: z.array(tournamentMemberSchema).optional(),
  partnerEmail: z.string().optional(),
});

const updateTournamentPlayerStatusBodySchema = z.object({
  playerId: z.string().min(1),
  status: z.string().min(1),
});

const removeTournamentPlayerBodySchema = z.object({
  playerId: z.string().min(1),
});

type TournamentMemberInput = z.infer<typeof tournamentMemberSchema>;

function unauthorized(message: string, status: 401 | 403 = 401): GuardFailureResult {
  return {
    ok: false,
    code: 'UNAUTHORIZED',
    status,
    message,
  };
}

async function getAuthContext(code: string, token: string) {
  const user = await AuthService.verifyToken(token);
  const tournament = await findTournamentForAuth(code);
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  const canModerate = await AuthorizationService.checkAdminOrModerator(user._id.toString(), tournament.clubId.toString());
  return { user, tournament, canModerate };
}

async function isSelfPlayer(userId: string, playerId: string): Promise<boolean> {
  const player = await findPlayerWithRelations(playerId);
  if (!player) return false;

  if (player.userRef?.toString() === userId) return true;
  if (Array.isArray(player.members) && player.members.length > 0) {
    const memberPlayers = await findPlayersByIds(player.members);
    if (memberPlayers.some((member) => member.userRef?.toString() === userId)) return true;
  }
  return false;
}

export async function getTournamentPlayerAction(input: { request: NextRequest }) {
  const run = withTelemetry(
    'tournaments.players.getByCurrentUser',
    async (payload: { request: NextRequest }) => {
      const authResult = await authorizeUserResult({ request: payload.request });
      if (!authResult.ok) {
        return authResult;
      }

      const eligibilityResult = await assertEligibilityResult({ allowPaidOverride: true });
      if (!eligibilityResult.ok) {
        return eligibilityResult;
      }

      const player = await PlayerService.findPlayerByUserId(authResult.data.userId);
      if (!player) {
        throw new Error('Player not found');
      }
      return player._id;
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'getTournamentPlayer' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}

export async function addTournamentPlayerAction(input: { request: NextRequest; code: string }) {
  const run = withTelemetry(
    'tournaments.players.add',
    async (payload: { request: NextRequest; code: string }) => {
      const authResult = await authorizeUserResult({ request: payload.request });
      if (!authResult.ok) {
        return authResult;
      }
      const token = payload.request.cookies.get('token')?.value;
      if (!token) {
        return unauthorized('Unauthorized', 401);
      }

      const { user, canModerate, tournament } = await getAuthContext(payload.code, token);
      const eligibilityResult = await assertEligibilityResult({
        featureName: 'PREMIUM_TOURNAMENTS',
        clubId: tournament.clubId?.toString(),
        allowPaidOverride: true,
      });
      if (!eligibilityResult.ok) {
        return eligibilityResult;
      }

      const parsedBody = addTournamentPlayerBodySchema.parse(await payload.request.json());
      const { playerId, userRef, name, members, partnerEmail } = parsedBody;
      let player: Awaited<ReturnType<typeof findPlayerById>> | null = null;

      const mode = tournament?.tournamentSettings?.participationMode || 'individual';

      if (mode === 'individual') {
        const isSelfRegistration = Boolean(userRef && userRef.toString() === user._id.toString());
        const isGuestRegistration = Boolean(!userRef && !playerId && name);
        if (!canModerate && !isSelfRegistration) return unauthorized('Forbidden', 403);
        if (isGuestRegistration && !canModerate) return unauthorized('Only moderators can add guest players', 403);
        if (playerId && !canModerate) return unauthorized('Only moderators can add players by id', 403);
      }

      if (mode === 'pair' || mode === 'team') {
        const isSelfTeamRegistration =
          Array.isArray(members) &&
          members.some((member) => {
            const memberUserRef = member?.userRef?.toString?.() || member?.userRef;
            return memberUserRef === user._id.toString();
          });
        if (!canModerate && !isSelfTeamRegistration) return unauthorized('Forbidden', 403);
        if (!members || !Array.isArray(members) || members.length < 1) {
          throw new Error(`${mode} requires at least 1 partner`);
        }

        const currentUserId = user._id;
        const currentUserIdString = currentUserId.toString();
        const memberIds = [];
        let isSelfRegistration = false;

        if (members.length === 1) {
          isSelfRegistration = true;
          const currentUser = await findUserById(currentUserId);
          if (!currentUser) throw new Error('User not found');
          const currentUserPlayer = await PlayerService.findOrCreatePlayerByUserRef(
            currentUserId.toString(),
            currentUser.name
          );
          memberIds.push(currentUserPlayer._id);
        }

        for (const m of members as TournamentMemberInput[]) {
          let mPlayer;
          if (m.playerId || m._id) {
            const memberPlayerId = m.playerId ?? m._id;
            if (!memberPlayerId) throw new Error('Invalid member data');
            mPlayer = await findPlayerById(memberPlayerId);
          } else if (m.userRef && m.name) {
            mPlayer = await PlayerService.findOrCreatePlayerByUserRef(m.userRef, m.name);
          } else if (m.email && m.name) {
            const matchedUser = await findUserByEmail(String(m.email));
            if (matchedUser) {
              m.userRef = matchedUser._id.toString();
              mPlayer = await PlayerService.findOrCreatePlayerByUserRef(
                matchedUser._id.toString(),
                matchedUser.name || m.name
              );
            } else {
              mPlayer = await PlayerService.findOrCreatePlayerByName(m.name);
            }
          } else if (m.name) {
            mPlayer = await PlayerService.findOrCreatePlayerByName(m.name);
          } else {
            throw new Error('Invalid member data');
          }

          if (!mPlayer) throw new Error('Could not find/create member');
          if (mPlayer.userRef === currentUserId || mPlayer.userRef === currentUserIdString) {
            isSelfRegistration = true;
          }
          memberIds.push(mPlayer._id);
        }

        const teamName = name || `Team ${Date.now()}`;
        player = await PlayerService.findOrCreateTeam(teamName, memberIds[0].toString(), memberIds[1].toString());

        const tournamentData = await findTournamentForInvitation(payload.code);

        let partnerUserId: string | null = null;
        let resolvedPartnerEmail: string | null =
          typeof partnerEmail === 'string' && partnerEmail.includes('@') ? partnerEmail.toLowerCase().trim() : null;
        if (members.length === 1) {
          partnerUserId = members[0].userRef ?? null;
        } else {
          const partner = members.find((m) => m.userRef !== currentUserIdString);
          if (partner) partnerUserId = partner.userRef ?? null;
          if (!resolvedPartnerEmail && partner?.email) {
            resolvedPartnerEmail = String(partner.email).toLowerCase().trim();
          }
        }

        if (isSelfRegistration && (partnerUserId || resolvedPartnerEmail) && tournamentData) {
          const currentUser = await findUserById(currentUserId);
          const partnerUser = partnerUserId
            ? await findUserById(partnerUserId)
            : resolvedPartnerEmail
              ? await findUserByEmail(resolvedPartnerEmail)
              : null;
          const finalInviteeId = partnerUser?._id?.toString() || partnerUserId || undefined;
          const finalInviteeEmail = (partnerUser?.email || resolvedPartnerEmail || '').toLowerCase();

          const invitation = await TeamInvitationService.createInvitation(
            tournamentData._id.toString(),
            player._id.toString(),
            currentUserId.toString(),
            finalInviteeId,
            finalInviteeEmail
          );

          if (currentUser && finalInviteeEmail) {
            const acceptUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invitations/${invitation.token}`;
            const declineUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invitations/${invitation.token}?action=decline`;
            const inviteLocale = normalizeEmailLocale(
              partnerUser?.locale || currentUser.locale || payload.request.headers.get('accept-language')
            );

            const template = await EmailTemplateService.getRenderedTemplate(
              'team_invitation',
              {
                inviterName: currentUser.name,
                inviteeName: partnerUser?.name || finalInviteeEmail.split('@')[0],
                teamName,
                tournamentName: tournamentData.tournamentSettings.name,
                tournamentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/tournaments/${payload.code}`,
                acceptUrl,
                declineUrl,
                currentYear: new Date().getFullYear(),
              },
              { locale: inviteLocale }
            );

            const fallbackText =
              inviteLocale === 'en'
                ? `${currentUser.name} invited you to join team "${teamName}" for ${tournamentData.tournamentSettings.name}.\n\nAccept: ${acceptUrl}\nDecline: ${declineUrl}`
                : `${currentUser.name} meghivott a(z) "${teamName}" csapatba a ${tournamentData.tournamentSettings.name} tornara.\n\nElfogadas: ${acceptUrl}\nElutasitas: ${declineUrl}`;

            const emailPromise = sendEmail({
              to: [finalInviteeEmail],
              subject:
                template?.subject ||
                (inviteLocale === 'en'
                  ? `Team invitation - ${tournamentData.tournamentSettings.name}`
                  : `Csapat meghivo - ${tournamentData.tournamentSettings.name}`),
              text: template?.text || fallbackText,
              html:
                template?.html ||
                renderMinimalEmailLayout({
                  locale: inviteLocale,
                  title: tournamentData.tournamentSettings.name,
                  heading: inviteLocale === 'en' ? 'Team invitation' : 'Csapat meghivo',
                  bodyHtml: textToEmailHtml(fallbackText),
                }),
            });

            await Promise.allSettled([
              emailPromise,
              pushWaitingListEntry(payload.code, player._id.toString(), 'Varakozas a tars visszaigazolasara'),
            ]);
          } else {
            await pushWaitingListEntry(payload.code, player._id.toString(), 'Varakozas a tars visszaigazolasara');
          }

          return {
            success: true,
            playerId: player._id,
            message: 'waiting_for_partner',
            note: 'Invitation sent to partner',
          };
        }
      } else if (playerId) {
        player = await findPlayerById(playerId);
        if (!player) throw new Error('Player not found');
      } else if (userRef && name) {
        player = await PlayerService.findOrCreatePlayerByUserRef(userRef, name);
      } else if (name) {
        player = await PlayerService.findOrCreatePlayerByName(name);
      } else {
        throw new Error('Missing required data: name or userRef');
      }

      const success = await TournamentService.addTournamentPlayer(payload.code, player._id);
      return { success, playerId: player._id };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'addTournamentPlayer' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}

export async function updateTournamentPlayerStatusAction(input: { request: NextRequest; code: string }) {
  const run = withTelemetry(
    'tournaments.players.updateStatus',
    async (payload: { request: NextRequest; code: string }) => {
      const authResult = await authorizeUserResult({ request: payload.request });
      if (!authResult.ok) {
        return authResult;
      }
      const token = payload.request.cookies.get('token')?.value;
      if (!token) return unauthorized('Unauthorized', 401);

      const { canModerate, tournament } = await getAuthContext(payload.code, token);
      if (!canModerate) return unauthorized('Forbidden', 403);

      const eligibilityResult = await assertEligibilityResult({
        featureName: 'PREMIUM_TOURNAMENTS',
        clubId: tournament.clubId?.toString(),
        allowPaidOverride: true,
      });
      if (!eligibilityResult.ok) {
        return eligibilityResult;
      }

      const { playerId, status } = updateTournamentPlayerStatusBodySchema.parse(await payload.request.json());
      const success = await TournamentService.updateTournamentPlayerStatus(payload.code, playerId, status);
      return { success };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'updateTournamentPlayerStatus' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}

export async function removeTournamentPlayerAction(input: { request: NextRequest; code: string }) {
  const run = withTelemetry(
    'tournaments.players.remove',
    async (payload: { request: NextRequest; code: string }) => {
      const authResult = await authorizeUserResult({ request: payload.request });
      if (!authResult.ok) {
        return authResult;
      }
      const token = payload.request.cookies.get('token')?.value;
      if (!token) return unauthorized('Unauthorized', 401);

      const { user, canModerate, tournament } = await getAuthContext(payload.code, token);
      const eligibilityResult = await assertEligibilityResult({
        featureName: 'PREMIUM_TOURNAMENTS',
        clubId: tournament.clubId?.toString(),
        allowPaidOverride: true,
      });
      if (!eligibilityResult.ok) {
        return eligibilityResult;
      }

      const { playerId } = removeTournamentPlayerBodySchema.parse(await payload.request.json());
      const canDeleteSelf = await isSelfPlayer(user._id.toString(), playerId);
      if (!canModerate && !canDeleteSelf) return unauthorized('Forbidden', 403);

      const success = await TournamentService.removeTournamentPlayer(payload.code, playerId);
      return { success };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'removeTournamentPlayer' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
