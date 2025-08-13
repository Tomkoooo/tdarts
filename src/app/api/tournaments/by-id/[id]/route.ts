import { NextRequest, NextResponse } from "next/server";
import { TournamentModel } from "@/database/models/tournament.model";
import { connectMongo } from "@/lib/mongoose";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;

    const tournament = await TournamentModel.findById(id)
      .populate('tournamentPlayers.playerReference')
      .select('clubId tournamentId tournamentSettings');

    if (!tournament) {
      return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      tournament: {
        _id: tournament._id,
        tournamentId: tournament.tournamentId,
        clubId: tournament.clubId,
        tournamentSettings: tournament.tournamentSettings
      }
    });
  } catch (error) {
    console.error('Error fetching tournament by ID:', error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
