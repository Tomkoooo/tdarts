import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { AuthService } from '@/database/services/auth.service';

// POST /api/tournaments/[code]/notifications - Subscribe to tournament notifications
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const userId = user._id.toString();
    const userEmail = user.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email address is required for notifications' },
        { status: 400 }
      );
    }

    await TournamentService.subscribeToNotifications(code, userId, userEmail);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Subscribe to notifications error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to subscribe to notifications' },
      { status: error.statusCode || 500 }
    );
  }
}

// DELETE /api/tournaments/[code]/notifications - Unsubscribe from tournament notifications
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const userId = user._id.toString();

    await TournamentService.unsubscribeFromNotifications(code, userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unsubscribe from notifications error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to unsubscribe from notifications' },
      { status: error.statusCode || 500 }
    );
  }
}

