import { NextRequest, NextResponse } from 'next/server';
import { MatchFlaggingService } from '@/database/services/match-flagging.service';
import { validateInternalSecret, unauthorizedResponse } from '@/lib/api-auth.middleware';

export async function GET(req: NextRequest) {
  try {
    // Validate internal secret
    if (!validateInternalSecret(req)) {
      return unauthorizedResponse();
    }

    // Get query parameters
    const { searchParams } = req.nextUrl;
    const tournamentId = searchParams.get('tournamentId') || undefined;
    const leagueId = searchParams.get('leagueId') || undefined;
    const minSuspicionScore = parseInt(searchParams.get('minSuspicionScore') || '0', 10);

    // Get suspicious matches
    const matches = await MatchFlaggingService.getSuspiciousMatches(tournamentId, leagueId);

    // Filter by suspicion score
    const filteredMatches = matches.filter(
      m => m.flags.suspicionScore >= minSuspicionScore
    );

    return NextResponse.json({
      matches: filteredMatches,
      total: filteredMatches.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching suspicious matches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
