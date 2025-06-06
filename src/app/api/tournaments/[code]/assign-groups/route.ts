import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { Board } from "@/types/boardSchema";
import { Match } from "@/types/tournamentSchema";

function generateMatches(playerCount: number): { player1Idx: number; player2Idx: number; scorerIdx: number }[] {
  // Generate all possible pairs
  const matches: { player1Idx: number; player2Idx: number }[] = [];
  for (let i = 0; i < playerCount; i++) {
    for (let j = i + 1; j < playerCount; j++) {
      matches.push({ player1Idx: i, player2Idx: j });
    }
  }

  // Fisher-Yates shuffle
  function shuffle(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Count consecutive matches for each player
  function countConsecutiveMatches(matches: { player1Idx: number; player2Idx: number }[]): { player: number; count: number }[] {
    const consecutiveCounts: { [key: number]: number } = {};
    for (let i = 0; i < playerCount; i++) {
      consecutiveCounts[i] = 0;
    }

    for (let i = 1; i < matches.length; i++) {
      const prevMatch = matches[i - 1];
      const currMatch = matches[i];
      const prevPlayers = new Set([prevMatch.player1Idx, prevMatch.player2Idx]);
      const currPlayers = new Set([currMatch.player1Idx, currMatch.player2Idx]);

      for (const player of prevPlayers) {
        if (currPlayers.has(player)) {
          consecutiveCounts[player]++;
        }
      }
    }

    return Object.entries(consecutiveCounts).map(([player, count]) => ({
      player: parseInt(player),
      count,
    }));
  }

  // Try to find a valid match order
  const maxAttempts = 1000;
  let attempts = 0;
  let validOrder = false;

  while (!validOrder && attempts < maxAttempts) {
    shuffle(matches);
    const consecutiveMatches = countConsecutiveMatches(matches);
    const hasInvalidConsecutive = consecutiveMatches.some((cm) => cm.count > 2); // Relaxed to allow up to 2 consecutive matches

    if (!hasInvalidConsecutive) {
      validOrder = true;
    }
    attempts++;
  }

  if (!validOrder) {
    console.warn(`Nem sikerült ${maxAttempts} próbálkozás alatt érvényes mérkőzéssorrendet találni (playerCount: ${playerCount}).`);
    // Proceed with the last shuffled order to avoid blocking
  }

  // Assign scorers with balanced distribution
  const scorerCounts: { [key: number]: number } = {};
  for (let i = 0; i < playerCount; i++) {
    scorerCounts[i] = 0;
  }

  const finalMatches: { player1Idx: number; player2Idx: number; scorerIdx: number }[] = matches.map((match) => {
    // Possible scorers (exclude playing players)
    const possibleScorers: number[] = [];
    for (let k = 0; k < playerCount; k++) {
      if (k !== match.player1Idx && k !== match.player2Idx) {
        possibleScorers.push(k);
      }
    }

    let selectedScorer: number;
    if (possibleScorers.length === 0) {
      // For small groups (e.g., 3 players), allow a player to score their own match
      possibleScorers.push(match.player1Idx, match.player2Idx);
    }

    // Select scorer: prefer those who haven't scored, then least scored
    const neverScored = possibleScorers.filter((s) => scorerCounts[s] === 0);
    if (neverScored.length > 0) {
      selectedScorer = neverScored[Math.floor(Math.random() * neverScored.length)];
    } else {
      selectedScorer = possibleScorers.reduce((minS, s) =>
        scorerCounts[s] < scorerCounts[minS] ? s : scorerCounts[s] === scorerCounts[minS] && Math.random() < 0.5 ? s : minS,
        possibleScorers[0]
      );
    }

    // Validate selectedScorer
    if (selectedScorer === undefined || selectedScorer < 0 || selectedScorer >= playerCount) {
      console.error(`Invalid scorer selected: ${selectedScorer}, possibleScorers: ${possibleScorers}, match:`, match);
      throw new Error(`Érvénytelen író index: ${selectedScorer}`);
    }

    scorerCounts[selectedScorer]++;
    return { ...match, scorerIdx: selectedScorer };
  });

  // Check if every player scored at least once
  const allScored = Object.values(scorerCounts).every((count) => count >= 1);
  if (!allScored) {
    console.warn(`Nem minden játékos volt legalább egyszer író (playerCount: ${playerCount}):`, scorerCounts);
  }

  return finalMatches;
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await connectMongo();
    const { TournamentModel, BoardModel, MatchModel } = getModels();
    const { code } = await params;

    const tournament = await TournamentModel.findOne({ code });
    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    if (tournament.status === "finished") {
      return NextResponse.json({ error: "A torna már befejeződött" }, { status: 400 });
    }

    // Delete existing matches
    await MatchModel.deleteMany({ tournamentId: tournament._id });

    // Delete existing boards
    await BoardModel.deleteMany({ tournamentId: tournament._id });

    // Clear groups
    tournament.groups = [];
    await tournament.save();

    const players = [...tournament.players];
    const boardCount = tournament.boardCount;

    // Ensure exactly 16 groups (hardcoded requirement)
    const desiredGroupCount = 16;
    if (boardCount !== desiredGroupCount) {
      console.warn(`A táblák száma (${boardCount}) nem egyezik a kívánt csoportok számával (${desiredGroupCount}), frissítve.`);
      tournament.boardCount = desiredGroupCount;
      await tournament.save();
    }

    if (players.length < desiredGroupCount * 2) {
      throw new Error(
        `Túl kevés játékos (${players.length}) a ${desiredGroupCount} csoporthoz, minimum ${desiredGroupCount * 2} szükséges`
      );
    }

    // Distribute players evenly across 16 groups
    const playersPerGroupBase = Math.floor(players.length / desiredGroupCount); // Base number of players per group
    const extraPlayers = players.length % desiredGroupCount; // Remainder to distribute
    const groupSizes: number[] = Array(desiredGroupCount).fill(playersPerGroupBase);

    // Distribute the extra players: add 1 player to the first `extraPlayers` groups
    for (let i = 0; i < extraPlayers; i++) {
      groupSizes[i]++;
    }

    console.log(`Csoportméretek (${players.length} játékos, ${desiredGroupCount} csoport):`, groupSizes);

    // Shuffle players
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    const boards = [];
    for (let i = 1; i <= desiredGroupCount; i++) {
      boards.push({
        tournamentId: tournament._id,
        boardId: uuidv4(),
        boardNumber: i.toString(),
        status: "idle",
        waitingPlayers: [] as string[],
      });
    }
    await BoardModel.insertMany(boards);

    const groups = [];
    let playerIndex = 0;
    for (let groupIndex = 0; groupIndex < desiredGroupCount; groupIndex++) {
      const groupPlayerCount = groupSizes[groupIndex];
      const groupPlayers = players.slice(playerIndex, playerIndex + groupPlayerCount);
      playerIndex += groupPlayerCount;

      if (groupPlayers.length < 2) {
        console.warn(`Csoport ${groupIndex + 1} túl kevés játékossal (${groupPlayers.length}), kihagyva.`);
        continue;
      }

      const numberedPlayers = groupPlayers.map((playerId, index) => ({
        playerId,
        number: index + 1,
      }));

      const boardId = boards[groupIndex].boardId;
      if (!boardId) {
        throw new Error(`Nincs tábla a ${groupIndex + 1}. csoport számára`);
      }
      console.log(`Generating matches for group ${groupIndex}, boardId: ${boardId}, players: ${groupPlayers.length}`);

      const orderedMatches = generateMatches(numberedPlayers.length);

      const matches = [];
      for (const { player1Idx, player2Idx, scorerIdx } of orderedMatches) {
        const match = await MatchModel.create({
          tournamentId: tournament._id,
          boardId,
          player1Number: numberedPlayers[player1Idx].number,
          player2Number: numberedPlayers[player2Idx].number,
          scribeNumber: numberedPlayers[scorerIdx].number,
          player1: numberedPlayers[player1Idx].playerId,
          player2: numberedPlayers[player2Idx].playerId,
          scorer: numberedPlayers[scorerIdx].playerId,
          status: "pending",
          round: groupIndex,
          isKnockout: false,
        });

        matches.push(match._id);
      }

      groups.push({
        players: numberedPlayers,
        matches,
        boardNumber: boards[groupIndex].boardNumber,
        standings: numberedPlayers.map((p) => ({
          playerId: p.playerId,
          points: 0,
          legsWon: 0,
          legsLost: 0,
          legDifference: 0,
          rank: 0,
        })),
      });
    }

    if (groups.length !== desiredGroupCount) {
      throw new Error(
        `Nem sikerült ${desiredGroupCount} csoportot generálni: ${groups.length} csoport készült`
      );
    }

    tournament.groups = groups;
    tournament.status = "group";
    await tournament.save();

    const boardsOnTournament = await BoardModel.find({ tournamentId: tournament._id }).lean<Board[]>();
    // Update the boards' waitingPlayers with the first match players on the board
    for (const board of boardsOnTournament) {
      const firstMatch = await MatchModel.findOne({ boardId: board.boardId, status: "pending" })
        .sort({ createdAt: 1 })
        .lean<Match>();
      if (firstMatch) {
        board.waitingPlayers = [firstMatch.player1, firstMatch.player2];
        await BoardModel.updateOne(
          { _id: board._id },
          { $set: { waitingPlayers: board.waitingPlayers, status: "waiting" } }
        );
      }
    }

    return NextResponse.json({ message: "Csoportok és mérkőzések sikeresen újragenerálva" });
  } catch (error: any) {
    console.error(`Hiba a csoportok újragenerálásakor (code: ${(await params).code}):`, error);
    return NextResponse.json(
      { error: `Nem sikerült a csoportok újragenerálása: ${error.message}` },
      { status: 500 }
    );
  }
}