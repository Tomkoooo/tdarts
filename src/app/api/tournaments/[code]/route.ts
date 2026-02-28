import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { SubscriptionService } from "@/database/services/subscription.service";
import { getRequestLogContext, handleError } from "@/middleware/errorHandle";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const tournament: any = await TournamentService.getTournament(code) // Populate players for frontend display
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    return NextResponse.json(tournament);
  } catch (error) {
    const context = getRequestLogContext(request, {
      tournamentId: code,
      operation: 'api.tournament.get',
      entityType: 'tournament',
      entityId: code,
    });
    const { status, body } = handleError(error, context);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    // Get user ID from request
    const { AuthorizationService } = await import('@/database/services/authorization.service');
    const requesterId = await AuthorizationService.getUserIdFromRequest(request);
    
    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { settings, boards } = body;

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

    // Check Verified Tournament restrictions (OAC)
    if (tournament.verified || tournament.league) {
      const { LeagueModel } = await import('@/database/models/league.model');
      const { UserModel } = await import('@/database/models/user.model');
      
      let isVerified = tournament.verified || false;
      
      if (tournament.league) {
        const league = await LeagueModel.findById(tournament.league);
        isVerified = isVerified || (league?.verified || false);
        
        if (league && league.verified) {
          // Check if restricted fields are being modified
          const isLeagueChanged = settings.leagueId && settings.leagueId !== tournament.league.toString();
          const isDateChanged = settings.startDate && new Date(settings.startDate).getTime() !== new Date(tournament.tournamentSettings.startDate).getTime();

          if (isLeagueChanged || isDateChanged) {
            // Check if user is Global Admin
            const user = await UserModel.findById(requesterId);
            if (!user || !user.isAdmin) {
               return NextResponse.json({ 
                error: "Only Global Admins can modify the league or date of a Verified League tournament." 
              }, { status: 403 });
            }
          }
        }
      }
      
      // Check verified tournament weekly limit if date is being changed
      if (isVerified && settings.startDate && new Date(settings.startDate).getTime() !== new Date(tournament.tournamentSettings.startDate).getTime()) {
        const { TournamentModel } = await import('@/database/models/tournament.model');
        const newStartDate = new Date(settings.startDate);
        const dayOfWeek = newStartDate.getDay();
        
        // Calculate Monday of this week
        let daysFromMonday: number;
        if (dayOfWeek === 0) {
          daysFromMonday = 6;
        } else {
          daysFromMonday = dayOfWeek - 1;
        }
        
        const weekStart = new Date(newStartDate);
        weekStart.setDate(weekStart.getDate() - daysFromMonday);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 5);
        weekEnd.setHours(23, 59, 59, 999);

        // Check for existing verified tournaments in target week (excluding current tournament)
        const existingVerifiedTournament = await TournamentModel.findOne({
          clubId: tournament.clubId._id,
          verified: true,
          tournamentId: { $ne: tournament.tournamentId }, // Exclude current tournament
          'tournamentSettings.startDate': {
            $gte: weekStart,
            $lte: weekEnd
          },
          isDeleted: false,
          isCancelled: false
        });

        if (existingVerifiedTournament) {
          return NextResponse.json({ 
            error: 'A klubod már létrehozott egy OAC versenyt ezen a héten (hétfőtől vasárnapig). Heti egy OAC verseny engedélyezett.' 
          }, { status: 400 });
        }
      }
    }

    const updatedTournament = await TournamentService.updateTournamentSettings(code, requesterId, {
      ...settings,
      boards
    });
    return NextResponse.json(updatedTournament);
  } catch (error) {
    const context = getRequestLogContext(request, {
      tournamentId: code,
      operation: 'api.tournament.put',
      entityType: 'tournament',
      entityId: code,
    });
    const { status, body } = handleError(error, context);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    // Get user ID from request
    const { AuthorizationService } = await import('@/database/services/authorization.service');
    const requesterId = await AuthorizationService.getUserIdFromRequest(request);
    
    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json().catch(() => ({}));
    const { emailData } = body;

    // Delete tournament (authorization is checked in the service)
    await TournamentService.deleteTournament(code, requesterId, emailData);
    
    return NextResponse.json({ success: true, message: "Tournament deleted successfully" });
  } catch (error) {
    const context = getRequestLogContext(request, {
      operation: 'api.tournament.delete',
      entityType: 'tournament',
    });
    const { status, body } = handleError(error, context);
    return NextResponse.json(body, { status });
  }
}