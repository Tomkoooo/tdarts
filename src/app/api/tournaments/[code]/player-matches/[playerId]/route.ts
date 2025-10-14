import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string; playerId: string } }
) {
  try {
    const { code, playerId } = params;

    if (!code || !playerId) {
      return NextResponse.json(
        { success: false, error: 'Missing tournament code or player ID' },
        { status: 400 }
      );
    }

    const matches = await TournamentService.getPlayerMatches(code, playerId);

    return NextResponse.json({
      success: true,
      matches: matches
    });

  } catch (error) {
    console.error('Get player matches error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch player matches' },
      { status: 500 }
    );
  }
}
