"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useLiveTournamentClubId } from "@/components/tournament/LiveTournamentClubProvider";
import { LiveSocketConnectionLabel } from "@/components/tournament/LiveSocketConnectionLabel";
import { getMatchState } from "@/lib/socketApi";
import { IconEye, IconArrowLeft, IconPencil, IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { getMatchByIdClientAction } from "@/features/tournaments/actions/tournamentRoster.action";
import { buildLegacyStreamPopupHtml } from "@/components/tournament/streamPopupDocument";
import { formatLiveStreamStageLine } from "@/components/tournament/liveStreamStageLine";
import { formatBoardPlayerNameMax } from "@/lib/formatBoardPlayerName";

interface LiveMatchViewerProps {
  matchId: string;
  tournamentCode: string;
  player1: any;
  player2: any;
  onBack?: () => void;
  onShare?: () => void;
  /** OBS popup: no chrome, no nested stream button */
  variant?: "default" | "popup";
}

interface Throw {
  score: number;
  darts: number;
  isDouble: boolean;
  isCheckout: boolean;
  remainingScore?: number;
  timestamp?: number;
  playerId?: string;
}

interface MatchState {
  currentLeg: number;
  completedLegs: any[];
  currentLegData: {
    player1Score: number;
    player2Score: number;
    player1Throws: Throw[];
    player2Throws: Throw[];
    player1Remaining: number;
    player2Remaining: number;
    player1Id?: string;
    player2Id?: string;
    currentPlayer: number;
  };
  player1LegsWon?: number;
  player2LegsWon?: number;
  legsToWin?: number;
  initialStartingPlayer?: number;
  startingScore?: number;
  player1Name?: string;
  player2Name?: string;
}

interface MatchData {
  _id: string;
  player1: any;
  player2: any;
  legsToWin: number;
  startingPlayer: number;
  status: string;
  winnerId?: string;
  legs: any[];
  boardReference?: number;
  type?: string;
  round?: number;
  tournamentRef?: {
    tournamentSettings?: { startingScore?: number; name?: string };
    groups?: Array<{ board?: number; matches?: Array<{ _id?: string } | string> }>;
    knockout?: Array<{ round: number; matches?: unknown[] }>;
  };
}

function tournamentStartingScore(match: MatchData | null): number {
  const v = match?.tournamentRef?.tournamentSettings?.startingScore;
  return Number(v ?? 501);
}

/** Whose turn in a 501 leg given visit size 3, from persisted throw counts. */
function currentPlayerFromVisitThrows(p1n: number, p2n: number, legStarter: 1 | 2): 1 | 2 {
  if (p1n === 0 && p2n === 0) return legStarter;
  if (p1n % 3 !== 0) return 1;
  if (p2n % 3 !== 0) return 2;
  if (p1n === p2n) return legStarter;
  return p1n > p2n ? 2 : 1;
}

function buildMatchStateFromMatchDocument(m: MatchData): MatchState {
  const start = tournamentStartingScore(m);
  const p1w = Number(m.player1?.legsWon ?? 0);
  const p2w = Number(m.player2?.legsWon ?? 0);
  const legNum = Math.max(1, p1w + p2w + 1);
  const starter = (m.startingPlayer === 2 ? 2 : 1) as 1 | 2;
  const legs = (m.legs as any[]) || [];
  const open =
    legs.find((l: any) => Number(l?.legNumber) === legNum && !l?.winnerId) ||
    [...legs].reverse().find((l: any) => !l?.winnerId);

  const t1: Throw[] = Array.isArray(open?.player1Throws) ? open.player1Throws : [];
  const t2: Throw[] = Array.isArray(open?.player2Throws) ? open.player2Throws : [];
  const n1 = t1.length;
  const n2 = t2.length;

  const rem1 =
    typeof open?.player1Remaining === "number"
      ? open.player1Remaining
      : typeof open?.player1Score === "number"
        ? open.player1Score
        : start;
  const rem2 =
    typeof open?.player2Remaining === "number"
      ? open.player2Remaining
      : typeof open?.player2Score === "number"
        ? open.player2Score
        : start;

  const completedLegs = legs.filter((l: any) => l?.winnerId);

  return {
    currentLeg: legNum,
    completedLegs,
    player1LegsWon: p1w,
    player2LegsWon: p2w,
    legsToWin: m.legsToWin ?? 3,
    startingScore: start,
    initialStartingPlayer: m.startingPlayer,
    player1Name: m.player1?.playerId?.name,
    player2Name: m.player2?.playerId?.name,
    currentLegData: {
      player1Score: rem1,
      player2Score: rem2,
      player1Remaining: rem1,
      player2Remaining: rem2,
      player1Throws: t1,
      player2Throws: t2,
      currentPlayer: currentPlayerFromVisitThrows(n1, n2, starter),
      player1Id: m.player1?.playerId?._id?.toString?.(),
      player2Id: m.player2?.playerId?._id?.toString?.(),
    },
  };
}

const LiveMatchViewer: React.FC<LiveMatchViewerProps> = ({
  matchId,
  tournamentCode,
  player1,
  player2,
  onBack,
  onShare,
  variant = "default",
}) => {
  const tTour = useTranslations("Tournament");
  const t = (key: string, values?: any) => tTour(`live_viewer.${key}`, values);

  const [matchState, setMatchState] = useState<MatchState>({
    currentLeg: 1,
    completedLegs: [],
    currentLegData: {
      player1Score: 501,
      player2Score: 501,
      player1Throws: [],
      player2Throws: [],
      player1Remaining: 501,
      player2Remaining: 501,
      currentPlayer: 1,
    },
    player1LegsWon: 0,
    player2LegsWon: 0,
    legsToWin: 3,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [currentPlayer1, setCurrentPlayer1] = useState(player1);
  const [currentPlayer2, setCurrentPlayer2] = useState(player2);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const matchIdLiveRef = useRef(matchId);
  /** Once we have live socket gameplay for this match, DB refetches must not overwrite scores/throws. */
  const socketLiveRef = useRef(false);

  useEffect(() => {
    matchIdLiveRef.current = matchId;
    socketLiveRef.current = false;
  }, [matchId]);
  const p1IdRef = useRef<string | undefined>(undefined);
  const p2IdRef = useRef<string | undefined>(undefined);
  const clubId = useLiveTournamentClubId();

  const {
    socket,
    socketStatus,
    socketFeatureDenialReason,
    socketFeatureGateReason,
    error: socketFeatureError,
  } = useSocket({
    tournamentId: tournamentCode,
    matchId: matchId,
    clubId,
  });

  useEffect(() => {
    p1IdRef.current = currentPlayer1?._id ?? matchData?.player1?.playerId?._id;
    p2IdRef.current = currentPlayer2?._id ?? matchData?.player2?.playerId?._id;
  }, [currentPlayer1?._id, currentPlayer2?._id, matchData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    w.matchState = matchState;
    const lock = w.__tdartsStreamLockMatchId;
    if (lock != null && String(lock) === String(matchId)) {
      w.__tdartsLockedStreamState = matchState;
    }
  }, [matchState, matchId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    if (matchData) {
      w.matchData = matchData;
    }
    const lock = w.__tdartsStreamLockMatchId;
    if (matchData && lock != null && String(lock) === String(matchId)) {
      w.__tdartsLockedStreamData = matchData;
    }
  }, [matchData, matchId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__tdartsLiveSelectedMatchId = String(matchId);
    return () => {
      if ((window as any).__tdartsLiveSelectedMatchId === String(matchId)) {
        delete (window as any).__tdartsLiveSelectedMatchId;
      }
    };
  }, [matchId]);

  const fetchMatchData = useCallback(async () => {
    const requested = matchId;
    try {
      const data = await getMatchByIdClientAction({ matchId: requested });

      if (matchIdLiveRef.current !== requested) return;

      if (data.success && data.match) {
        const m = data.match as MatchData;
        setMatchData(m);
        if (m.player1?.playerId?.name) setCurrentPlayer1(m.player1.playerId);
        if (m.player2?.playerId?.name) setCurrentPlayer2(m.player2.playerId);

        if (socketLiveRef.current) {
          const p1w = Number(m.player1?.legsWon ?? 0);
          const p2w = Number(m.player2?.legsWon ?? 0);
          setMatchState((prev) => ({
            ...prev,
            player1LegsWon: p1w,
            player2LegsWon: p2w,
            legsToWin: m.legsToWin ?? prev.legsToWin ?? 3,
            completedLegs: Array.isArray(m.legs) ? m.legs : prev.completedLegs,
            player1Name: m.player1?.playerId?.name ?? prev.player1Name,
            player2Name: m.player2?.playerId?.name ?? prev.player2Name,
            currentLeg: prev.currentLeg,
            currentLegData: prev.currentLegData,
            startingScore: prev.startingScore ?? tournamentStartingScore(m),
            initialStartingPlayer: prev.initialStartingPlayer ?? m.startingPlayer,
          }));
        } else {
          setMatchState(buildMatchStateFromMatchDocument(m));
        }
      }
    } catch (error) {
      console.error("Failed to fetch match data:", error);
    }
  }, [matchId]);

  useEffect(() => {
    setCurrentPlayer1(player1);
    setCurrentPlayer2(player2);
  }, [player1, player2]);

  const markSocketGameplay = useCallback(() => {
    socketLiveRef.current = true;
  }, []);

  useEffect(() => {
    const requested = matchId;
    void fetchMatchData();

    getMatchState(requested)
      .then((data) => {
        if (matchIdLiveRef.current !== requested) return;
        if (data.success && data.state && data.state.currentLegData) {
          markSocketGameplay();
          const s = data.state as MatchState;
          setMatchState((prev) => ({
            ...prev,
            ...s,
            currentLegData: { ...prev.currentLegData, ...s.currentLegData },
            player1LegsWon: s.player1LegsWon ?? prev.player1LegsWon ?? 0,
            player2LegsWon: s.player2LegsWon ?? prev.player2LegsWon ?? 0,
            legsToWin: s.legsToWin ?? prev.legsToWin,
            initialStartingPlayer: s.initialStartingPlayer ?? prev.initialStartingPlayer,
            startingScore: s.startingScore ?? prev.startingScore,
            completedLegs: s.completedLegs ?? prev.completedLegs ?? [],
          }));
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch initial match state:", error);
        setIsLoading(false);
      });

    function onMatchState(state: MatchState & { initialStartingPlayer?: number; startingScore?: number }) {
      if (matchIdLiveRef.current !== requested) return;
      if (!state?.currentLegData) return;
      markSocketGameplay();
      setMatchState((prev) => ({
        ...prev,
        ...state,
        currentLegData: { ...prev.currentLegData, ...state.currentLegData },
        player1LegsWon: state.player1LegsWon ?? prev.player1LegsWon ?? 0,
        player2LegsWon: state.player2LegsWon ?? prev.player2LegsWon ?? 0,
        legsToWin: state.legsToWin ?? prev.legsToWin,
        initialStartingPlayer: state.initialStartingPlayer ?? prev.initialStartingPlayer,
        startingScore: state.startingScore ?? prev.startingScore,
        completedLegs: state.completedLegs ?? prev.completedLegs ?? [],
      }));
    }

    function onThrowUpdate(data: any) {
      if (matchIdLiveRef.current !== requested) return;
      markSocketGameplay();
      const p1id = p1IdRef.current;
      setMatchState((prev) => ({
        ...prev,
        currentLegData: {
          ...prev.currentLegData,
          [data.playerId === p1id ? "player1Throws" : "player2Throws"]: [
            ...(prev.currentLegData[data.playerId === p1id ? "player1Throws" : "player2Throws"] || []),
            {
              score: data.score,
              darts: data.darts,
              isDouble: data.isDouble,
              isCheckout: data.isCheckout,
              remainingScore: data.remainingScore,
              timestamp: Date.now(),
              playerId: data.playerId,
            },
          ],
          [data.playerId === p1id ? "player1Remaining" : "player2Remaining"]: data.remainingScore,
          currentPlayer: data.playerId === p1id ? 2 : 1,
        },
      }));
    }

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void fetchMatchData();
      }, 500);
    };

    function onLegComplete() {
      scheduleRefresh();
    }

    function onFetchMatchData() {
      scheduleRefresh();
    }

    function onMatchStarted(data: { matchId?: string }) {
      if (data?.matchId && String(data.matchId) === String(requested)) {
        void fetchMatchData();
      }
    }

    socket.on("match-state", onMatchState);
    socket.on("throw-update", onThrowUpdate);
    socket.on("leg-complete", onLegComplete);
    socket.on("fetch-match-data", onFetchMatchData);
    socket.on("match-started", onMatchStarted);

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      socket.off("match-state", onMatchState);
      socket.off("throw-update", onThrowUpdate);
      socket.off("leg-complete", onLegComplete);
      socket.off("fetch-match-data", onFetchMatchData);
      socket.off("match-started", onMatchStarted);
    };
  }, [matchId, socket, fetchMatchData, markSocketGameplay]);

  /** While a stream popup is locked to another match, keep its snapshot updated from the socket API. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    const lockRaw = w.__tdartsStreamLockMatchId;
    if (lockRaw == null) return;
    const lock = String(lockRaw);
    if (lock === String(matchId)) return;

    const poll = async () => {
      if (String(w.__tdartsStreamLockMatchId) !== lock) return;
      try {
        const data = await getMatchState(lock);
        if (
          data?.success &&
          data?.state?.currentLegData &&
          String(w.__tdartsStreamLockMatchId) === lock
        ) {
          const s = data.state as MatchState;
          w.__tdartsLockedStreamState = {
            ...s,
            currentLegData: { ...s.currentLegData },
            completedLegs: Array.isArray(s.completedLegs) ? s.completedLegs : [],
          };
        }
      } catch {
        /* ignore */
      }
    };

    const id = setInterval(() => void poll(), 900);
    void poll();
    return () => clearInterval(id);
  }, [matchId]);

  /** Refresh locked match document when the main UI follows a different match (leg metadata for stream indicators). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    const lockRaw = w.__tdartsStreamLockMatchId;
    if (lockRaw == null) return;
    const lock = String(lockRaw);
    if (lock === String(matchId)) return;
    let cancelled = false;
    void getMatchByIdClientAction({ matchId: lock }).then((data) => {
      if (cancelled || String(w.__tdartsStreamLockMatchId) !== lock) return;
      if (data.success && data.match) {
        w.__tdartsLockedStreamData = data.match;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const firstLegStartingPlayer = (): number => {
    const fromSocket = matchState.initialStartingPlayer;
    if (fromSocket === 1 || fromSocket === 2) return fromSocket;
    return matchData?.startingPlayer ?? 1;
  };

  const getCurrentLegStarter = (): number => {
    if (!matchData) return firstLegStartingPlayer();
    const currentLegNumber = matchState.currentLeg;
    const base = firstLegStartingPlayer();
    if (currentLegNumber === 1) {
      return base;
    }
    return base === 1 ? (currentLegNumber % 2 === 1 ? 1 : 2) : currentLegNumber % 2 === 1 ? 2 : 1;
  };

  const getPlayer1Name = () =>
    matchState.player1Name ||
    currentPlayer1?.name ||
    matchData?.player1?.playerId?.name ||
    "Player 1";
  const getPlayer2Name = () =>
    matchState.player2Name ||
    currentPlayer2?.name ||
    matchData?.player2?.playerId?.name ||
    "Player 2";

  const getDisplayPlayer1Name = () => formatBoardPlayerNameMax(getPlayer1Name());
  const getDisplayPlayer2Name = () => formatBoardPlayerNameMax(getPlayer2Name());

  // "Waiting" means the match hasn't started yet. Once it becomes ongoing we should render the live view,
  // even if there are no persisted throws yet (scores will still be 501 and socket will fill in).
  const isWaitingLayout = matchData && matchData.status === "pending";

  const displayStartingScore =
    Number(matchState.startingScore ?? tournamentStartingScore(matchData)) || 501;
  const displayLegsToWin = Number(matchState.legsToWin ?? matchData?.legsToWin ?? 3) || 3;

  const openStreamingPopup = () => {
    if (variant === "popup") return;
    const streamWin = window.open("", "tdarts-stream", "width=1200,height=360,scrollbars=no,resizable=yes");
    if (!streamWin) return;
    const scoringLegTailTemplate = t("stream_scoring_leg_tail");
    const tournamentName =
      matchData?.tournamentRef?.tournamentSettings?.name?.trim() || tournamentCode;
    const stageLine = formatLiveStreamStageLine(matchData, tournamentCode, t);

    const html = buildLegacyStreamPopupHtml({
      lockedMatchId: String(matchId),
      logoUrl: `${window.location.origin}/tdarts_fav.svg`,
      player1Name: getDisplayPlayer1Name(),
      player2Name: getDisplayPlayer2Name(),
      scoringOnTdartsLine: t("stream_scoring_on_tdarts"),
      legsToWin: displayLegsToWin,
      currentLeg: matchState.currentLeg,
      p1Remaining: matchState.currentLegData.player1Remaining,
      p2Remaining: matchState.currentLegData.player2Remaining,
      p1LegsWon: matchState.player1LegsWon ?? 0,
      p2LegsWon: matchState.player2LegsWon ?? 0,
      tournamentName,
      stageLine,
      scoringLegTailTemplate,
      labelAvg: "AVG",
      labelLegsCol: "LEGS",
      labelScoreCol: "SCORE",
      waitingHint: t("waiting_scores_hint"),
      initialUpcomingLayout: !!isWaitingLayout,
      streamUpcomingMessage: t("stream_match_starting_soon"),
    });

    const w = window as any;
    w.__tdartsStreamLockMatchId = String(matchId);
    w.__tdartsLockedStreamState = matchState;
    if (matchData) {
      w.__tdartsLockedStreamData = matchData;
    }

    streamWin.document.open();
    streamWin.document.write(html);
    streamWin.document.close();

    const clearStreamLock = () => {
      if (String(w.__tdartsStreamLockMatchId) === String(matchId)) {
        delete w.__tdartsStreamLockMatchId;
        delete w.__tdartsLockedStreamState;
        delete w.__tdartsLockedStreamData;
      }
    };
    streamWin.addEventListener("pagehide", clearStreamLock);
    streamWin.addEventListener("unload", clearStreamLock);
  };

  const renderThrowScore = (t_throw: Throw) => {
    const isHigh = t_throw.score >= 100 && t_throw.score < 140;
    const isVeryHigh = t_throw.score >= 140 && t_throw.score < 180;
    const isMax = t_throw.score === 180;

    let className = "font-mono text-base sm:text-lg";
    if (isMax) className += " text-yellow-500 font-bold text-xl";
    else if (isVeryHigh) className += " text-red-500 font-bold";
    else if (isHigh) className += " text-green-500 font-bold";
    else className += " text-muted-foreground";

    return (
      <div className={cn("flex flex-col items-center justify-center h-8", isMax && "animate-pulse")}>
        <span className={className}>{t_throw.score}</span>
        {t_throw.isCheckout && (
          <Badge
            variant="outline"
            className="text-[10px] h-3 px-1 border-primary text-primary absolute -mt-6 ml-6 bg-background"
          >
            {t("out_1ooe")}
          </Badge>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  const p1Throws = matchState.currentLegData.player1Throws ?? [];
  const p2Throws = matchState.currentLegData.player2Throws ?? [];
  const maxThrows = Math.max(p1Throws.length, p2Throws.length);

  const historyRows = Array.from({ length: maxThrows })
    .map((_, i) => ({
      round: i + 1,
      p1: p1Throws[i],
      p2: p2Throws[i],
    }))
    .slice(-6);

  const typeLabel = matchData?.type === "knockout" ? t("type_knockout") : t("type_group");
  const boardLabel =
    matchData?.boardReference != null ? t("board_n", { n: matchData.boardReference }) : null;

  return (
    <div className="flex flex-col h-full bg-background">
      {variant === "default" && (
        <>
          <div className="flex justify-between items-center p-2 lg:hidden border-b bg-muted/20">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 px-2">
              <IconArrowLeft className="w-5 h-5" />
              <span className="font-medium">{t("back")}</span>
            </Button>
            {onShare && (
              <Button variant="ghost" size="icon" onClick={onShare}>
                <IconShare className="w-5 h-5" />
              </Button>
            )}
          </div>

          <div className="hidden lg:flex justify-end items-center mb-4 gap-2">
            <Button size="sm" variant="secondary" className="gap-2" onClick={openStreamingPopup}>
              <IconEye className="w-4 h-4" />
              {t("streaming_window")}
            </Button>
          </div>
        </>
      )}

      <div className="flex-1 overflow-y-auto p-4 lg:p-0">
        <Card className="max-w-4xl mx-auto overflow-hidden bg-card border-none shadow-none sm:shadow-sm sm:border">
          <div className="flex justify-center items-center py-3 bg-muted/30 border-b gap-6 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground uppercase text-xs tracking-wider font-semibold">
                {t("legs")}
              </span>
              <div className="flex items-center gap-2 text-xl font-bold font-mono">
                <span>{matchState.player1LegsWon}</span>
                <span className="text-muted-foreground/30">-</span>
                <span>{matchState.player2LegsWon}</span>
              </div>
            </div>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              {t("leg_1mum")}
              {matchState.currentLeg}
            </div>
            <div className="w-px h-5 bg-border hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              BO{displayLegsToWin * 2 - 1}
            </div>
          </div>

          <div className="flex justify-center py-1.5 bg-muted/15 border-b px-2">
            <LiveSocketConnectionLabel
              socketStatus={socketStatus}
              denialReason={socketFeatureDenialReason}
              gateReason={socketFeatureGateReason}
              featureError={socketFeatureError}
              labelPrefix={tTour("live_matches.socket_status.a11y_status")}
              className="max-w-full"
            />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] divide-x divide-border">
            <div
              className={cn(
                "p-2 sm:p-4 flex flex-col items-center relative transition-colors",
                !isWaitingLayout && matchState.currentLegData.currentPlayer === 1 ? "bg-primary/5" : "",
              )}
            >
              <div className="flex items-center gap-1 mb-2 w-full min-w-0 justify-center px-1 max-w-full">
                {getCurrentLegStarter() === 1 && (
                  <IconPencil size={10} className="text-muted-foreground shrink-0" />
                )}
                <span
                  className="min-w-0 flex-1 font-bold text-sm sm:text-lg text-center truncate leading-none"
                  title={getPlayer1Name()}
                >
                  {getDisplayPlayer1Name()}
                </span>
              </div>

              {isWaitingLayout ? (
                <div className="flex flex-col items-center justify-center gap-2 min-h-[5rem] sm:min-h-[7rem] px-2 text-center">
                  <span className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide">
                    {t("about_to_start")}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground leading-snug">
                    {t("start_score_label")}:{" "}
                    <span className="font-mono font-bold text-foreground">{displayStartingScore}</span>
                  </span>
                  {getCurrentLegStarter() === 1 && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{t("starts_first_leg")}</span>
                  )}
                </div>
              ) : (
                <>
                  <div className="text-4xl sm:text-7xl font-bold tracking-tighter tabular-nums mb-2 sm:mb-4 text-primary leading-none">
                    {matchState.currentLegData.player1Remaining}
                  </div>
                  {matchState.currentLegData.currentPlayer === 1 && (
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  )}
                </>
              )}
            </div>

            <div className="w-12 sm:w-24 bg-muted/5 flex flex-col items-center py-2 sm:py-4 justify-start pt-6 sm:pt-10 px-0.5">
              <div className="text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-wider font-bold text-center leading-tight mb-1 opacity-70">
                {t("tdarts_f0pi")}
              </div>
              {isWaitingLayout && (
                <div className="text-[8px] sm:text-[9px] text-center text-muted-foreground leading-tight mt-1 px-0.5">
                  {boardLabel ? <span className="block">{boardLabel}</span> : null}
                  <span className="block">
                    {typeLabel}
                    {matchData?.round != null ? <> · {t("round_n", { n: matchData.round })}</> : null}
                  </span>
                </div>
              )}
            </div>

            <div
              className={cn(
                "p-2 sm:p-4 flex flex-col items-center relative transition-colors",
                !isWaitingLayout && matchState.currentLegData.currentPlayer === 2 ? "bg-primary/5" : "",
              )}
            >
              <div className="flex items-center gap-1 mb-2 w-full min-w-0 justify-center px-1 max-w-full">
                <span
                  className="min-w-0 flex-1 font-bold text-sm sm:text-lg text-center truncate leading-none"
                  title={getPlayer2Name()}
                >
                  {getDisplayPlayer2Name()}
                </span>
                {getCurrentLegStarter() === 2 && (
                  <IconPencil size={10} className="text-muted-foreground shrink-0" />
                )}
              </div>

              {isWaitingLayout ? (
                <div className="flex flex-col items-center justify-center gap-2 min-h-[5rem] sm:min-h-[7rem] px-2 text-center">
                  <span className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide">
                    {t("about_to_start")}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground leading-snug">
                    {t("start_score_label")}:{" "}
                    <span className="font-mono font-bold text-foreground">{displayStartingScore}</span>
                  </span>
                  {getCurrentLegStarter() === 2 && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{t("starts_first_leg")}</span>
                  )}
                </div>
              ) : (
                <>
                  <div className="text-4xl sm:text-7xl font-bold tracking-tighter tabular-nums mb-2 sm:mb-4 text-primary leading-none">
                    {matchState.currentLegData.player2Remaining}
                  </div>
                  {matchState.currentLegData.currentPlayer === 2 && (
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  )}
                </>
              )}
            </div>
          </div>

          <div className="border-t bg-muted/5 min-h-[150px]">
            <div className="divide-y divide-border/50">
              {isWaitingLayout ? (
                <div className="py-8 px-4 text-center text-muted-foreground text-sm space-y-2">
                  <p>{t("waiting_scores_hint")}</p>
                </div>
              ) : historyRows.length > 0 ? (
                historyRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center py-2 px-2 hover:bg-muted/10 h-10">
                    <div className="text-center w-full">{row.p1 ? renderThrowScore(row.p1) : null}</div>
                    <div className="text-center w-8 flex justify-center text-xs text-muted-foreground/50 font-mono">
                      {row.round}
                    </div>
                    <div className="text-center w-full">{row.p2 ? renderThrowScore(row.p2) : null}</div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm opacity-30 italic">...</div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LiveMatchViewer;
