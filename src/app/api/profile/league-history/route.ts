import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { LeagueModel } from '@/database/models/league.model';
import '@/database/models/club.model'; // Ensure Club model is registered
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest) {
  try {
    await connectMongo();
    
    // Verify user access
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find player linked to this user
    const { PlayerModel } = await import('@/database/models/player.model');
    const player = await PlayerModel.findOne({ userRef: user._id });
    
    if (!player) {
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }

    // Find all leagues where this player participates
    const leagues = await LeagueModel.find({
      'players.player': player._id
    }).populate('club', 'name');

    const leagueHistory = leagues.map(league => {
      const playerInLeague = league.players.find((p: any) => 
        p.player.toString() === player._id.toString()
      );

      if (!playerInLeague) return null;

      // Find player's position in league
      const sortedPlayers = [...league.players].sort((a: any, b: any) => 
        (b.totalPoints || 0) - (a.totalPoints || 0)
      );
      
      const position = sortedPlayers.findIndex((p: any) => 
        p.player.toString() === player._id.toString()
      ) + 1;

      return {
        leagueId: league._id,
        leagueName: league.name,
        clubName: league.club?.name || 'Ismeretlen klub',
        clubId: league.club?._id || league.club,
        description: league.description,
        totalPoints: playerInLeague.totalPoints || 0,
        tournamentsPlayed: playerInLeague.tournamentPoints?.length || 0,
        position: position,
        joinedAt: playerInLeague.joinedAt || league.createdAt,
        lastActivity: playerInLeague.lastActivity || league.updatedAt,
        leagueStatus: league.isActive ? 'active' : 'inactive'
      };
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: leagueHistory
    });

  } catch (error) {
    console.error('Error fetching league history:', error);
    return NextResponse.json(
      { success: false, error: 'Hiba történt a liga történet lekérése során' },
      { status: 500 }
    );
  }
}

export const GET = withApiTelemetry('/api/profile/league-history', __GET as any);
