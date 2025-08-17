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