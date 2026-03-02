import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { ClubService } from "@/database/services/club.service";
import { AuthService } from "@/database/services/auth.service";
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const token = await request.cookies.get('token')?.value;
    console.log('getUserRole - Token found:', token ? 'Yes' : 'No');
    console.log('getUserRole - Token value:', token ? token.substring(0, 20) + '...' : 'undefined');
    
    if (!token) {
      console.log('getUserRole - No token found, returning unauthorized');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await AuthService.verifyToken(token);
    if (!user) {
      return NextResponse.json('guest');
    }

    const { clubId } = await TournamentService.getTournamentRoleContext(code);
    
    // Párhuzamos lekérdezések a teljesítmény javításához
    const [userClubRole, userPlayerStatus] = await Promise.all([
      ClubService.getUserRoleInClub(user._id.toString(), clubId),
      TournamentService.getPlayerStatusInTournament(code, user._id.toString())
    ]);

    return NextResponse.json({
      userClubRole: userClubRole,
      userPlayerStatus: userPlayerStatus
    });
  } catch (error: any) {
    console.error('getUserRole API error:', error);
    
    // Ha a klub nem található vagy más adatbázis hiba, akkor is adjunk választ
    if (error.message?.includes('Club not found') || error.message?.includes('Tournament not found')) {
      return NextResponse.json({
        userClubRole: 'none',
        userPlayerStatus: 'none'
      });
    }
    
    return NextResponse.json({ 
      error: "Internal server error",
      userClubRole: 'none',
      userPlayerStatus: 'none'
    }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/tournaments/[code]/getUserRole', __GET as any);
