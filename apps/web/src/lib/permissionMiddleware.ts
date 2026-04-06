import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { TournamentService } from '@/database/services/tournament.service';
import { ClubService } from '@/database/services/club.service';

export interface PermissionResult {
  user: any;
  tournament: any;
  club: any;
}

/**
 * Reusable permission check function for tournament endpoints
 * Checks if user is authenticated and has admin/moderator permissions for the tournament's club
 */
export async function checkTournamentPermission(
  request: NextRequest, 
  tournamentCode: string
): Promise<PermissionResult | NextResponse> {
  try {
    // Get token from cookie
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'No authentication token found' 
      }, { status: 401 });
    }

    // Verify token and get user
    const user = await AuthService.verifyToken(token);
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid authentication token' 
      }, { status: 401 });
    }

    // Get tournament
    const tournament = await TournamentService.getTournament(tournamentCode);
    if (!tournament) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tournament not found' 
      }, { status: 404 });
    }
    // Get club and check permissions
    const club = await ClubService.getClub(tournament.clubId._id.toString());
    if (!club) {
      return NextResponse.json({ 
        success: false, 
        error: 'Club not found' 
      }, { status: 404 });
    }

    const userRole = await ClubService.getUserRoleInClub(user._id?.toString(), club._id?.toString());
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return NextResponse.json({ 
        success: false, 
        error: 'Only club admins or moderators can perform this action' 
      }, { status: 403 });
    }

    return { user, tournament, club };
  } catch (error: any) {
    console.error('Permission check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Permission check failed' 
    }, { status: 500 });
  }
}

/**
 * Higher-order function to wrap API handlers with permission checking
 * Usage: export const POST = withTournamentPermission(async (request, params, { user, tournament, club }) => { ... });
 */
export function withTournamentPermission(
  handler: (
    request: NextRequest, 
    params: Promise<{ code: string }>, 
    context: PermissionResult
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
  ): Promise<NextResponse> => {
    try {
      const { code } = await params;
      if (!code) {
        return NextResponse.json({ 
          success: false, 
          error: 'Tournament code is required' 
        }, { status: 400 });
      }

      // Check permissions
      const permissionResult = await checkTournamentPermission(request, code);
      if (permissionResult instanceof NextResponse) {
        return permissionResult;
      }

      // Call the original handler with permission context
      return await handler(request, params, permissionResult);
    } catch (error: any) {
      console.error('API handler error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }, { status: 500 });
    }
  };
}
