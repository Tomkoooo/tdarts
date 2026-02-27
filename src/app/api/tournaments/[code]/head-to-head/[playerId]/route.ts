import { NextRequest, NextResponse } from "next/server";

import { AuthService } from "@/database/services/auth.service";
import { PlayerModel } from "@/database/models/player.model";
import { TournamentService } from "@/database/services/tournament.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; playerId: string }> }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { code, playerId } = await params;
    if (!code || !playerId) {
      return NextResponse.json({ success: false, error: "Missing required params" }, { status: 400 });
    }

    const user = await AuthService.verifyToken(token);
    const tournament = await TournamentService.getTournament(code);

    const basePlayers = await PlayerModel.find({ userRef: user._id }).select("_id");
    const baseIds = basePlayers.map((p) => p._id);
    const teamPlayers = baseIds.length
      ? await PlayerModel.find({ members: { $in: baseIds } }).select("_id")
      : [];
    const userPlayerIds = new Set([...basePlayers, ...teamPlayers].map((p) => p._id.toString()));

    const userTournamentPlayer = tournament.tournamentPlayers.find((tp: any) =>
      userPlayerIds.has(tp.playerReference?.toString())
    );

    if (!userTournamentPlayer) {
      return NextResponse.json(
        { success: false, error: "Only tournament participants can view head-to-head from this screen" },
        { status: 403 }
      );
    }

    const targetInTournament = tournament.tournamentPlayers.some(
      (tp: any) => tp.playerReference?.toString() === playerId.toString()
    );
    if (!targetInTournament) {
      return NextResponse.json({ success: false, error: "Target player is not in this tournament" }, { status: 404 });
    }

    const data = await TournamentService.getHeadToHead(
      userTournamentPlayer.playerReference.toString(),
      playerId
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Tournament head-to-head error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch head-to-head" },
      { status: 500 }
    );
  }
}
