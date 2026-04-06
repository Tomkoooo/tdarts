import type { Leg } from "@/hooks/useDartGame";
import {
  createLocalLegVisitRows,
  dartCountForLocalPlayerInLeg,
  remainingForPlayerAfterLeg,
  computeBestWorstLegDartsForLocal,
} from "@/components/board/localMatchFinishUtils";
import {
  calculatePlayerArrows,
  type RecapThrow,
} from "@/lib/match-recap/calculatePlayerArrows";
import { cn } from "@/lib/utils";
import type {
  LocalMatchFinishSnapshot,
  MatchRecapModel,
  RecapLegBlock,
  RecapPlayerColumn,
  RecapVisitRow,
} from "@/components/match/matchRecapTypes";
import {
  recapLocalVisitCellClass,
  recapTournamentVisitCellClass,
} from "@/components/match/matchRecapScoreStyle";

export type MatchRecapHero = {
  brandLine: string;
  titleLine: string;
  scoreLine: string;
};

function fmtDash(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return String(n);
}

function count180s(throws: number[]): number {
  return throws.filter((x) => x === 180).length;
}

function countThrowsAtLeast(throws: number[], min: number): number {
  return throws.filter((x) => x >= min).length;
}

function firstNineVisitAvg(throws: number[]): number {
  const n = Math.min(9, throws.length);
  if (!n) return 0;
  return throws.slice(0, n).reduce((a, b) => a + b, 0) / n;
}

export function localSnapshotToRecapModel(
  snapshot: LocalMatchFinishSnapshot,
  hero: MatchRecapHero,
  player1Name: string,
  player2Name: string,
): MatchRecapModel {
  const { winner, player1: p1, player2: p2, legs, startingScore } = snapshot;

  const p1bw = computeBestWorstLegDartsForLocal(legs, 1);
  const p2bw = computeBestWorstLegDartsForLocal(legs, 2);

  const p1Col: RecapPlayerColumn = {
    name: player1Name,
    average: p1.stats.average.toFixed(2),
    firstNine: firstNineVisitAvg(p1.allThrows).toFixed(2),
    legsWon: p1.legsWon,
    visits: p1.stats.totalThrows,
    n180: count180s(p1.allThrows),
    n140: countThrowsAtLeast(p1.allThrows, 140),
    n100: countThrowsAtLeast(p1.allThrows, 100),
    highestCheckout: p1.stats.highestCheckout,
    bestLegDarts: fmtDash(p1bw.best),
    worstLegDarts: fmtDash(p1bw.worst),
  };

  const p2Col: RecapPlayerColumn = {
    name: player2Name,
    average: p2.stats.average.toFixed(2),
    firstNine: firstNineVisitAvg(p2.allThrows).toFixed(2),
    legsWon: p2.legsWon,
    visits: p2.stats.totalThrows,
    n180: count180s(p2.allThrows),
    n140: countThrowsAtLeast(p2.allThrows, 140),
    n100: countThrowsAtLeast(p2.allThrows, 100),
    highestCheckout: p2.stats.highestCheckout,
    bestLegDarts: fmtDash(p2bw.best),
    worstLegDarts: fmtDash(p2bw.worst),
  };

  const legBlocks: RecapLegBlock[] = legs.map((leg, legIndex) => {
    const isP1Winner = leg.winner === 1;
    const isP2Winner = leg.winner === 2;
    const winnerName = isP1Winner ? player1Name : player2Name;
    const rows = createLocalLegVisitRows(
      leg.player1Throws,
      leg.player2Throws,
      startingScore,
      leg.winner,
    );
    const visitRows: RecapVisitRow[] = rows.map((row) => ({
      p1After: row.p1After ?? "—",
      p2After: row.p2After ?? "—",
      p1Score: row.p1Throw ? row.p1Throw.score : "—",
      p2Score: row.p2Throw ? row.p2Throw.score : "—",
      centerLabel: row.arrowCount,
      p1CellClass: recapLocalVisitCellClass(row.p1Throw, isP1Winner),
      p2CellClass: recapLocalVisitCellClass(row.p2Throw, isP2Winner),
    }));

    return {
      legIndex,
      winnerName,
      p1DartsApprox: true,
      p2DartsApprox: true,
      p1DartCount: dartCountForLocalPlayerInLeg(leg, 1),
      p2DartCount: dartCountForLocalPlayerInLeg(leg, 2),
      rows: visitRows,
      p1Remaining: isP1Winner ? 0 : remainingForPlayerAfterLeg(leg, startingScore, 1),
      p2Remaining: isP2Winner ? 0 : remainingForPlayerAfterLeg(leg, startingScore, 2),
      isP1Winner,
      isP2Winner,
    };
  });

  return {
    hero,
    player1: p1Col,
    player2: p2Col,
    legs: legBlocks,
  };
}

