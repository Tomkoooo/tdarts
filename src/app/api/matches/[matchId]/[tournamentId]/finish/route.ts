import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { Match } from "@/types/matchSchema";
import { Tournament } from "@/types/tournamentSchema";

// Interface for lean() results
interface PopulatedMatch {
  _id: string;
  tournamentId: string;
  boardId: string;
  round?: number;
  isKnockout: boolean;
  status: "pending" | "ongoing" | "finished";
  player1: { _id: string; name: string } | null;
  player2: { _id: string; name: string } | null;
  scorer?: { _id: string; name: string } | null;
  stats?: {
    player1: { legsWon: number; dartsThrown: number; average: number };
    player2: { legsWon: number; dartsThrown: number; average: number };
  };
  highestCheckout?: { player1: number; player2: number };
  oneEighties?: {
    player1: { count: number; darts: number[] };
    player2: { count: number; darts: number[] };
  };
  legs?: any[];
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
    const { winnerId, player1LegsWon, player2LegsWon, stats, highestCheckout, oneEighties } =
      await request.json();

    // Validate required fields
    if (
      !winnerId ||
      player1LegsWon == null ||
      player2LegsWon == null ||
      !stats ||
      !highestCheckout ||
      !oneEighties
    ) {
      return NextResponse.json({ error: "Hiányzó adatok" }, { status: 400 });
    }

    // Validate highestCheckout and oneEighties structure
    if (
      typeof highestCheckout.player1 !== "number" ||
      typeof highestCheckout.player2 !== "number" ||
      !Number.isInteger(highestCheckout.player1) ||
      !Number.isInteger(highestCheckout.player2) ||
      highestCheckout.player1 < 0 ||
      highestCheckout.player2 < 0
    ) {
      return NextResponse.json({ error: "Érvénytelen highestCheckout adat" }, { status: 400 });
    }

    if (
      typeof oneEighties.player1.count !== "number" ||
      typeof oneEighties.player2.count !== "number" ||
      !Array.isArray(oneEighties.player1.darts) ||
      !Array.isArray(oneEighties.player2.darts) ||
      !oneEighties.player1.darts.every((d: any) => Number.isInteger(d) && d > 0) ||
      !oneEighties.player2.darts.every((d: any) => Number.isInteger(d) && d > 0)
    ) {
      return NextResponse.json({ error: "Érvénytelen oneEighties adat" }, { status: 400 });
    }

    // Find the match with lean() to ensure a plain object
    const match = await MatchModel.findById(matchId)
      .populate("player1", "name")
      .populate("player2", "name")
      .populate("scorer", "name")
      .lean<PopulatedMatch>();
    if (!match) {
      return NextResponse.json({ error: "Mérkőzés nem található" }, { status: 404 });
    }

    // Debug population
    if (!match.player1 || !match.player2) {
      console.error("Population failed:", {
        matchId,
        player1: match.player1,
        player2: match.player2,
      });
      return NextResponse.json({ error: "Játékosok adatai nem tölthetők be" }, { status: 500 });
    }

    console.log("Match players:", {
      player1Id: match.player1._id,
      player2Id: match.player2._id,
      winnerId,
    });
    
    // Normalize all IDs to strings for comparison
    const player1Id = match.player1._id.toString();
    const player2Id = match.player2._id.toString();
    const normalizedWinnerId = winnerId.toString();
    
    if (![player1Id, player2Id].includes(normalizedWinnerId)) {
      console.error("Invalid winnerId:", {
        normalizedWinnerId,
        player1Id,
        player2Id,
      });
      return NextResponse.json({ error: "Érvénytelen győztes ID" }, { status: 400 });
    }

    // Update match (fetch document for modification)
    const matchForUpdate = await MatchModel.findById(matchId);
    if (!matchForUpdate) {
      return NextResponse.json({ error: "Mérkőzés nem található a frissítéshez" }, { status: 404 });
    }

