import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { PlayerService } from "@/database/services/player.service";
import { PlayerModel } from "@/database/models/player.model";

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const player = await PlayerService.findPlayerByUserId(userId);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  return NextResponse.json(player._id);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { playerId, userRef, name } = await request.json();
  
  let player;
  
  // If playerId is provided, use existing player
  if (playerId) {
    player = await PlayerModel.findById(playerId);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
  } else {
    // Create new player
    if (userRef) {
      player = await PlayerService.findOrCreatePlayerByUserRef(userRef, name);
    } else {
      player = await PlayerService.findOrCreatePlayerByName(name);
    }
  }
  
  const success = await TournamentService.addTournamentPlayer(code, player._id);
  return NextResponse.json({ success, playerId: player._id});
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { playerId, status } = await request.json();
  const success = await TournamentService.updateTournamentPlayerStatus(code, playerId, status);
  return NextResponse.json({ success });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { playerId } = await request.json();
  const success = await TournamentService.removeTournamentPlayer(code, playerId);
  return NextResponse.json({ success });
}