export type TournamentLegForRecap = {
  player1Score: number;
  player2Score: number;
  player1Throws: RecapThrow[];
  player2Throws: RecapThrow[];
  winnerId: { _id: string; name: string };
  winnerArrowCount?: number;
  loserRemainingScore?: number;
  player1TotalDarts?: number;
  player2TotalDarts?: number;
  createdAt: string;
};

function calculateLoserRemainingForLeg(
  leg: TournamentLegForRecap,
  isPlayer1Winner: boolean,
  isPlayer2Winner: boolean,
): number {
  if (typeof leg.loserRemainingScore === "number" && leg.loserRemainingScore >= 0) {
    return leg.loserRemainingScore;
  }
  const p1 = Number(leg.player1Score || 0);
  const p2 = Number(leg.player2Score || 0);
  if (isPlayer1Winner) return Math.max(0, p1 - p2);
  if (isPlayer2Winner) return Math.max(0, p2 - p1);
  return 0;
}

function computeTournamentBestWorst(
  legs: TournamentLegForRecap[],
  playerOneId: string | undefined,
  playerTwoId: string | undefined,
  player: 1 | 2,
): { best: number | null; worst: number | null } {
  const played: number[] = [];
  const won: number[] = [];
  for (const leg of legs) {
    const isP1Win = playerOneId != null && leg.winnerId?._id === playerOneId;
    const isP2Win = playerTwoId != null && leg.winnerId?._id === playerTwoId;
    if (player === 1) {
      if (!leg.player1Throws.length) continue;
      const d = calculatePlayerArrows(
        leg.player1Throws,
        leg.player1TotalDarts,
        isP1Win,
        leg.winnerArrowCount,
      );
      played.push(d);
      if (isP1Win) won.push(d);
    } else {
      if (!leg.player2Throws.length) continue;
      const d = calculatePlayerArrows(
        leg.player2Throws,
        leg.player2TotalDarts,
        isP2Win,
        leg.winnerArrowCount,
      );
      played.push(d);
      if (isP2Win) won.push(d);
    }
  }
  if (played.length === 0) return { best: null, worst: null };
  const best = won.length > 0 ? Math.min(...won) : null;
  const worst =
    won.length > 0 ? Math.max(...won) : Math.max(...played);
  return { best, worst };
}

function highestCheckoutAcrossThrowsLists(throwsLists: RecapThrow[][]): number {
  let max = 0;
  for (const list of throwsLists) {
    for (const t of list) {
      if (t.isCheckout && t.score > max) max = t.score;
    }
  }
  return max;
}

