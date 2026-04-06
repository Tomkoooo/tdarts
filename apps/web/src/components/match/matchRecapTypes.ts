import type { RefObject } from "react";
import type { Leg, Player } from "@/hooks/useDartGame";

/** Post-match snapshot for local (board) games. */
export type LocalMatchFinishSnapshot = {
  winner: 1 | 2;
  player1: Player;
  player2: Player;
  legs: Leg[];
  startingScore: number;
};

export type RecapVisitRow = {
  p1After: number | string | null;
  p2After: number | string | null;
  p1Score: number | string | null;
  p2Score: number | string | null;
  centerLabel: string | number;
  p1CellClass: string;
  p2CellClass: string;
};

export type RecapLegBlock = {
  legIndex: number;
  winnerName: string;
  p1DartsApprox: boolean;
  p2DartsApprox: boolean;
  p1DartCount: number;
  p2DartCount: number;
  rows: RecapVisitRow[];
  p1Remaining: number | string;
  p2Remaining: number | string;
  isP1Winner: boolean;
  isP2Winner: boolean;
};

export type RecapPlayerColumn = {
  name: string;
  average: string;
  firstNine: string;
  legsWon: number;
  visits: number;
  n180: number;
  n140: number;
  n100: number;
  highestCheckout: number;
  bestLegDarts: string;
  worstLegDarts: string;
};

export type MatchRecapModel = {
  hero: {
    brandLine: string;
    titleLine: string;
    scoreLine: string;
  };
  player1: RecapPlayerColumn;
  player2: RecapPlayerColumn;
  legs: RecapLegBlock[];
};

export type MatchRecapSheetProps = {
  exportRef: RefObject<HTMLDivElement | null>;
  model: MatchRecapModel;
};