    matchForUpdate.status = "finished";
    matchForUpdate.winner = new mongoose.Types.ObjectId(winnerId);
    console.log(stats.player1, stats.player2);
    matchForUpdate.stats = {
      player1: {
        legsWon: player1LegsWon,
        dartsThrown: stats.player1.dartsThrown || 0,
        average: stats.player1.average || 0,
        highestCheckout: stats.player1.highestCheckout || 0,
        oneEighties: stats.player1.oneEighties.count || 0,
      },
      player2: {
        legsWon: player2LegsWon,
        dartsThrown: stats.player2.dartsThrown || 0,
        average: stats.player2.average || 0,
        highestCheckout: stats.player2.highestCheckout || 0,
        oneEighties: stats.player2.oneEighties.count || 0,
      },
    };

    if (!matchForUpdate.legs) {
      matchForUpdate.legs = [];
    }

    await matchForUpdate.save();

    // Fetch tournament using tournamentId
    const tournament = await TournamentModel.findOne({ _id: tournamentId });
    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    // Handle knockout stage logic
    if (match.isKnockout) {
      const currentRoundIndex = (match.round || 1) - 1; // 1-based to 0-based
      const currentRound = tournament.knockout.rounds[currentRoundIndex] as Tournament["knockout"]["rounds"][number];
      if (!currentRound) {
        return NextResponse.json({ error: "Érvénytelen kör" }, { status: 400 });
      }

      const knockoutMatch = currentRound.matches.find(
        (m) => m.matchReference?.toString() === matchId
      );
      if (!knockoutMatch) {
        return NextResponse.json(
          { error: "Mérkőzés nem található a kieséses körben" },
          { status: 400 }
        );
      }

      const nextRoundIndex = currentRoundIndex + 1;
      const matchIndex = currentRound.matches.findIndex(
        (m) => m.matchReference?.toString() === matchId
      );
      let nextMatchIndex: number;
      let isFirstWinner: boolean;

      if (currentRoundIndex === 0) {
        nextMatchIndex = matchIndex;
        isFirstWinner = true;
      } else {
        nextMatchIndex = Math.floor(matchIndex / 2);
        isFirstWinner = matchIndex % 2 === 0;
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
          nextKnockoutMatch.player1 = new mongoose.Types.ObjectId(normalizedWinnerId);
        } else {
          nextKnockoutMatch.player2 = new mongoose.Types.ObjectId(normalizedWinnerId);
        }

        if (nextKnockoutMatch.player1 && nextKnockoutMatch.player2) {
          const boards = await BoardModel.find({ tournamentId: match.tournamentId }).lean();
          if (boards.length < tournament.boardCount) {
            return NextResponse.json({ error: "Nem elegendő tábla található" }, { status: 400 });
          }

          const boardIndex = nextRoundIndex % boards.length;
          const boardId = boards[boardIndex]?.boardId;
          if (!boardId) {
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
            stats: { player1: { legsWon: 0 }, player2: { legsWon: 0 } },
          });

          const savedMatch = await newMatch.save();
          nextKnockoutMatch.matchReference = savedMatch._id;

          const status = await MatchModel.findOne({
            boardId,
            status: "pending",
          });
          if (!status) {
            await BoardModel.findOneAndUpdate(
              { boardId },
              { status: "idle", updatedAt: new Date() }
            );
          } else {
            await BoardModel.findOneAndUpdate(
              { boardId },
              { status: "waiting", updatedAt: new Date() }
            );
          }
        }

