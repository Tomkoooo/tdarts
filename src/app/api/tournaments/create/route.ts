import { NextRequest, NextResponse } from 'next/server';
import { TournamentModel } from '@/database/models/tournament.model';
import { ClubModel } from '@/database/models/club.model';

export async function POST(req: NextRequest) {
  try {
    const { clubId, players, tournamentSettings } = await req.json();
    // players: playerRef-ek (ObjectId-k)
    // tournamentSettings: { format, legsPerMatch, startingScore, tournamentPassword }
    const club = await ClubModel.findById(clubId);
    if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    // Csoportgenerálás (példa: 4 fős csoportok, round robin, boardNumber hozzárendelés)
    const groupSize = 4;
    const groups = [];
    for (let i = 0; i < players.length; i += groupSize) {
      const groupPlayers = players.slice(i, i + groupSize);
      groups.push({
        id: `group_${groups.length + 1}`,
        board: club.boards[groups.length % club.boards.length].boardNumber,
        matches: [],
        players: groupPlayers,
      });
    }
    const tournament = new TournamentModel({
      clubId,
      players,
      tournamentSettings,
      groups,
      knockout: [],
    });
    await tournament.save();
    return NextResponse.json(tournament, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
} 