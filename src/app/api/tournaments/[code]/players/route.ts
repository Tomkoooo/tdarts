import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { PlayerService } from "@/database/services/player.service";
import { PlayerModel } from "@/database/models/player.model";
import { withApiTelemetry } from '@/lib/api-telemetry';

import { TournamentModel } from "@/database/models/tournament.model";
import { AuthService } from "@/database/services/auth.service";
import { AuthorizationService } from "@/database/services/authorization.service";
import { TeamInvitationService } from '@/database/services/teaminvitation.service';
import { EmailTemplateService } from '@/database/services/emailtemplate.service';
import { sendEmail } from '@/lib/mailer';
import { UserModel } from '@/database/models/user.model';
import { normalizeEmailLocale, renderMinimalEmailLayout, textToEmailHtml } from '@/lib/email-layout';

async function getAuthContext(code: string, token: string) {
  const user = await AuthService.verifyToken(token);
  const tournament = await TournamentModel.findOne({ tournamentId: code }).select("clubId tournamentSettings tournamentPlayers");
  if (!tournament) {
    throw new Error("Tournament not found");
  }

  const canModerate = await AuthorizationService.checkAdminOrModerator(user._id.toString(), tournament.clubId.toString());
  return { user, tournament, canModerate };
}

async function isSelfPlayer(userId: string, playerId: string): Promise<boolean> {
  const player = await PlayerModel.findById(playerId).select("userRef members");
  if (!player) return false;

  if (player.userRef?.toString() === userId) return true;
  if (Array.isArray(player.members) && player.members.length > 0) {
    const memberPlayers = await PlayerModel.find({ _id: { $in: player.members } }).select("userRef");
    if (memberPlayers.some((member) => member.userRef?.toString() === userId)) return true;
  }
  return false;
}

async function __GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const player = await PlayerService.findPlayerByUserId(userId);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  return NextResponse.json(player._id);
}

