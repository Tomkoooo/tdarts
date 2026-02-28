import { NextRequest, NextResponse } from "next/server";
import { withApiTelemetry } from '@/lib/api-telemetry';

import { AuthService } from "@/database/services/auth.service";
import { PlayerService } from "@/database/services/player.service";
import { PlayerModel } from "@/database/models/player.model";
import { TournamentService } from "@/database/services/tournament.service";

async function __GET(
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
    const currentPlayer = await PlayerService.findPlayerByUserId(user._id.toString());
    if (!currentPlayer) {
      return NextResponse.json({ success: false, error: "Player profile not found" }, { status: 404 });
    }

    const getRefId = (value: any) => {
      if (!value) return "";
      if (typeof value === "string") return value;
      if (typeof value?.toString === "function" && value?.constructor?.name === "ObjectId") return value.toString();
      if (value?._id) return value._id.toString();
      return value.toString?.() || "";
    };

    const basePlayers = await PlayerModel.find({ userRef: user._id }).select("_id");
    const baseIds = basePlayers.map((p) => p._id);
    const teamPlayers = baseIds.length
      ? await PlayerModel.find({ members: { $in: baseIds } }).select("_id")
      : [];
    const userPlayerIds = new Set([...basePlayers, ...teamPlayers].map((p) => p._id.toString()));

    const userTournamentPlayer = tournament.tournamentPlayers.find((tp: any) =>
      userPlayerIds.has(getRefId(tp.playerReference))
    );

    const targetInTournament = tournament.tournamentPlayers.some(
      (tp: any) => getRefId(tp.playerReference) === playerId.toString()
    );
    if (!targetInTournament) {
      return NextResponse.json({ success: false, error: "Target player is not in this tournament" }, { status: 404 });
    }

    const data = await TournamentService.getHeadToHead(
      userTournamentPlayer ? getRefId(userTournamentPlayer.playerReference) : currentPlayer._id.toString(),
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

export const GET = withApiTelemetry('/api/tournaments/[code]/head-to-head/[playerId]', __GET as any);
