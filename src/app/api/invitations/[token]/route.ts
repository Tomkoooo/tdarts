import { NextRequest, NextResponse } from "next/server";
import { TeamInvitationService } from "@/database/services/teaminvitation.service";
import { TournamentService } from "@/database/services/tournament.service";
import { TournamentModel } from "@/database/models/tournament.model";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { action } = await request.json(); // 'accept' or 'decline'

  try {
    const invitation = await TeamInvitationService.getInvitationByToken(token);
    
    if (!invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    if (action === 'accept') {
      // Note: invitation.tournamentId is populated with the Tournament Document
      // We need the tournament code (tournamentId field) for addTournamentPlayer
      const tournamentCode = (invitation.tournamentId as any).tournamentId;
      const tournamentDocId = (invitation.tournamentId as any)._id;
      const teamId = (invitation.teamId as any)._id || invitation.teamId;

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

      return NextResponse.json({ success: true, message: "Invitation declined" });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Invitation action error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
