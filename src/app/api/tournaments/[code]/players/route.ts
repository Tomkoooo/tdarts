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
  
  // Get user from JWT token
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  
  const { playerId, userRef, name } = await request.json();
  
  let player;
  console.log('Adding player:', { playerId, userRef, name });
  
  // If playerId is provided, use existing player (only for guest players)
  if (playerId) {
    player = await PlayerModel.findById(playerId);
    if (!player) {
      throw new Error('Player not found');
    }
  } else {
    // Create new player
    if (userRef && name) {
      player = await PlayerService.findOrCreatePlayerByUserRef(userRef, name);
    } else if (name) {
      player = await PlayerService.findOrCreatePlayerByName(name);
    } else {
      throw new Error('Missing required data: name or userRef');
    }
  }
  
  const success = await TournamentService.addTournamentPlayer(code, player._id);
  return NextResponse.json({ success, playerId: player._id});
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  
  // Get user from JWT token
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playerId, status } = await request.json();
  const success = await TournamentService.updateTournamentPlayerStatus(code, playerId, status);
  return NextResponse.json({ success });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  
  // Get user from JWT token
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    
  const { playerId } = await request.json();
  const success = await TournamentService.removeTournamentPlayer(code, playerId);
  return NextResponse.json({ success });
}