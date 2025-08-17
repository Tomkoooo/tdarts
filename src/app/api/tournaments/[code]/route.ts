import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { SubscriptionService } from "@/database/services/subscription.service";
import { BadRequestError } from "@/middleware/errorHandle";
import { AuthService } from "@/database/services/auth.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const tournament: any = await TournamentService.getTournament(code)
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  return NextResponse.json(tournament);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    // Get user from JWT token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await AuthService.verifyToken(token);
    const requesterId = user._id.toString();
    
    const body = await request.json();
    const { settings, selectedBoards } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: "settings object is required" }, { status: 400 });
    }

    // Get tournament to check club and current start date
    const tournament = await TournamentService.getTournament(code);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Check subscription limits if start date is being changed
    if (settings.startDate && new Date(settings.startDate).getTime() !== new Date(tournament.tournamentSettings.startDate).getTime()) {
      const subscriptionCheck = await SubscriptionService.canUpdateTournament(
        tournament.clubId._id.toString(), 
        new Date(settings.startDate),
        tournament.tournamentId
      );
      
      if (!subscriptionCheck.canUpdate) {
        console.log('Subscription limit exceeded for update:', subscriptionCheck.errorMessage);
        return NextResponse.json({ 
          error: subscriptionCheck.errorMessage,
          subscriptionError: true,
          currentCount: subscriptionCheck.currentCount,
          maxAllowed: subscriptionCheck.maxAllowed,
          planName: subscriptionCheck.planName
        }, { status: 403 });
      }
    }

    const updatedTournament = await TournamentService.updateTournamentSettings(code, requesterId, {
      ...settings,
      selectedBoards
    });
    return NextResponse.json(updatedTournament);
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating tournament:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}