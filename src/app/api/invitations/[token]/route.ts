import { NextRequest, NextResponse } from "next/server";
import { TeamInvitationService } from "@/database/services/teaminvitation.service";
import { TournamentService } from "@/database/services/tournament.service";
import { TournamentModel } from "@/database/models/tournament.model";
import { AuthService } from "@/database/services/auth.service";
import { PlayerService } from "@/database/services/player.service";
import { PlayerModel } from "@/database/models/player.model";
import { TeamInvitationModel } from "@/database/models/teaminvitation.model";
import { EmailTemplateService } from "@/database/services/emailtemplate.service";
import { sendEmail } from "@/lib/mailer";
import { normalizeEmailLocale, renderMinimalEmailLayout, textToEmailHtml } from "@/lib/email-layout";
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  try {
    const invitation = await TeamInvitationService.getInvitationByToken(token);
    
    if (!invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    return NextResponse.json({ invitation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

async function __POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { action } = await request.json(); // 'accept' or 'decline'

  try {
    const authToken = request.cookies.get("token")?.value;
    if (!authToken) {
      return NextResponse.json(
        { error: "Unauthorized", redirectTo: `/auth/login?redirect=${encodeURIComponent(`/invitations/${token}`)}` },
        { status: 401 }
      );
    }

    const user = await AuthService.verifyToken(authToken);
    const invitation = await TeamInvitationService.getInvitationByToken(token);
    
    if (!invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    const inviteeId = (invitation as any).inviteeId?._id?.toString?.() || (invitation as any).inviteeId?.toString?.();
    const inviteeEmail = ((invitation as any).inviteeEmail || "").toLowerCase();
    const isInviteeById = inviteeId && inviteeId === user._id.toString();
    const isInviteeByEmail = inviteeEmail && inviteeEmail === String(user.email || "").toLowerCase();
    if (!isInviteeById && !isInviteeByEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === 'accept') {
      // Note: invitation.tournamentId is populated with the Tournament Document
      // We need the tournament code (tournamentId field) for addTournamentPlayer
      const tournamentCode = (invitation.tournamentId as any).tournamentId;
      const tournamentDocId = (invitation.tournamentId as any)._id;
      const teamId = (invitation.teamId as any)._id || invitation.teamId;

      // If invitation was created by email before account existed, permanently bind it to this user.
      if (!inviteeId) {
        await TeamInvitationModel.findOneAndUpdate(
          { token, status: "pending" },
          { inviteeId: user._id, inviteeEmail: String(user.email || "").toLowerCase() }
        );
      }

      // Ensure the invited account is linked to the pair member before tournament add.
      const inviterId = (invitation as any).inviterId?._id?.toString?.() || (invitation as any).inviterId?.toString?.();
      const inviterPlayer = inviterId ? await PlayerService.findPlayerByUserId(inviterId) : null;
      const inviteePlayer = await PlayerService.findOrCreatePlayerByUserRef(user._id.toString(), user.name);

      const team = await PlayerModel.findById(teamId).populate("members");
      if (team && Array.isArray(team.members) && team.members.length > 0) {
        const existingMemberIds = team.members.map((member: any) => member._id?.toString?.() || member.toString());
        const inviteeMemberId = inviteePlayer._id.toString();
        if (!existingMemberIds.includes(inviteeMemberId)) {
          let replaceIndex = -1;
          const inviterPlayerId = inviterPlayer?._id?.toString?.();

          if (inviterPlayerId) {
            replaceIndex = existingMemberIds.findIndex((id: string) => id !== inviterPlayerId);
          }
          if (replaceIndex === -1) {
            replaceIndex = team.members.findIndex((member: any) => !member?.userRef);
          }
          if (replaceIndex === -1) {
            replaceIndex = 0;
          }

          const updatedMembers = [...existingMemberIds];
          updatedMembers[replaceIndex] = inviteeMemberId;
          team.members = Array.from(new Set(updatedMembers)) as any;
          await team.save();
        }
      }

      // 1. Add team to tournament players (Main List)
      const added = await TournamentService.addTournamentPlayer(
        tournamentCode, 
        teamId.toString()
      );

      if (!added) {
        return NextResponse.json({ error: "Failed to add team to tournament" }, { status: 500 });
      }

      // 2. Mark invitation as accepted
      await TeamInvitationService.acceptInvitation(token);

      // 3. Remove from waiting list
      await TournamentModel.findByIdAndUpdate(
        tournamentDocId,
        {
          $pull: {
            waitingList: {
              playerReference: teamId
            }
          }
        }
      );

      const inviterEmail = (invitation as any).inviterId?.email;
      if (inviterEmail) {
        const inviterLocale = normalizeEmailLocale((invitation as any).inviterId?.locale || request.headers.get('accept-language'));
        const acceptedTemplate = await EmailTemplateService.getRenderedTemplate(
          'team_invitation_accepted',
          {
            inviterName: (invitation as any).inviterId?.name || 'Játékos',
            accepterName: user.name || user.username || 'Játékos',
            teamName: (invitation as any).teamId?.name || 'Team',
            tournamentName: (invitation as any).tournamentId?.tournamentSettings?.name || (invitation as any).tournamentId?.name || 'Tournament',
            tournamentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/tournaments/${tournamentCode}`,
            currentYear: new Date().getFullYear(),
          },
          { locale: inviterLocale }
        );
        const fallbackText =
          inviterLocale === 'en'
            ? `${user.name || user.username || 'Your partner'} accepted your invitation for ${(invitation as any).teamId?.name || 'your team'}.`
            : `${user.name || user.username || 'A társad'} elfogadta a meghívást a ${(invitation as any).teamId?.name || 'csapatodba'} csapatba.`;

        await sendEmail({
          to: [inviterEmail],
          subject: acceptedTemplate?.subject || (inviterLocale === 'en' ? '✅ Invitation accepted' : '✅ Meghívás elfogadva'),
          text: acceptedTemplate?.text || fallbackText,
          html:
            acceptedTemplate?.html ||
            renderMinimalEmailLayout({
              locale: inviterLocale,
              title: inviterLocale === 'en' ? 'Invitation accepted' : 'Meghívás elfogadva',
              heading: inviterLocale === 'en' ? 'Invitation accepted' : 'Meghívás elfogadva',
              bodyHtml: textToEmailHtml(fallbackText),
            }),
          resendContext: {
            templateKey: 'team_invitation_accepted',
            variables: {
              inviterName: (invitation as any).inviterId?.name || 'Játékos',
              accepterName: user.name || user.username || 'Játékos',
              teamName: (invitation as any).teamId?.name || 'Team',
              tournamentName: (invitation as any).tournamentId?.tournamentSettings?.name || (invitation as any).tournamentId?.name || 'Tournament',
              tournamentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/tournaments/${tournamentCode}`,
              currentYear: new Date().getFullYear(),
            },
            locale: inviterLocale,
          },
        });
      }

      return NextResponse.json({ success: true, message: "Invitation accepted" });

    } else if (action === 'decline') {
      // 1. Mark invitation as declined
      await TeamInvitationService.declineInvitation(token);

      // 2. Remove from waiting list
      await TournamentModel.findByIdAndUpdate(
        invitation.tournamentId,
        {
          $pull: {
            waitingList: {
              playerReference: invitation.teamId
            }
          }
        }
      );

      const inviterEmail = (invitation as any).inviterId?.email;
      if (inviterEmail) {
        const inviterLocale = normalizeEmailLocale((invitation as any).inviterId?.locale || request.headers.get('accept-language'));
        const declinedTemplate = await EmailTemplateService.getRenderedTemplate(
          'team_invitation_declined',
          {
            inviterName: (invitation as any).inviterId?.name || 'Játékos',
            declinerName: user.name || user.username || 'Játékos',
            teamName: (invitation as any).teamId?.name || 'Team',
            tournamentName: (invitation as any).tournamentId?.tournamentSettings?.name || (invitation as any).tournamentId?.name || 'Tournament',
            currentYear: new Date().getFullYear(),
          },
          { locale: inviterLocale }
        );
        const fallbackText =
          inviterLocale === 'en'
            ? `${user.name || user.username || 'The invitee'} declined your invitation for ${(invitation as any).teamId?.name || 'your team'}.`
            : `${user.name || user.username || 'A meghívott'} elutasította a meghívást a ${(invitation as any).teamId?.name || 'csapatodba'} csapatba.`;

        await sendEmail({
          to: [inviterEmail],
          subject: declinedTemplate?.subject || (inviterLocale === 'en' ? '❌ Invitation declined' : '❌ Meghívás elutasítva'),
          text: declinedTemplate?.text || fallbackText,
          html:
            declinedTemplate?.html ||
            renderMinimalEmailLayout({
              locale: inviterLocale,
              title: inviterLocale === 'en' ? 'Invitation declined' : 'Meghívás elutasítva',
              heading: inviterLocale === 'en' ? 'Invitation declined' : 'Meghívás elutasítva',
              bodyHtml: textToEmailHtml(fallbackText),
            }),
          resendContext: {
            templateKey: 'team_invitation_declined',
            variables: {
              inviterName: (invitation as any).inviterId?.name || 'Játékos',
              declinerName: user.name || user.username || 'Játékos',
              teamName: (invitation as any).teamId?.name || 'Team',
              tournamentName: (invitation as any).tournamentId?.tournamentSettings?.name || (invitation as any).tournamentId?.name || 'Tournament',
              currentYear: new Date().getFullYear(),
            },
            locale: inviterLocale,
          },
        });
      }

      return NextResponse.json({ success: true, message: "Invitation declined" });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Invitation action error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/invitations/[token]', __GET as any);
export const POST = withApiTelemetry('/api/invitations/[token]', __POST as any);