async function __POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  
  // Get user from JWT token
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user, canModerate } = await getAuthContext(code, token);

  const { playerId, userRef, name, members, partnerEmail } = await request.json(); // Added members, type
  
  let player;
  // console.log('Adding player:', { playerId, userRef, name, members, type });

  const tournament = await TournamentModel.findOne({ tournamentId: code }).select('tournamentSettings');
  const mode = tournament?.tournamentSettings?.participationMode || 'individual';

  if (mode === 'individual') {
    const isSelfRegistration = Boolean(userRef && userRef.toString() === user._id.toString());
    const isGuestRegistration = Boolean(!userRef && !playerId && name);

    if (!canModerate && !isSelfRegistration) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isGuestRegistration && !canModerate) {
      return NextResponse.json({ error: "Only moderators can add guest players" }, { status: 403 });
    }

    if (playerId && !canModerate) {
      return NextResponse.json({ error: "Only moderators can add players by id" }, { status: 403 });
    }
  }

  if (mode === 'pair' || mode === 'team') {
      const isSelfTeamRegistration = Array.isArray(members) && members.some((member: any) => {
        const memberUserRef = member?.userRef?.toString?.() || member?.userRef;
        return memberUserRef === user._id.toString();
      });
      if (!canModerate && !isSelfTeamRegistration) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (!members || !Array.isArray(members) || members.length < 1) {
           return NextResponse.json({ error: `${mode} requires at least 1 partner` }, { status: 400 });
      }
      
      // Decode JWT to get current user (always needed for logic)
      const user = await AuthService.verifyToken(token);
      const currentUserId = user._id;

      // Create members list and determine registration type
      const memberIds = [];
      let isSelfRegistration = false;

      // Auto-add current user if only 1 member provided (Self-Registration)
      if (members.length === 1) {
          isSelfRegistration = true;
          
          // Get user info for current user
          console.log('Current user ID:', currentUserId);
          const currentUser = await UserModel.findById(currentUserId);
          if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
          }
          
          // Create player for current user (first member)
          const currentUserPlayer = await PlayerService.findOrCreatePlayerByUserRef(
            currentUserId.toString(),
            currentUser.name
          );
          
          memberIds.push(currentUserPlayer._id);
      }
      
      // Process other members
      for (const m of members) {
          let mPlayer;
          if (m.playerId || m._id) {
             mPlayer = await PlayerModel.findById(m.playerId || m._id);
          } else if (m.userRef && m.name) {
             mPlayer = await PlayerService.findOrCreatePlayerByUserRef(m.userRef, m.name);
          } else if (m.email && m.name) {
             const matchedUser = await UserModel.findOne({ email: String(m.email).toLowerCase() }).select("_id name email");
             if (matchedUser) {
               m.userRef = matchedUser._id.toString();
               mPlayer = await PlayerService.findOrCreatePlayerByUserRef(matchedUser._id.toString(), matchedUser.name || m.name);
             } else {
               mPlayer = await PlayerService.findOrCreatePlayerByName(m.name);
             }
          } else if (m.name) {
             mPlayer = await PlayerService.findOrCreatePlayerByName(m.name);
          } else {
              throw new Error('Invalid member data');
          }

          if (!mPlayer) throw new Error("Could not find/create member");
          
          // Check if this member is the current user (e.g. Admin adding themselves via Moderator form)
          if (mPlayer.userRef === currentUserId || mPlayer.userRef === currentUserId.toString()) {
              isSelfRegistration = true;
          }
          
          memberIds.push(mPlayer._id);
      }
      
      // If team name is not provided, generate one
      const teamName = name || 'Team ' + new Date().getTime(); 

      // Create Team Player (virtual)
      // Assume pair for now if 2 members
      // PlayerService.findOrCreateTeam only accepts 2.
      // For now restrict to 2 for pair.
      player = await PlayerService.findOrCreateTeam(teamName, memberIds[0].toString(), memberIds[1].toString());

      // Check if we need to send invitation (Self Registration AND partner is registered)
      // We need to fetch clubId to check moderator status (redundant for self-reg check but kept for potential future use)
      const tournamentData = await TournamentModel.findOne({ tournamentId: code }).select('clubId tournamentSettings');
      
      // Define partner (the one who is NOT current user)
      let partnerUserId = null;
      let resolvedPartnerEmail: string | null = typeof partnerEmail === "string" && partnerEmail.includes("@")
        ? partnerEmail.toLowerCase().trim()
        : null;
      if (members.length === 1) {
          partnerUserId = members[0].userRef;
      } else {
          // Find the member from input that is NOT the current user
          const partner = members.find((m: any) => m.userRef !== currentUserId && m.userRef !== currentUserId.toString());
          if (partner) partnerUserId = partner.userRef;
          if (!resolvedPartnerEmail && partner?.email) {
            resolvedPartnerEmail = String(partner.email).toLowerCase().trim();
          }
      }
      
      if (isSelfRegistration && (partnerUserId || resolvedPartnerEmail)) {
          const user = await AuthService.verifyToken(token);
          const currentUserId = user._id;
          const currentUser = await UserModel.findById(currentUserId);
          const partnerUser = partnerUserId
            ? await UserModel.findById(partnerUserId)
            : resolvedPartnerEmail
              ? await UserModel.findOne({ email: resolvedPartnerEmail })
              : null;
          const finalInviteeId = partnerUser?._id?.toString() || partnerUserId || undefined;
          const finalInviteeEmail = (partnerUser?.email || resolvedPartnerEmail || "").toLowerCase();
          
          // Invitation Flow
          // Create invitation
          const invitation = await TeamInvitationService.createInvitation(
              tournamentData._id.toString(),
              player._id.toString(),
              currentUserId.toString(),
              finalInviteeId,
              finalInviteeEmail
          );

          // Send email
          if (finalInviteeEmail) {
              const acceptUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invitations/${invitation.token}`;
              const declineUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invitations/${invitation.token}?action=decline`;
              const inviteLocale = normalizeEmailLocale(partnerUser?.locale || currentUser.locale || request.headers.get('accept-language'));
              
              const template = await EmailTemplateService.getRenderedTemplate('team_invitation', {
                  inviterName: currentUser.name,
                  inviteeName: partnerUser?.name || finalInviteeEmail.split("@")[0],
                  teamName: teamName,
                  tournamentName: tournamentData.tournamentSettings.name,
                  tournamentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/tournaments/${code}`,
                  acceptUrl,
                  declineUrl,
                  currentYear: new Date().getFullYear()
              }, {
                  locale: inviteLocale,
              });

              const fallbackText =
                inviteLocale === 'en'
                  ? `${currentUser.name} invited you to join team "${teamName}" for ${tournamentData.tournamentSettings.name}.\n\nAccept: ${acceptUrl}\nDecline: ${declineUrl}`
                  : `${currentUser.name} meghívott a(z) "${teamName}" csapatba a ${tournamentData.tournamentSettings.name} tornára.\n\nElfogadás: ${acceptUrl}\nElutasítás: ${declineUrl}`;

              await sendEmail({
                  to: [finalInviteeEmail],
                  subject: template?.subject || (inviteLocale === 'en'
                    ? `🎯 Team invitation - ${tournamentData.tournamentSettings.name}`
                    : `🎯 Csapat meghívó - ${tournamentData.tournamentSettings.name}`),
                  text: template?.text || fallbackText,
                  html: template?.html || renderMinimalEmailLayout({
                    locale: inviteLocale,
                    title: tournamentData.tournamentSettings.name,
                    heading: inviteLocale === 'en' ? 'Team invitation' : 'Csapat meghívó',
                    bodyHtml: textToEmailHtml(fallbackText),
                  }),
                  resendContext: {
                    templateKey: 'team_invitation',
                    variables: {
                      inviterName: currentUser.name,
                      inviteeName: partnerUser?.name || finalInviteeEmail.split("@")[0],
                      teamName: teamName,
                      tournamentName: tournamentData.tournamentSettings.name,
                      tournamentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/tournaments/${code}`,
                      acceptUrl,
                      declineUrl,
                      currentYear: new Date().getFullYear(),
                    },
                    locale: inviteLocale,
                  },
              });
          }

          // Add to Waiting List instead of Main List
          // For now, I'll update the tournament directly here to push to waitingList
          await TournamentModel.findOneAndUpdate(
              { tournamentId: code },
              {
                  $push: {
                      waitingList: {
                          playerReference: player._id,
                          addedAt: new Date(),
                          note: "Várakozás a társ visszaigazolására"
                      }
                  }
              }
          );
          
          return NextResponse.json({ 
              success: true, 
              playerId: player._id,
              message: "waiting_for_partner",
              note: "Invitation sent to partner" 
          });
      }

  } else {
      // Individual
      // If playerId is provided, use existing player (only for guest players)
      if (playerId) {
          player = await PlayerModel.findById(playerId);
          if (!player) {
          throw new Error('Player not found');
          }
      } else {
          // Create new player
          if (userRef && name) {
          player = await PlayerService.findOrCreatePlayerByUserRef(userRef, name);
          } else if (name) {
          player = await PlayerService.findOrCreatePlayerByName(name);
          } else {
          throw new Error('Missing required data: name or userRef');
          }
      }
  }
  
  const success = await TournamentService.addTournamentPlayer(code, player._id);
  return NextResponse.json({ success, playerId: player._id});
}

async function __PUT(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  
  // Get user from JWT token
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { canModerate } = await getAuthContext(code, token);
  if (!canModerate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { playerId, status } = await request.json();
  const success = await TournamentService.updateTournamentPlayerStatus(code, playerId, status);
  return NextResponse.json({ success });
}

async function __DELETE(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  
  // Get user from JWT token
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user, canModerate } = await getAuthContext(code, token);
  const { playerId } = await request.json();
  const canDeleteSelf = await isSelfPlayer(user._id.toString(), playerId);
  if (!canModerate && !canDeleteSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const success = await TournamentService.removeTournamentPlayer(code, playerId);
  return NextResponse.json({ success });
}

export const GET = withApiTelemetry('/api/tournaments/[code]/players', __GET as any);
export const POST = withApiTelemetry('/api/tournaments/[code]/players', __POST as any);
export const PUT = withApiTelemetry('/api/tournaments/[code]/players', __PUT as any);
export const DELETE = withApiTelemetry('/api/tournaments/[code]/players', __DELETE as any);
