import { NextResponse } from "next/server";
import { TournamentService } from '@/database/services/tournament.service';
import { connectMongo } from '@/lib/mongoose';

export async function POST(request: Request) {
  try {
    await connectMongo();
    const body = await request.json();
    // TournamentService should handle all validation and creation logic
    const tournament = await TournamentService.createTournament(body);
    return NextResponse.json({ message: "Torna sikeresen létrehozva", tournament, code: tournament.code }, { status: 201 });
  } catch (error: any) {
    console.error("Hiba a torna létrehozásakor:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Hiba: Egy játékos már hozzá van adva ehhez a tornához" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Nem sikerült a torna létrehozása" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await connectMongo();
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name")?.trim();
    const club = searchParams.get("club")?.trim();
    const date = searchParams.get("date")?.trim();
    const tournaments = await TournamentService.getTournaments({ name, club, date });
    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error("Hiba a tornák lekérésekor:", error);
    return NextResponse.json({ error: "Nem sikerült a tornák lekérése" }, { status: 500 });
  }
}