import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ tournamentId: string; matchId: string }> }) {
  try {
    await connectMongo();
    const { MatchModel } = getModels();
    const {  matchId } = await params;
    const {playerId} = await request.json();

    //update the player's status to ready
    const match = await MatchModel.findById(matchId);
    if (!match) {
      console.error("Match not found:", matchId);
      return NextResponse.json({ error: "Mérkőzés nem található" }, { status: 404 });
    }
    if (match.status === "ongoing") {
      console.error("Match cannot be marked as ready, status:", match.status);
      return NextResponse.json({ error: "A mérkőzés nem indítható" }, { status: 400 });
    }

    // Update the player's status
    if (match.player1.toString() === playerId) {
      match.player1Status = "ready";
    } else if (match.player2.toString() === playerId) {
      match.player2Status = "ready";
    } else {
      return NextResponse.json({ error: "Játékos nem található a mérkőzésben" }, { status: 400 });
    }
    await match.save();

    //return
    return NextResponse.json({ message: "A játékos állapota frissítve", matchId: match._id }, { status: 200 });

  }
    catch (error) {
        console.error("Error in PATCH /matches/[matchId]/ready:", error);
        return NextResponse.json({ error: "Nem sikerült a mérkőzés állapotának frissítése" }, { status: 500 });
    }
}