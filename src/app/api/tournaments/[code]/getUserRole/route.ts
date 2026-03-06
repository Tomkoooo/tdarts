import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { ClubService } from "@/database/services/club.service";
import { AuthService } from "@/database/services/auth.service";
import { withApiTelemetry } from '@/lib/api-telemetry';

function resolveStatusCode(error: any): number {
  const status = error?.statusCode ?? error?.status;
  if (typeof status === "number") return status;
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid token") || message.includes("unauthorized")) {
    return 401;
  }
  return 500;
}

async function __GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const token = await request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user) {
      return NextResponse.json({
        userClubRole: 'none',
        userPlayerStatus: 'none'
      }, { status: 401 });
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

    if (error.message?.includes('Club not found') || error.message?.includes('Tournament not found')) {
      return NextResponse.json({
        userClubRole: 'none',
        userPlayerStatus: 'none'
      });
    }

    const status = resolveStatusCode(error);
    const errorMessage = status >= 500 ? "Internal server error" : (error?.message || "Request failed");
    return NextResponse.json({
      error: errorMessage,
      userClubRole: 'none',
      userPlayerStatus: 'none'
    }, { status });
  }
}

export const GET = withApiTelemetry('/api/tournaments/[code]/getUserRole', __GET as any);
