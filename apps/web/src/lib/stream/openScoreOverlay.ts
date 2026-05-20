import { buildLegacyStreamPopupHtml } from "@/components/tournament/streamPopupDocument";

export type OpenScoreOverlayParams = {
  matchId: string;
  matchState: unknown;
  matchData: unknown;
  player1Name: string;
  player2Name: string;
  tournamentCode: string;
  tournamentName: string;
  stageLine: string;
  legsToWin: number;
  currentLeg: number;
  p1Remaining: number;
  p2Remaining: number;
  p1LegsWon: number;
  p2LegsWon: number;
  isWaitingLayout: boolean;
  showAvg: boolean;
  labels: {
    scoringOnTdarts: string;
    scoringLegTail: string;
    waitingHint: string;
    streamUpcomingMessage: string;
    labelAvg?: string;
    labelLegs?: string;
    labelScore?: string;
  };
};

export function openScoreOverlay(params: OpenScoreOverlayParams): boolean {
  if (typeof window === "undefined") return false;
  const streamWin = window.open(
    "",
    "tdarts-stream",
    "width=1200,height=360,scrollbars=no,resizable=yes"
  );
  if (!streamWin) return false;

  const html = buildLegacyStreamPopupHtml({
    lockedMatchId: String(params.matchId),
    logoUrl: `${window.location.origin}/tdarts_fav.svg`,
    player1Name: params.player1Name,
    player2Name: params.player2Name,
    scoringOnTdartsLine: params.labels.scoringOnTdarts,
    legsToWin: params.legsToWin,
    currentLeg: params.currentLeg,
    p1Remaining: params.p1Remaining,
    p2Remaining: params.p2Remaining,
    p1LegsWon: params.p1LegsWon,
    p2LegsWon: params.p2LegsWon,
    tournamentName: params.tournamentName,
    stageLine: params.stageLine,
    scoringLegTailTemplate: params.labels.scoringLegTail,
    labelAvg: params.labels.labelAvg ?? "AVG",
    labelLegsCol: params.labels.labelLegs ?? "LEGS",
    labelScoreCol: params.labels.labelScore ?? "SCORE",
    waitingHint: params.labels.waitingHint,
    initialUpcomingLayout: params.isWaitingLayout,
    streamUpcomingMessage: params.labels.streamUpcomingMessage,
    showAvg: params.showAvg,
  });

  const w = window as Window & {
    __tdartsStreamLockMatchId?: string;
    __tdartsLockedStreamState?: unknown;
    __tdartsLockedStreamData?: unknown;
  };
  w.__tdartsStreamLockMatchId = String(params.matchId);
  w.__tdartsLockedStreamState = params.matchState;
  if (params.matchData) {
    w.__tdartsLockedStreamData = params.matchData;
  }

  streamWin.document.open();
  streamWin.document.write(html);
  streamWin.document.close();

  const clearStreamLock = () => {
    if (String(w.__tdartsStreamLockMatchId) === String(params.matchId)) {
      delete w.__tdartsStreamLockMatchId;
      delete w.__tdartsLockedStreamState;
      delete w.__tdartsLockedStreamData;
    }
  };
  streamWin.addEventListener("pagehide", clearStreamLock);
  streamWin.addEventListener("unload", clearStreamLock);
  return true;
}
