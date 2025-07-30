import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
        const res= await TournamentService.generateGroups(code);
        if (res) {
            const tournament = await TournamentService.getTournament(code);
            return NextResponse.json(tournament);
        }
        return NextResponse.json({ error: 'Failed to generate groups' }, { status: 501 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to generate groups' + error }, { status: 500 });
    }
} 