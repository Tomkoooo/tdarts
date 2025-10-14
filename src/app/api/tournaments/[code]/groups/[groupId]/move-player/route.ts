import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { BadRequestError } from '@/middleware/errorHandle';
import { AuthService } from '@/database/services/auth.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; groupId: string }> }
) {
  try {
    const { code, groupId } = await params;
    
    // Get user from JWT token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await AuthService.verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { playerId, direction } = body;

    if (!code || !groupId || !playerId || !direction) {
      throw new BadRequestError('Tournament code, group ID, player ID, and direction are required.');
    }

    if (direction !== 'up' && direction !== 'down') {
      throw new BadRequestError('Direction must be either "up" or "down".');
    }

    const result = await TournamentService.movePlayerInGroup(code, groupId, playerId, direction);

    if (result) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to move player' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error moving player in group:', error);
    if (error instanceof BadRequestError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
