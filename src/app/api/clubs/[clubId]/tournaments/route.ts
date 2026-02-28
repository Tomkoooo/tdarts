import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { connectMongo } from '@/lib/mongoose';
import { withApiTelemetry } from '@/lib/api-telemetry';

// GET /api/clubs/[clubId]/tournaments - Get all tournaments for a club
async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    await connectMongo();
    const { clubId } = await params;

    // Get user from JWT token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await AuthService.verifyToken(token);
    const userId = user._id.toString();

    // Check if user has at least member access to this club (or is global admin)
    const hasAccess = await AuthorizationService.checkMemberOrHigher(userId, clubId);
    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'You must be a member of this club to view tournaments' 
      }, { status: 403 });
    }

    // Get all tournaments for this club (both active and finished)
    const TournamentModel = (await import('@/database/models/tournament.model')).TournamentModel;
    const tournaments = await TournamentModel.find({ clubId: clubId })
      .sort({ createdAt: -1 })
      .populate('tournamentPlayers.playerReference')
      .lean();

    return NextResponse.json({ 
      success: true,
      tournaments,
      count: tournaments.length
    });
  } catch (error: any) {
    console.error('Error fetching club tournaments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tournaments' },
      { status: error.statusCode || 500 }
    );
  }
}

export const GET = withApiTelemetry('/api/clubs/[clubId]/tournaments', __GET as any);
