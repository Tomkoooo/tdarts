import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { AuthService } from '@/database/services/auth.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Tournament code is required' },
        { status: 400 }
      );
    }

    // Get user from JWT token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await AuthService.verifyToken(token);
    const requesterId = user._id.toString();

    const result = await TournamentService.finishTournament(code, requesterId);

    if (result) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: 'Nem sikerült befejezni a tornát' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Finish tournament error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Nem sikerült befejezni a tornát' },
      { status: 500 }
    );
  }
} 