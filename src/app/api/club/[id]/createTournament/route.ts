import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongo();
    const { id } = await params;
    const { ClubModel, TournamentModel, PlayerModel, PlayerTournamentHistoryModel } = getModels();
    const body = await req.json();

    const { name, boardCount, description, startDate, players, tournamentPassword } = body;

    // Validation
    if (!name || !boardCount || !tournamentPassword) {
      return NextResponse.json(
        { error: "A torna neve, a táblák száma és a jelszó kötelező" },
        { status: 400 }
      );
    }

    const club = await ClubModel.findById(id);
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Unique player names
    const uniquePlayerNames = [...new Set((players || []).map((name: string) => name.trim()))].filter(
      (name): name is string => !!name
    );
    if (uniquePlayerNames.length !== (players || []).length) {
      return NextResponse.json(
        { error: "Duplikált játékosnevek nem megengedettek" },
        { status: 400 }
      );
    }

    // Handle players
    const playerIds: string[] = [];
    for (const playerName of uniquePlayerNames) {
      let player = await PlayerModel.findOne({ name: playerName, clubId: id });
      if (!player) {
        // Create player in Player collection with clubId
        player = await PlayerModel.create({ name: playerName, clubId: id });
      }
      playerIds.push(player._id.toString());
    }

    // Generate unique code
    const code = uuidv4().slice(0, 8).toUpperCase();

    // Create tournament
    const tournament = await TournamentModel.create({
      code,
      name,
      boardCount: parseInt(boardCount),
      description: description || "",
      startDate: startDate ? new Date(startDate) : undefined,
      players: playerIds,
      status: "created",
      tournamentPassword,
      clubId: id,
    });

    // Update club's tournaments
    club.tournaments.push(tournament._id);
    await club.save();

    // Create PlayerTournamentHistory
    for (const playerId of playerIds) {
      const existingHistory = await PlayerTournamentHistoryModel.findOne({
        playerId,
        tournamentId: tournament._id,
      });
      if (!existingHistory) {
        await PlayerTournamentHistoryModel.create({
          playerId,
          tournamentId: tournament._id,
          stats: {
            average: 0,
            checkoutRate: 0,
            legsWon: 0,
            legsPlayed: 0,
            matchesWon: 0,
            matchesPlayed: 0,
          },
        });
      }
    }

    return NextResponse.json(
      { message: "Torna sikeresen létrehozva", tournament },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating tournament:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Hiba: Egyedi kód szükséges" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Nem sikerült a torna létrehozása" },
      { status: 500 }
    );
  }
}