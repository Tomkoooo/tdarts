import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { SubscriptionService } from "@/database/services/subscription.service";
import { getRequestLogContext, handleError } from "@/middleware/errorHandle";
import { withApiTelemetry } from "@/lib/api-telemetry";
import { parseIsoDateInput } from "@/lib/date-time";
import {
  EMPTY_TOURNAMENT_VIEWER_CONTEXT,
  getTournamentViewerContextFromToken,
} from "@/lib/tournament-viewer-context";

export const GET = withApiTelemetry('/api/tournaments/[code]', async (
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) => {
  const { code } = await params;
  try {
    const tournament: any = await TournamentService.getTournamentSummaryForPublicPage(code);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    const includeViewer = request.nextUrl.searchParams
      .get('include')
      ?.split(',')
      .map((segment) => segment.trim())
      .includes('viewer');
    if (includeViewer) {
      const viewer = { ...EMPTY_TOURNAMENT_VIEWER_CONTEXT };
      const token = request.cookies.get('token')?.value;
      if (token) {
        try {
          const resolvedViewer = await getTournamentViewerContextFromToken(code, token);
          viewer.userClubRole = resolvedViewer.userClubRole;
          viewer.userPlayerStatus = resolvedViewer.userPlayerStatus;
        } catch (viewerError) {
          console.warn('Failed to resolve tournament viewer context', viewerError);
        }
      }
      return NextResponse.json({
        ...tournament,
        viewer,
      });
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
});

export const PUT = withApiTelemetry('/api/tournaments/[code]', async (
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) => {
  const { code } = await params;
  try {
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
    const tournamentClubId = tournament?.clubId?._id?.toString?.() || tournament?.clubId?.toString?.();
    if (!tournamentClubId) {
      return NextResponse.json({ error: "Tournament is missing a valid club reference" }, { status: 400 });
    }

    const parsedNewStartDate = settings.startDate ? parseIsoDateInput(settings.startDate) : null;
    if (settings.startDate && !parsedNewStartDate) {
      return NextResponse.json({ error: "Invalid startDate. Expected ISO date with timezone." }, { status: 400 });
    }
    if (boards !== undefined && !Array.isArray(boards)) {
      return NextResponse.json({ error: "boards must be an array" }, { status: 400 });
    }

    // Check subscription limits if start date is being changed
    if (parsedNewStartDate && parsedNewStartDate.getTime() !== new Date(tournament.tournamentSettings.startDate).getTime()) {
      const subscriptionCheck = await SubscriptionService.canUpdateTournament(
        tournamentClubId,
        parsedNewStartDate,
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
          const isDateChanged = parsedNewStartDate && parsedNewStartDate.getTime() !== new Date(tournament.tournamentSettings.startDate).getTime();

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
      if (isVerified && parsedNewStartDate && parsedNewStartDate.getTime() !== new Date(tournament.tournamentSettings.startDate).getTime()) {
        const { TournamentModel } = await import('@/database/models/tournament.model');
        const newStartDate = parsedNewStartDate;
        const tournamentClubObjectId = tournament?.clubId?._id || tournament?.clubId;
        if (!tournamentClubObjectId) {
          return NextResponse.json({ error: "Tournament is missing a valid club reference" }, { status: 400 });
        }
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
          clubId: tournamentClubObjectId,
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
      ...(parsedNewStartDate ? { startDate: parsedNewStartDate } : {}),
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
});

export const DELETE = withApiTelemetry('/api/tournaments/[code]', async (
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) => {
  const { code } = await params;
  try {
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
      tournamentId: code,
      entityId: code,
    });
    const { status, body } = handleError(error, context);
    return NextResponse.json(body, { status });
  }
});