import { NextRequest, NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { AuthService } from '@/database/services/auth.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; leagueId: string }> }
) {
  try {
    const { leagueId } = await params;

    // Get user from JWT token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const userId = user._id.toString();

    const body = await request.json();
    const { playerId, adjustmentIndex } = body;

    if (!playerId || adjustmentIndex === undefined) {
      return NextResponse.json(
        { error: 'Player ID and adjustment index are required' },
        { status: 400 }
      );
    }

    const league = await LeagueService.undoPointsAdjustment(
      leagueId,
      userId,
      playerId,
      adjustmentIndex
    );

    return NextResponse.json({
      success: true,
      league
    });
  } catch (error: any) {
    console.error('Undo adjustment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to undo adjustment' },
      { status: error.statusCode || 500 }
    );
  }
}