export function tournamentLegsToRecapModel(
  legs: TournamentLegForRecap[],
  hero: MatchRecapHero,
  playerOneName: string,
  playerTwoName: string,
  playerOneId: string | undefined,
  playerTwoId: string | undefined,
  startingScore: number,
): MatchRecapModel {
  let p1ThrowsTotal = 0;
  let p1ScoreTotal = 0;
  let p1180s = 0;
  let p1140s = 0;
  let p1100s = 0;
  const p1VisitScores: number[] = [];

  let p2ThrowsTotal = 0;
  let p2ScoreTotal = 0;
  let p2180s = 0;
  let p2140s = 0;
  let p2100s = 0;
  const p2VisitScores: number[] = [];

  const p1ThrowsByLeg: RecapThrow[][] = [];
  const p2ThrowsByLeg: RecapThrow[][] = [];

  legs.forEach((leg) => {
    leg.player1Throws.forEach((t) => {
      p1ThrowsTotal++;
      p1ScoreTotal += t.score;
      p1VisitScores.push(t.score);
      if (t.score === 180) p1180s++;
      if (t.score >= 140 && t.score < 180) p1140s++;
      if (t.score >= 100 && t.score < 140) p1100s++;
    });
    leg.player2Throws.forEach((t) => {
      p2ThrowsTotal++;
      p2ScoreTotal += t.score;
      p2VisitScores.push(t.score);
      if (t.score === 180) p2180s++;
      if (t.score >= 140 && t.score < 180) p2140s++;
      if (t.score >= 100 && t.score < 140) p2100s++;
    });
    if (leg.player1Throws.length) p1ThrowsByLeg.push(leg.player1Throws);
    if (leg.player2Throws.length) p2ThrowsByLeg.push(leg.player2Throws);
  });

  const player1Wins = legs.filter((l) => l.winnerId?._id === playerOneId).length;
  const player2Wins = legs.filter((l) => l.winnerId?._id === playerTwoId).length;

  const avgA = p1ThrowsTotal > 0 ? p1ScoreTotal / p1ThrowsTotal : 0;
  const avgB = p2ThrowsTotal > 0 ? p2ScoreTotal / p2ThrowsTotal : 0;

  const f9a = firstNineVisitAvg(p1VisitScores);
  const f9b = firstNineVisitAvg(p2VisitScores);

  const p1bw = computeTournamentBestWorst(legs, playerOneId, playerTwoId, 1);
  const p2bw = computeTournamentBestWorst(legs, playerOneId, playerTwoId, 2);

  const p1Col: RecapPlayerColumn = {
    name: playerOneName,
    average: avgA.toFixed(2),
    firstNine: f9a.toFixed(2),
    legsWon: player1Wins,
    visits: p1ThrowsTotal,
    n180: p1180s,
    n140: p1140s,
    n100: p1100s,
    highestCheckout: highestCheckoutAcrossThrowsLists(p1ThrowsByLeg),
    bestLegDarts: fmtDash(p1bw.best),
    worstLegDarts: fmtDash(p1bw.worst),
  };

  const p2Col: RecapPlayerColumn = {
    name: playerTwoName,
    average: avgB.toFixed(2),
    firstNine: f9b.toFixed(2),
    legsWon: player2Wins,
    visits: p2ThrowsTotal,
    n180: p2180s,
    n140: p2140s,
    n100: p2100s,
    highestCheckout: highestCheckoutAcrossThrowsLists(p2ThrowsByLeg),
    bestLegDarts: fmtDash(p2bw.best),
    worstLegDarts: fmtDash(p2bw.worst),
  };

  const legBlocks: RecapLegBlock[] = legs.map((leg, legIndex) => {
    const isPlayer1Winner = leg.winnerId?._id === playerOneId;
    const isPlayer2Winner = leg.winnerId?._id === playerTwoId;
    const winnerName = isPlayer1Winner
      ? playerOneName
      : isPlayer2Winner
        ? playerTwoName
        : "";

    let p1Remaining = startingScore;
    let p2Remaining = startingScore;
    const visits = Math.max(leg.player1Throws.length, leg.player2Throws.length);

    const visitRows: RecapVisitRow[] = Array.from({ length: visits }, (_, throwIndex) => {
      const p1Throw = leg.player1Throws[throwIndex];
      const p2Throw = leg.player2Throws[throwIndex];
      let p1After: number | null = null;
      let p2After: number | null = null;

      if (p1Throw) {
        p1Remaining = Math.max(0, p1Remaining - Number(p1Throw.score || 0));
        p1After = p1Remaining;
      }
      if (p2Throw) {
        p2Remaining = Math.max(0, p2Remaining - Number(p2Throw.score || 0));
        p2After = p2Remaining;
      }

      const checkoutCount = typeof leg.winnerArrowCount === "number" ? leg.winnerArrowCount : 3;
      const arrowCount =
        isPlayer1Winner && p1Throw?.isCheckout
          ? throwIndex * 3 + checkoutCount
          : isPlayer2Winner && p2Throw?.isCheckout
            ? throwIndex * 3 + checkoutCount
            : (throwIndex + 1) * 3;

      const p1EmptyClass = cn(
        "rounded px-1 py-0.5 text-center font-mono text-[11px] font-bold",
        "border border-dashed border-primary/30 bg-muted/20 text-primary",
      );
      const p2EmptyClass = cn(
        "rounded px-1 py-0.5 text-center font-mono text-[11px] font-bold",
        "border border-dashed border-accent/30 bg-muted/20 text-accent",
      );

      return {
        p1After: p1After ?? "—",
        p2After: p2After ?? "—",
        p1Score: p1Throw ? p1Throw.score : "—",
        p2Score: p2Throw ? p2Throw.score : "—",
        centerLabel: arrowCount,
        p1CellClass: p1Throw
          ? recapTournamentVisitCellClass(p1Throw, isPlayer1Winner)
          : p1EmptyClass,
        p2CellClass: p2Throw
          ? recapTournamentVisitCellClass(p2Throw, isPlayer2Winner)
          : p2EmptyClass,
      };
    });

    const p1DartCount = calculatePlayerArrows(
      leg.player1Throws,
      leg.player1TotalDarts,
      isPlayer1Winner,
      leg.winnerArrowCount,
    );
    const p2DartCount = calculatePlayerArrows(
      leg.player2Throws,
      leg.player2TotalDarts,
      isPlayer2Winner,
      leg.winnerArrowCount,
    );

    return {
      legIndex,
      winnerName,
      p1DartsApprox: false,
      p2DartsApprox: false,
      p1DartCount,
      p2DartCount,
      rows: visitRows,
      p1Remaining: isPlayer1Winner
        ? 0
        : calculateLoserRemainingForLeg(leg, isPlayer1Winner, isPlayer2Winner) || leg.player1Score,
      p2Remaining: isPlayer2Winner
        ? 0
        : calculateLoserRemainingForLeg(leg, isPlayer1Winner, isPlayer2Winner) || leg.player2Score,
      isP1Winner: isPlayer1Winner,
      isP2Winner: isPlayer2Winner,
    };
  });

  return {
    hero,
    player1: p1Col,
    player2: p2Col,
    legs: legBlocks,
  };
}
