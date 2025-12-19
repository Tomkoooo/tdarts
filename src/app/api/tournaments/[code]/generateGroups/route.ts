import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { connectMongo } from '@/lib/mongoose';
import { AuthService } from '@/database/services/auth.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await connectMongo();
    const { code } = await params;
    
    // Get user from JWT token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await AuthService.verifyToken(token);
    const requesterId = user._id.toString();
    
    // Check if current date matches tournament start date
    const tournament = await TournamentService.getTournament(code);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(tournament.tournamentSettings.startDate);
    startDate.setHours(0, 0, 0, 0);

    if (today < startDate) {
      return NextResponse.json({
        success: false,
        error: 'A torna csak a kezdési napon indítható. Módosítsd a kezdési dátumot, ha korábban szeretnéd indítani.',
        canChangeDate: true,
        currentStartDate: startDate.toISOString(),
        currentDate: today.toISOString()
      }, { status: 400 });
    }
    
    const res = await TournamentService.generateGroups(code, requesterId);
        if (res) {
            const tournament = await TournamentService.getTournament(code);
            return NextResponse.json(tournament);
        }
        return NextResponse.json({ error: 'Failed to generate groups' }, { status: 501 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to generate groups' + error }, { status: 500 });
    }
} 