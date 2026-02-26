import { NextRequest, NextResponse } from "next/server";

import { PlayerService } from "@/database/services/player.service";
import { TournamentService } from "@/database/services/tournament.service";
import { AuthService } from "@/database/services/auth.service";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const currentPlayer = await PlayerService.findPlayerByUserId(user._id.toString());
    if (!currentPlayer) {
      return NextResponse.json({ success: false, error: "Player profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const opponentId = searchParams.get("opponentId");
    const seasonParam = searchParams.get("season");
    const mode = searchParams.get("mode");

    const season = seasonParam ? Number(seasonParam) : undefined;

    if (mode === "top-opponents") {
      const topOpponents = await TournamentService.getTopHeadToHeadOpponents(currentPlayer._id.toString(), {
        season: Number.isFinite(season) ? season : undefined,
        limit: 5,
      });
      return NextResponse.json({ success: true, data: { topOpponents } });
    }

    if (!opponentId) {
      return NextResponse.json({ success: false, error: "Missing opponentId" }, { status: 400 });
    }

    const data = await TournamentService.getHeadToHead(currentPlayer._id.toString(), opponentId, {
      season: Number.isFinite(season) ? season : undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Profile head-to-head error:", error);
    const status = error?.message === "Player not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch head-to-head" },
      { status }
    );
  }
}
