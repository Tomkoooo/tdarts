import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { Match } from "@/types/tournamentSchema";

export async function PATCH(request: Request, { params }: { params: Promise<{ tournamentId: string; matchId: string }> }) {
  try {
    await connectMongo();
    const { MatchModel, BoardModel } = getModels();
    const { matchId } = await params;
    const { boardId, tournamentId } = await request.json();

    // Find and validate the match
    const match = await MatchModel.findById(matchId);
    if (!match) {
      console.error("Match not found:", matchId);
      return NextResponse.json({ error: "Mérkőzés nem található" }, { status: 404 });
    }

    if (match.status !== "pending") {
      console.error("Match cannot be started, status:", match.status);
      return NextResponse.json({ error: "A mérkőzés nem indítható" }, { status: 400 });
    }

    // Update the board
    const board = await BoardModel.findOneAndUpdate(
      { boardId },
      { status: "playing", currentMatch: matchId, updatedAt: new Date() },
      { new: true }
    );
    if (!board) {
      console.error("Board not found:", boardId);
      return NextResponse.json({ error: "Tábla nem található" }, { status: 404 });
    }

    // Update match status and boardId
    match.status = "ongoing";
    match.boardId = boardId;
    await match.save();

    // Find the next pending match, excluding the current match
    const nextMatch = await MatchModel.findOne({
      tournamentId,
      status: "pending",
      _id: { $ne: matchId },
    })
      .sort({ createdAt: 1 })
      .lean<Match>();

    // Update waitingPlayers for the current board only
    const waitingPlayers = nextMatch
      ? [nextMatch.player1, nextMatch.player2]
      : [];

    await BoardModel.updateOne(
      { boardId },
      {
        $set: {
          waitingPlayers,
        },
      }
    );


    return NextResponse.json({ message: "Mérkőzés elindítva" });
  } catch (error) {
    console.error("Hiba a mérkőzés indításakor:", error);
    return NextResponse.json({ error: "Nem sikerült a mérkőzés indítása" }, { status: 500 });
  }
}