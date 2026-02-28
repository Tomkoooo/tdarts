import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

// POST /api/tournaments/[code]/waitlist - Add player to waiting list
async function __POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { playerId, userRef, name } = await request.json();

    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const userId = user._id.toString();

    const result = await TournamentService.addToWaitingList(
      code,
      userId,
      { playerId, userRef, name }
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Add to waiting list error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add to waiting list' },
      { status: error.statusCode || 500 }
    );
  }
}

// DELETE /api/tournaments/[code]/waitlist - Remove player from waiting list
async function __DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { playerId } = await request.json();

    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const userId = user._id.toString();

    await TournamentService.removeFromWaitingList(code, userId, playerId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Remove from waiting list error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove from waiting list' },
      { status: error.statusCode || 500 }
    );
  }
}

export const POST = withApiTelemetry('/api/tournaments/[code]/waitlist', __POST as any);
export const DELETE = withApiTelemetry('/api/tournaments/[code]/waitlist', __DELETE as any);
