import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import mongoose from "mongoose";

// Local Tournament interface for non-populated data
interface Tournament {
  _id: string;
  tournamentPassword: string;
  code: string;
  name: string;
  boardCount: number;
  status: "created" | "group" | "knockout" | "finished";
  players: string[];
  startTime: Date;
  groups: {
    _id: string;
    players: {
      playerId: string;
      number: number;
    }[];
    matches: string[];
    standings: {
      playerId: string | mongoose.Types.ObjectId | null;
      points: number;
      legsWon: number;
      legsLost: number;
      legDifference: number;
      rank: number;
    }[];
  }[];
  knockout: {
    rounds: {
      matches: {
        _id: string;
        player1: string | null;
        player2: string | null;
        matchReference: string | null;
      }[];
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Fisher-Yates shuffle algorithm
function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await connectMongo();
    const { TournamentModel, MatchModel, BoardModel } = getModels();
    const { code } = await params;

    const tournament: Tournament | null = await TournamentModel.findOne({ code }).lean<Tournament>();
    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    // Validate exactly 16 groups
    if (tournament.groups.length !== 16) {
      return NextResponse.json(
        { error: "Pontosan 16 csoport szükséges, de jelenleg " + tournament.groups.length + " van" },
        { status: 400 }
      );
    }

    // Hardcoded total players for this scenario
    const totalPlayers = tournament.players.length;
    const minimumPlayersRequired = 70; // As per requirement
    if (totalPlayers < minimumPlayersRequired) {
      return NextResponse.json(
        { error: `Legalább ${minimumPlayersRequired} játékos szükséges (jelenleg ${totalPlayers} van)` },
        { status: 400 }
      );
    }

    // Hardcoded requirement: 32 players in knockout stage (16 from Round 1 winners + 16 group winners)
    const qualifyingPlayersCount = 32;

    // Get all standings, validate playerId
    const allStandings = tournament.groups.flatMap((group) =>
      group.standings
        .filter(
          (standing): standing is {
            playerId: string;
            points: number;
            legsWon: number;
            legsLost: number;
            legDifference: number;
            rank: number;
          } =>
            standing.playerId != null &&
            (typeof standing.playerId === "string" || standing.playerId instanceof mongoose.Types.ObjectId) &&
            mongoose.Types.ObjectId.isValid(standing.playerId.toString())
        )
        .map((standing) => ({
          ...standing,
          playerId: standing.playerId.toString(),
          groupId: group._id,
        }))
    );

    // Validate that we have enough players in standings for the knockout stage
    if (allStandings.length < totalPlayers) {
      console.error("Insufficient valid standings:", {
        count: allStandings.length,
        required: totalPlayers,
        standings: allStandings,
      });
      return NextResponse.json(
        {
          error: `Nem elegendő érvényes játékos adat a csoportkörben (legalább ${totalPlayers} játékos kell, jelenleg ${allStandings.length} van)`,
        },
        { status: 400 }
      );
    }

    // Group standings by group and sort by rank
    const groupStandings = tournament.groups.map((group) => ({
      groupId: group._id,
      standings: allStandings
        .filter((s) => s.groupId === group._id)
        .sort((a, b) => (a.rank || 0) - (b.rank || 0)),
    }));

    // Collect group winners (1st place), 2nd place, and 3rd place players
    const groupWinners: string[] = []; // 1st place players (seeded for round 2)
    const secondPlacePlayers: string[] = []; // 2nd place players (play in round 1)
    const thirdPlacePlayers: string[] = []; // 3rd place players (play in round 1)

    for (const group of groupStandings) {
      if (group.standings.length >= 1) {
        groupWinners.push(group.standings[0].playerId); // 1st place
      }
      if (group.standings.length >= 2) {
        secondPlacePlayers.push(group.standings[1].playerId); // 2nd place
      }
      if (group.standings.length >= 3) {
        thirdPlacePlayers.push(group.standings[2].playerId); // 3rd place
      }
    }

    // Log collected players
    console.log("Group winners (1st place):", groupWinners.length);
    console.log("Second place players:", secondPlacePlayers.length);
    console.log("Third place players:", thirdPlacePlayers.length);

    // Validate counts
    if (groupWinners.length !== 16) {
      return NextResponse.json(
        { error: `Pontosan 16 csoportelső szükséges, de ${groupWinners.length} van` },
        { status: 400 }
      );
    }
    if (secondPlacePlayers.length + thirdPlacePlayers.length < 32) {
      return NextResponse.json(
        {
          error: `Legalább 32 játékos szükséges az első körhöz (2. és 3. helyezettek), de csak ${secondPlacePlayers.length + thirdPlacePlayers.length} van`,
        },
        { status: 400 }
      );
    }

    // Shuffle second and third place players together for round 1
    const round1Players = shuffle([...secondPlacePlayers, ...thirdPlacePlayers].slice(0, 32));
    console.log("Round 1 players (shuffled 2nd and 3rd place):", round1Players.length);

    // Shuffle group winners for round 2
    const round2SeededPlayers = shuffle([...groupWinners]);
    console.log("Round 2 seeded players (shuffled 1st place):", round2SeededPlayers.length);

    // Get boards
    const boards = await BoardModel.find({ tournamentId: tournament._id }).lean();
    if (boards.length < 16) {
      return NextResponse.json(
        { error: `Nem elegendő tábla található (${boards.length} van, 16 szükséges)` },
        { status: 400 }
      );
    }

    // Generate first-round matches (16 matches with 32 players)
    const matches: any[] = [];
    const round1Matches: any[] = [];
    for (let i = 0; i < round1Players.length; i += 2) {
      if (i + 1 < round1Players.length) {
        const player1 = round1Players[i];
        const player2 = round1Players[i + 1];
        const boardId = boards[i % boards.length].boardId;
        const match = new MatchModel({
          tournamentId: new mongoose.Types.ObjectId(tournament._id),
          boardId,
          player1: new mongoose.Types.ObjectId(player1),
          player2: new mongoose.Types.ObjectId(player2),
          scorer: null,
          status: "pending",
          round: 1,
          isKnockout: true,
          stats: { player1: { legsWon: 0 }, player2: { legsWon: 0 } },
        });
        matches.push(match);
        round1Matches.push({
          _id: new mongoose.Types.ObjectId(),
          player1,
          player2,
          matchReference: match._id,
        });
      }
    }

    if (round1Matches.length !== 16) {
      console.error("Incorrect number of round 1 matches:", { count: round1Matches.length });
      return NextResponse.json(
        { error: `16 mérkőzés generálása szükséges az első körben, de csak ${round1Matches.length} készült` },
        { status: 400 }
      );
    }

    // Save first-round matches
    await MatchModel.insertMany(matches);

    // Generate second-round matches (16 matches: pre-seed with group winners)
    const round2Matches: any[] = [];
    for (let i = 0; i < 16; i++) {
      const seededPlayer = round2SeededPlayers[i];
      round2Matches.push({
        _id: new mongoose.Types.ObjectId(),
        player1: null, // Will be filled by round 1 match i's winner
        player2: seededPlayer, // Seeded player (group winner)
        matchReference: null, // No match created yet
      });
    }

    // Initialize remaining knockout rounds
    // We need 6 rounds for 32 players: 16, 16, 8, 4, 2, 1 matches
    const roundsCount = Math.ceil(Math.log2(qualifyingPlayersCount)) + 1; // 6 rounds for 32 players
    const knockoutRounds = Array.from({ length: roundsCount }, (_, i) => {
      if (i === 0) {
        return { matches: round1Matches }; // Round 1: 16 matches
      }
      if (i === 1) {
        return { matches: round2Matches }; // Round 2: 16 matches
      }
      // Subsequent rounds: halve the number of matches each round
      const matchCount = Math.pow(2, Math.ceil(Math.log2(qualifyingPlayersCount)) - i); // 8, 4, 2, 1
      return {
        matches: Array.from({ length: matchCount }, () => ({
          _id: new mongoose.Types.ObjectId(),
          player1: null,
          player2: null,
          matchReference: null,
        })),
      };
    });

    // Log the number of matches per round for debugging
    knockoutRounds.forEach((round, index) => {
      console.log(`Round ${index + 1}: ${round.matches.length} matches`);
    });

    // Update tournament
    await TournamentModel.updateOne(
      { code },
      {
        $set: {
          knockout: { rounds: knockoutRounds },
          status: "knockout",
        },
      }
    );

    // Update board statuses
    await Promise.all(
      boards.slice(0, Math.min(round1Matches.length, boards.length)).map((board) =>
        BoardModel.updateOne(
          { _id: board._id },
          { status: "waiting", updatedAt: new Date() }
        )
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error generating knockout matches:", error, {
      tournamentCode: (await params).code,
    });
    return NextResponse.json(
      { error: error.message || "Nem sikerült a kieséses szakasz generálása" },
      { status: 500 }
    );
  }
}