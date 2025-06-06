import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import mongoose, { isValidObjectId } from "mongoose";
import { Match as MatchSchema } from "@/types/matchSchema";

// Updated Standing interface
interface Standing {
  playerId: string | mongoose.Types.ObjectId;
  points: number;
  legsWon: number;
  legsLost: number;
  legDifference: number;
  rank: number;
}

// Plain JS interface for lean() results
interface PopulatedMatch {
  _id: string;
  tournamentId: string;
  boardId: string;
  round?: number;
  isKnockout: boolean;
  status: "pending" | "ongoing" | "finished";
  player1: { _id: string; name: string };
  player2: { _id: string; name: string };
  scorer?: { _id: string; name: string };
  stats: {
    player1: { legsWon: number; dartsThrown: number; average: number; checkoutRate: number };
    player2: { legsWon: number; dartsThrown: number; average: number; checkoutRate: number };
  };
  highestCheckout: { player1: number; player2: number };
  oneEighties: {
    player1: { count: number; darts: number[] };
    player2: { count: number; darts: number[] };
  };
  legs?: {
    player1Throws: { score: number; darts: number }[];
    player2Throws: { score: number; darts: number }[];
    winnerId: string;
    checkoutDarts?: number;
    doubleAttempts?: number;
    highestCheckout?: { score: number; darts: number; playerId: string };
    oneEighties?: { player1: number[]; player2: number[] };
  }[];
  winner?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string; matchId: string }> }
) {
  try {
    await connectMongo();
    const { MatchModel, TournamentModel, BoardModel } = getModels();
    const { tournamentId, matchId } = await params;

    // Validate ObjectIds
    if (!isValidObjectId(tournamentId) || !isValidObjectId(matchId)) {
      return NextResponse.json({ error: "Érvénytelen tournamentId vagy matchId" }, { status: 400 });
    }

    const { winnerId, player1LegsWon, player2LegsWon, stats, highestCheckout, oneEighties } =
      await request.json();

    // Validation
    if (
      !winnerId ||
      player1LegsWon == null ||
      player2LegsWon == null ||
      !stats ||
      !highestCheckout ||
      !oneEighties
    ) {
      console.error("Missing required fields:", {
        winnerId,
        player1LegsWon,
        player2LegsWon,
        stats,
        highestCheckout,
        oneEighties,
      });
      return NextResponse.json({ error: "Hiányzó adatok" }, { status: 400 });
    }

    if (
      typeof highestCheckout.player1 !== "number" ||
      typeof highestCheckout.player2 !== "number" ||
      !Number.isInteger(highestCheckout.player1) ||
      !Number.isInteger(highestCheckout.player2) ||
      highestCheckout.player1 < 0 ||
      highestCheckout.player2 < 0
    ) {
      console.error("Invalid highestCheckout data:", highestCheckout);
      return NextResponse.json({ error: "Érvénytelen highestCheckout adat" }, { status: 400 });
    }

    if (
      typeof oneEighties.player1.count !== "number" ||
      typeof oneEighties.player2.count !== "number" ||
      !Array.isArray(oneEighties.player1.darts) ||
      !Array.isArray(oneEighties.player2.darts) ||
      !oneEighties.player1.darts.every((d: number) => Number.isInteger(d) && d > 0) ||
      !oneEighties.player2.darts.every((d: number) => Number.isInteger(d) && d > 0)
    ) {
      console.error("Invalid oneEighties data:", oneEighties);
      return NextResponse.json({ error: "Érvénytelen oneEighties adat" }, { status: 400 });
    }

    // Fetch match (for reading, using lean())
    const match = await MatchModel.findById(matchId)
      .populate("player1", "name")
      .populate("player2", "name")
      .populate("scorer", "name")
      .lean<PopulatedMatch>();
    if (!match) {
      console.error(`Match not found for matchId: ${matchId}`);
      return NextResponse.json({ error: "Mérkőzés nem található" }, { status: 404 });
    }

    console.log("Match data:", {
      player1Id: match.player1._id,
      player2Id: match.player2._id,
      winnerId,
      round: match.round,
      status: match.status,
    });

    // Validate winner
    if (![match.player1._id.toString(), match.player2._id.toString()].includes(winnerId)) {
      console.error(`Invalid winnerId: ${winnerId}, expected: ${match.player1._id} or ${match.player2._id}`);
      return NextResponse.json({ error: "Érvénytelen győztes ID" }, { status: 400 });
    }

    // Fetch tournament
    const tournament = await TournamentModel.findOne({ _id: tournamentId });
    if (!tournament) {
      console.error(`Tournament not found for tournamentId: ${tournamentId}`);
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    // Revert previous results if match was already finished
    if (match.status === "finished") {
      if (match.isKnockout) {
        const currentRoundIndex = (match.round || 1) - 1;
        const currentRound = tournament.knockout.rounds[currentRoundIndex];
        if (currentRound) {
          const matchIndex = currentRound.matches.findIndex(
            (m: any) => m.matchReference?.toString() === matchId
          );
          if (matchIndex !== -1) {
            const nextRoundIndex = currentRoundIndex + 1;
            let nextMatchIndex: number;

            // Special case for round 1 to round 2
            if (currentRoundIndex === 0) {
              nextMatchIndex = matchIndex; // Direct mapping: round 1 match i -> round 2 match i
            } else {
              nextMatchIndex = Math.floor(matchIndex / 2); // Standard pairing
            }

            const isFirstWinner = currentRoundIndex === 0 ? true : matchIndex % 2 === 0;

            if (nextRoundIndex < tournament.knockout.rounds.length) {
              const nextRound = tournament.knockout.rounds[nextRoundIndex];
              const nextKnockoutMatch = nextRound.matches[nextMatchIndex];
              if (nextKnockoutMatch) {
                if (isFirstWinner) {
                  nextKnockoutMatch.player1 = null;
                } else {
                  nextKnockoutMatch.player2 = null;
                }
                if (nextKnockoutMatch.matchReference) {
                  await MatchModel.deleteOne({ _id: nextKnockoutMatch.matchReference });
                  nextKnockoutMatch.matchReference = null;
                }
              }
            }
          }
        }
      } else {
        const groupIndex = match.round || 0;
        console.log(`Processing group stage revert for groupIndex: ${groupIndex}`);

        if (!tournament.groups[groupIndex]) {
          console.error(`Group not found at index: ${groupIndex}, groups:`, tournament.groups);
          return NextResponse.json({ error: "Csoport nem található" }, { status: 404 });
        }

        const group = tournament.groups[groupIndex];

        const player1Standing = group.standings?.find(
          (s: Standing) => {
            const playerId = typeof s.playerId === "string" ? s.playerId : s.playerId.toString();
            const matchPlayerId = match.player1._id.toString();
            const isMatch = playerId === matchPlayerId;
            console.log(
              `Checking player1Standing (revert): s.playerId=${playerId}, match.player1._id=${matchPlayerId}, isMatch=${isMatch}`
            );
            return isMatch;
          }
        );
        const player2Standing = group.standings?.find(
          (s: Standing) => {
            const playerId = typeof s.playerId === "string" ? s.playerId : s.playerId.toString();
            const matchPlayerId = match.player2._id.toString();
            const isMatch = playerId === matchPlayerId;
            console.log(
              `Checking player2Standing (revert): s.playerId=${playerId}, match.player2._id=${matchPlayerId}, isMatch=${isMatch}`
            );
            return isMatch;
          }
        );

        if (!player1Standing || !player2Standing) {
          console.error("Player standings not found during revert:", {
            player1StandingExists: !!player1Standing,
            player2StandingExists: !!player2Standing,
            player1Id: match.player1._id,
            player2Id: match.player2._id,
            standings: group.standings,
          });
          return NextResponse.json(
            { error: "Nem sikerült a korábbi csoport állás visszaállítása: játékosok nem találhatók a ranglistán" },
            { status: 400 }
          );
        }
        if (match.winner && match.winner === match.player1._id) {
          player1Standing.points = Math.max(0, (player1Standing.points || 0) - 2);
        } else if (match.winner && match.winner === match.player2._id) {
          player2Standing.points = Math.max(0, (player2Standing.points || 0) - 2);
        }

        player1Standing.legsWon = Math.max(0, (player1Standing.legsWon || 0) - match.stats.player1.legsWon);
        player1Standing.legsLost = Math.max(0, (player1Standing.legsLost || 0) - match.stats.player2.legsWon);
        player1Standing.legDifference = player1Standing.legsWon - player1Standing.legsLost;

        player2Standing.legsWon = Math.max(0, (player2Standing.legsWon || 0) - match.stats.player2.legsWon);
        player2Standing.legsLost = Math.max(0, (player2Standing.legsLost || 0) - match.stats.player1.legsWon);
        player2Standing.legDifference = player2Standing.legsWon - player2Standing.legsLost;

        const groupMatches = await MatchModel.find({
          tournamentId: match.tournamentId,
          round: groupIndex,
          status: "finished",
          _id: { $ne: matchId },
        }).lean();

        const sortedStandings = [...(group.standings || [])].sort((a: Standing, b: Standing) => {
          const aPoints = a.points || 0;
          const bPoints = b.points || 0;
          const aLegDifference = a.legDifference || 0;
          const bLegDifference = b.legDifference || 0;
          const aPlayerId = typeof a.playerId === "string" ? a.playerId : a.playerId.toString();
          const bPlayerId = typeof b.playerId === "string" ? b.playerId : b.playerId.toString();

          if (aPoints !== bPoints) return bPoints - aPoints;
          if (aLegDifference !== bLegDifference) return bLegDifference - aLegDifference;

          const headToHeadMatch = groupMatches.find(
            (m: any) =>
              (m.player1.toString() === aPlayerId && m.player2.toString() === bPlayerId) ||
              (m.player1.toString() === bPlayerId && m.player2.toString() === aPlayerId)
          );
          if (headToHeadMatch) {
            if (headToHeadMatch.winner?.toString() === aPlayerId) return -1;
            if (headToHeadMatch.winner?.toString() === bPlayerId) return 1;
          }
          return 0;
        });

        let currentRank = 1;
        for (let i = 0; i < sortedStandings.length; i++) {
          if (i > 0) {
            const prev = sortedStandings[i - 1];
            const curr = sortedStandings[i];
            const areEqual = prev.points === curr.points && prev.legDifference === curr.legDifference;
            let headToHeadEqual = true;
            const prevPlayerId = typeof prev.playerId === "string" ? prev.playerId : prev.playerId.toString();
            const currPlayerId = typeof curr.playerId === "string" ? curr.playerId : curr.playerId.toString();

            if (areEqual) {
              const headToHeadMatch = groupMatches.find(
                (m: any) =>
                  (m.player1.toString() === prevPlayerId && m.player2.toString() === currPlayerId) ||
                  (m.player1.toString() === currPlayerId && m.player2.toString() === prevPlayerId)
              );
              headToHeadEqual = !headToHeadMatch || !headToHeadMatch.winner;
            }
            if (!areEqual || !headToHeadEqual) {
              currentRank = i + 1;
            }
          }
          sortedStandings[i].rank = currentRank;
        }

        group.standings = sortedStandings;
        await tournament.save(); // Save reverted standings
        console.log("Tournament saved after revert");
      }
    }

    // Update match
    const matchForUpdate = await MatchModel.findById(matchId);
    if (!matchForUpdate) {
      console.error(`Match not found for update, matchId: ${matchId}`);
      return NextResponse.json({ error: "Mérkőzés nem található a frissítéshez" }, { status: 404 });
    }

    matchForUpdate.status = "finished";
    matchForUpdate.winner = new mongoose.Types.ObjectId(winnerId);
    matchForUpdate.stats = {
      player1: {
        legsWon: player1LegsWon,
        dartsThrown: stats.player1.dartsThrown || 0,
        average: stats.player1.average || 0,
        checkoutRate: stats.player1.checkoutRate || 0,
      },
      player2: {
        legsWon: player2LegsWon,
        dartsThrown: stats.player2.dartsThrown || 0,
        average: stats.player2.average || 0,
        checkoutRate: stats.player2.checkoutRate || 0,
      },
    };
    matchForUpdate.highestCheckout = {
      player1: highestCheckout.player1 || 0,
      player2: highestCheckout.player2 || 0,
    };
    matchForUpdate.oneEighties = {
      player1: {
        count: oneEighties.player1.count || 0,
        darts: oneEighties.player1.darts || [],
      },
      player2: {
        count: oneEighties.player2.count || 0,
        darts: oneEighties.player2.darts || [],
      },
    };

    if (!matchForUpdate.legs) {
      matchForUpdate.legs = [];
    }

    await matchForUpdate.save();
    console.log(`Match updated successfully, matchId: ${matchId}`);

    // Handle progression
    if (match.isKnockout) {
      console.log("Knockout match");
      const currentRoundIndex = (match.round || 1) - 1; // 1-based to 0-based
      const currentRound = tournament.knockout.rounds[currentRoundIndex];
      if (!currentRound) {
        console.error(`Invalid round for knockout, currentRoundIndex: ${currentRoundIndex}`);
        return NextResponse.json({ error: "Érvénytelen kör" }, { status: 400 });
      }

      // Find the current match in knockout structure
      const knockoutMatch = currentRound.matches.find((m: any) => m.matchReference?.toString() === matchId);
      if (!knockoutMatch) {
        console.error(`Knockout match not found, matchId: ${matchId}`);
        return NextResponse.json({ error: "Mérkőzés nem található a kieséses körben" }, { status: 400 });
      }

      // Determine next round and match position
      const nextRoundIndex = currentRoundIndex + 1;
      const matchIndex = currentRound.matches.findIndex((m: any) => m.matchReference?.toString() === matchId);
      let nextMatchIndex: number;
      let isFirstWinner: boolean;

      // Special case: From round 1 to round 2, winner of match i goes to round 2 match i
      if (currentRoundIndex === 0) {
        nextMatchIndex = matchIndex; // Direct mapping: round 1 match i -> round 2 match i
        isFirstWinner = true; // Always place winner as player1 in round 2
      } else {
        nextMatchIndex = Math.floor(matchIndex / 2); // Standard pairing for round 2 onward
        isFirstWinner = matchIndex % 2 === 0; // Even index -> player1, odd -> player2
      }

      if (nextRoundIndex < tournament.knockout.rounds.length) {
        const nextRound = tournament.knockout.rounds[nextRoundIndex];
        if (!nextRound.matches[nextMatchIndex]) {
          nextRound.matches[nextMatchIndex] = {
            _id: new mongoose.Types.ObjectId(),
            player1: null,
            player2: null,
            matchReference: null,
          };
        }

        const nextKnockoutMatch = nextRound.matches[nextMatchIndex];
        if (isFirstWinner) {
          nextKnockoutMatch.player1 = new mongoose.Types.ObjectId(winnerId);
        } else {
          nextKnockoutMatch.player2 = new mongoose.Types.ObjectId(winnerId);
        }

        console.log(`Assigned winner ${winnerId} to next round match:`, {
          nextRoundIndex,
          nextMatchIndex,
          player1: nextKnockoutMatch.player1?.toString(),
          player2: nextKnockoutMatch.player2?.toString(),
        });

        // Save tournament to persist winner assignment
        await tournament.save();

        // If both players are assigned, create a new match for any round
        if (nextKnockoutMatch.player1 && nextKnockoutMatch.player2) {
          const boards = await BoardModel.find({ tournamentId: match.tournamentId }).lean();
          if (boards.length < tournament.boardCount) {
            console.error(`Insufficient boards, found: ${boards.length}, required: ${tournament.boardCount}`);
            return NextResponse.json({ error: "Nem elegendő tábla található" }, { status: 400 });
          }

          // Assign board: alternate boards based on round index (0-based)
          const boardIndex = nextRoundIndex % boards.length;
          const boardId = boards[boardIndex]?.boardId;
          if (!boardId) {
            console.error(`No available board at index: ${boardIndex}`);
            return NextResponse.json({ error: "Nincs elérhető tábla" }, { status: 400 });
          }

          const newMatch = new MatchModel({
            tournamentId: match.tournamentId,
            boardId,
            player1: nextKnockoutMatch.player1,
            player2: nextKnockoutMatch.player2,
            scorer: null,
            status: "pending",
            round: nextRoundIndex + 1,
            isKnockout: true,
            stats: {
              player1: { legsWon: 0, dartsThrown: 0, average: 0, checkoutRate: 0 },
              player2: { legsWon: 0, dartsThrown: 0, average: 0, checkoutRate: 0 },
            },
          });

          const savedMatch = await newMatch.save();
          nextKnockoutMatch.matchReference = savedMatch._id;

          console.log(`New match created for next round, matchId: ${savedMatch._id}`);

          const status = await MatchModel.findOne({
            boardId,
            status: "pending",
          });
          if (!status) {
            await BoardModel.findOneAndUpdate({ boardId }, { status: "idle", updatedAt: new Date() });
          } else {
            await BoardModel.findOneAndUpdate({ boardId }, { status: "waiting", updatedAt: new Date() });
          }

          await tournament.save(); // Save again after match reference update
        }
      }

      // Check if tournament is finished
      const finalRound = tournament.knockout.rounds[tournament.knockout.rounds.length - 1];
      if (finalRound.matches.length === 1 && finalRound.matches[0].matchReference) {
        const finalMatch = await MatchModel.findById(finalRound.matches[0].matchReference).lean<MatchSchema>();
        if (finalMatch && finalMatch.status === "finished") {
          await TournamentModel.updateOne({ _id: match.tournamentId }, { $set: { status: "finished" } });
          console.log(`Tournament marked as finished, tournamentId: ${tournamentId}`);
        }
      }
    } else {
      const groupIndex = match.round || 0;
      console.log(`Updating group standings for groupIndex: ${groupIndex}`);

      if (!tournament.groups[groupIndex]) {
        console.error(`Group not found at index: ${groupIndex}, groups:`, tournament.groups);
        return NextResponse.json({ error: "Csoport nem található" }, { status: 404 });
      }

      const group = tournament.groups[groupIndex];
      // Set boardNumber to groupIndex + 1 (1-based)
      group.boardNumber = groupIndex + 1; // Ensure 1-based numbering (1, 2, etc.)

      // Initialize standings if empty
      if (!group.standings || group.standings.length === 0) {
        console.log("Initializing empty group standings");
        group.standings = group.players.map((p: any) => ({
          playerId: p.playerId?.toString() || p._id?.toString(),
          points: 0,
          legsWon: 0,
          legsLost: 0,
          legDifference: 0,
          rank: 1,
        }));

        // Add players if not in standings
        if (
          !group.standings.some(
            (s: Standing) =>
              (typeof s.playerId === "string" ? s.playerId : s.playerId.toString()) === match.player1._id.toString()
          )
        ) {
          group.standings.push({
            playerId: match.player1._id,
            points: 0,
            legsWon: 0,
            legsLost: 0,
            legDifference: 0,
            rank: 1,
          });
          console.log(`Added player1 to standings: ${match.player1._id}`);
        }

        if (
          !group.standings.some(
            (s: Standing) =>
              (typeof s.playerId === "string" ? s.playerId : s.playerId.toString()) === match.player2._id.toString()
          )
        ) {
          group.standings.push({
            playerId: match.player2._id,
            points: 0,
            legsWon: 0,
            legsLost: 0,
            legDifference: 0,
            rank: 1,
          });
          console.log(`Added player2 to standings: ${match.player2._id}`);
        }
      }

      // Validate and fix all groups' boardNumber before saving
      tournament.groups.forEach((g: any, index: number) => {
        if (!g.boardNumber || typeof g.boardNumber !== "number") {
          g.boardNumber = index + 1; // Set 1-based boardNumber for all groups
          console.log(`Fixed boardNumber for group ${index}: ${g.boardNumber}`);
        }
      });

      const player1Standing = group.standings.find((s: Standing) => {
        const playerId = typeof s.playerId === "string" ? s.playerId : s.playerId.toString();
        const matchPlayerId = match.player1._id.toString();
        const isMatch = playerId === matchPlayerId;
        console.log(
          `Checking player1Standing (update): s.playerId=${playerId}, match.player1._id=${matchPlayerId}, isMatch=${isMatch}`
        );
        return isMatch;
      });
      const player2Standing = group.standings.find((s: Standing) => {
        const playerId = typeof s.playerId === "string" ? s.playerId : s.playerId.toString();
        const matchPlayerId = match.player2._id.toString();
        const isMatch = playerId === matchPlayerId;
        console.log(
          `Checking player2Standing (update): s.playerId=${playerId}, match.player2._id=${matchPlayerId}, isMatch=${isMatch}`
        );
        return isMatch;
      });

      if (!player1Standing || !player2Standing) {
        console.error("Player standings not found after initialization:", {
          player1StandingExists: !!player1Standing,
          player2StandingExists: !!player2Standing,
          player1Id: match.player1._id,
          player2Id: match.player2._id,
          standings: group.standings,
        });
        return NextResponse.json(
          { error: "Nem sikerült a csoport állás frissítése: játékosok nem találhatók a ranglistán" },
          { status: 400 }
        );
      }

      console.log("Points before update:", {
        player1Points: player1Standing.points,
        player2Points: player2Standing.points,
      });

      if (winnerId === match.player1._id.toString()) {
        player1Standing.points = (player1Standing.points || 0) + 2;
      } else if (winnerId === match.player2._id.toString()) {
        player2Standing.points = (player2Standing.points || 0) + 2;
      }

      player1Standing.legsWon = (player1Standing.legsWon || 0) + player1LegsWon;
      player1Standing.legsLost = (player1Standing.legsLost || 0) + player2LegsWon;
      player1Standing.legDifference = player1Standing.legsWon - player1Standing.legsLost;

      player2Standing.legsWon = (player2Standing.legsWon || 0) + player2LegsWon;
      player2Standing.legsLost = (player2Standing.legsLost || 0) + player1LegsWon;
      player2Standing.legDifference = player2Standing.legsWon - player2Standing.legsLost;

      console.log("Points after update:", {
        player1Points: player1Standing.points,
        player2Points: player2Standing.points,
      });

      const groupMatches = await MatchModel.find({
        tournamentId: match.tournamentId,
        round: groupIndex,
        status: "finished",
      }).lean();

      const sortedStandings = [...group.standings].sort((a: Standing, b: Standing) => {
        const aPoints = a.points || 0;
        const bPoints = b.points || 0;
        const aLegDifference = a.legDifference || 0;
        const bLegDifference = b.legDifference || 0;
        const aPlayerId = typeof a.playerId === "string" ? a.playerId : a.playerId.toString();
        const bPlayerId = typeof b.playerId === "string" ? b.playerId : b.playerId.toString();

        if (aPoints !== bPoints) return bPoints - aPoints;
        if (aLegDifference !== bLegDifference) return bLegDifference - aLegDifference;

        const headToHeadMatch = groupMatches.find(
          (m: any) =>
            (m.player1.toString() === aPlayerId && m.player2.toString() === bPlayerId) ||
            (m.player1.toString() === bPlayerId && m.player2.toString() === aPlayerId)
        );
        if (headToHeadMatch) {
          if (headToHeadMatch.winner?.toString() === aPlayerId) return -1;
          if (headToHeadMatch.winner?.toString() === bPlayerId) return 1;
        }
        return 0;
      });

      let currentRank = 1;
      for (let i = 0; i < sortedStandings.length; i++) {
        if (i > 0) {
          const prev = sortedStandings[i - 1];
          const curr = sortedStandings[i];
          const areEqual = prev.points === curr.points && prev.legDifference === curr.legDifference;
          let headToHeadEqual = true;
          const prevPlayerId = typeof prev.playerId === "string" ? prev.playerId : prev.playerId.toString();
          const currPlayerId = typeof curr.playerId === "string" ? curr.playerId : curr.playerId.toString();

          if (areEqual) {
            const headToHeadMatch = groupMatches.find(
              (m: any) =>
                (m.player1.toString() === prevPlayerId && m.player2.toString() === currPlayerId) ||
                (m.player1.toString() === currPlayerId && m.player2.toString() === prevPlayerId)
            );
            headToHeadEqual = !headToHeadMatch || !headToHeadMatch.winner;
          }
          if (!areEqual || !headToHeadEqual) {
            currentRank = i + 1;
          }
        }
        sortedStandings[i].rank = currentRank;
      }

      group.standings = sortedStandings;
      console.log("Group standings after update:", group.standings);

      const boardId = match.boardId;
      const status = await MatchModel.findOne({
        boardId,
        status: "pending",
      });
      if (!status) {
        await BoardModel.findOneAndUpdate({ boardId }, { status: "idle", updatedAt: new Date() });
      } else {
        await BoardModel.findOneAndUpdate({ boardId }, { status: "waiting", updatedAt: new Date() });
      }

      console.log(tournament.groups);

      try {
        await tournament.save();
        console.log(`Tournament standings saved, tournamentId: ${tournamentId}`);
      } catch (validationError: any) {
        console.error("Tournament save validation error:", validationError);
        return NextResponse.json(
          { error: "Nem sikerült a torna mentése: " + validationError.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error updating match result (tournamentId: ${(await params).tournamentId}, matchId: ${(await params).matchId}):`, error);
    return NextResponse.json(
      { error: error.message || "Nem sikerült a mérkőzés eredményeit frissíteni" },
      { status: 500 }
    );
  }
}