        await tournament.save();
      }

      const finalRound = tournament.knockout.rounds[tournament.knockout.rounds.length - 1];
      if (finalRound.matches.length === 1 && finalRound.matches[0].matchReference) {
        const finalMatch = await MatchModel.findById(
          finalRound.matches[0].matchReference
        ).lean<Match>();
        if (finalMatch && finalMatch.status === "finished") {
          await TournamentModel.updateOne(
            { _id: match.tournamentId },
            { $set: { status: "finished" } }
          );
        }
      }
    } else {
      // Handle group stage logic
      const groupIndex = match.round || 0;
      const group = tournament.groups[groupIndex];
      if (!group) {
        return NextResponse.json({ error: "Csoport nem található" }, { status: 404 });
      }

      if (!group.standings || group.standings.length === 0) {
        group.standings = group.players.map((p: any) => ({
          playerId: p.playerId.toString(),
          points: 0,
          legsWon: 0,
          legsLost: 0,
          legDifference: 0,
          rank: 0,
        }));
        if (
          !group.standings.some(
            (s: any) => s.playerId.toString() === player1Id
          )
        ) {
          group.standings.push({
            playerId: player1Id,
            points: 0,
            legsWon: 0,
            legsLost: 0,
            legDifference: 0,
            rank: 0,
          });
        }
        if (
          !group.standings.some(
            (s: any) => s.playerId.toString() === player2Id
          )
        ) {
          group.standings.push({
            playerId: player2Id,
            points: 0,
            legsWon: 0,
            legsLost: 0,
            legDifference: 0,
            rank: 0,
          });
        }
      }

      const player1Standing = group.standings.find(
        (s: any) => s.playerId.toString() === player1Id
      );
      const player2Standing = group.standings.find(
        (s: any) => s.playerId.toString() === player2Id
      );

      if (player1Standing && player2Standing) {
        if (normalizedWinnerId === player1Id) {
          player1Standing.points = (player1Standing.points || 0) + 2;
        } else if (normalizedWinnerId === player2Id) {
          player2Standing.points = (player2Standing.points || 0) + 2;
        }

        player1Standing.legsWon = (player1Standing.legsWon || 0) + player1LegsWon;
        player1Standing.legsLost = (player1Standing.legsLost || 0) + player2LegsWon;
        player1Standing.legDifference = player1Standing.legsWon - player1Standing.legsLost;

        player2Standing.legsWon = (player2Standing.legsWon || 0) + player2LegsWon;
        player2Standing.legsLost = (player2Standing.legsLost || 0) + player1LegsWon;
        player2Standing.legDifference = player2Standing.legsWon - player2Standing.legsLost;

        const groupMatches = await MatchModel.find({
          tournamentId: match.tournamentId,
          round: groupIndex,
          status: "finished",
          $or: [
            { player1: { $in: group.players.map((p: any) => p.playerId) } },
            { player2: { $in: group.players.map((p: any) => p.playerId) } },
          ],
        }).lean();

        const sortedStandings = [...group.standings].sort((a: any, b: any) => {
          if (a.points !== b.points) return b.points - a.points;
          if (a.legDifference !== b.legDifference) return b.legDifference - a.legDifference;

          const headToHeadMatch = groupMatches.find(
            (m: any) =>
              (m.player1.toString() === a.playerId.toString() &&
                m.player2.toString() === b.playerId.toString()) ||
              (m.player1.toString() === b.playerId.toString() &&
                m.player2.toString() === a.playerId.toString())
          );

          if (headToHeadMatch && headToHeadMatch.winner) {
            console.log("Head-to-head match found:", headToHeadMatch);
            if (headToHeadMatch.winner.toString() === a.playerId.toString()) return -1;
            if (headToHeadMatch.winner.toString() === b.playerId.toString()) return 1;
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
            if (areEqual) {
              const headToHeadMatch = groupMatches.find(
                (m: any) =>
                  (m.player1.toString() === prev.playerId.toString() &&
                    m.player2.toString() === curr.playerId.toString()) ||
                  (m.player1.toString() === curr.playerId.toString() &&
                    m.player2.toString() === prev.playerId.toString())
              );
              headToHeadEqual = !headToHeadMatch || !headToHeadMatch.winner;
            }
            if (!areEqual || !headToHeadEqual) currentRank = i + 1;
          }
          sortedStandings[i].rank = currentRank;
        }

        group.standings = sortedStandings;

        const boardId = match.boardId;
        const status = await MatchModel.findOne({
          boardId,
          status: "pending",
        });
        if (!status) {
          await BoardModel.findOneAndUpdate(
            { boardId },
            { status: "idle", updatedAt: new Date() }
          );
        } else {
          await BoardModel.findOneAndUpdate(
            { boardId },
            { status: "waiting", updatedAt: new Date() }
          );
        }

        await tournament.save();
      } else {
        console.error("Standings not found for players:", {
          player1Standing,
          player2Standing,
          player1Id,
          player2Id,
        });
        return NextResponse.json(
          { error: "Nem sikerült a csoport állás frissítése" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error finishing match (tournamentId: ${(await params).tournamentId}, matchId: ${(await params).matchId}):`, error);
    return NextResponse.json(
      { error: error.message || "Nem sikerült a mérkőzés befejezése" },
      { status: 500 }
    );
  }
}