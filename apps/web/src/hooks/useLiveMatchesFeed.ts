"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useLiveTournamentClubId } from "@/components/tournament/LiveTournamentClubProvider";
import { getTournamentLiveMatchesClientAction } from "@/features/tournaments/actions/tournamentRoster.action";

export interface LiveFeedMatch {
  _id: string;
  player1: { _id?: string; name?: string };
  player2: { _id?: string; name?: string };
  currentLeg: number;
  /** Remaining score; before first throw of the leg equals starting score (501 / tournament). */
  player1Remaining?: number;
  player2Remaining?: number;
  status: string;
  player1LegsWon?: number;
  player2LegsWon?: number;
  lastUpdate?: string;
}

function normalizeMatchId(id: unknown): string {
  return String(id ?? "");
}

/** Until the first throw of the current leg, UI shows starting score; after throws, use socket remainings. */
function remainingsFromSocketMatchState(state: any): {
  player1Remaining: number;
  player2Remaining: number;
} {
  const starting = Number(state?.startingScore ?? 501);
  const cur = state?.currentLegData;
  const p1Raw = cur?.player1Remaining;
  const p2Raw = cur?.player2Remaining;
  const p1Throws = Array.isArray(cur?.player1Throws) ? cur.player1Throws.length : 0;
  const p2Throws = Array.isArray(cur?.player2Throws) ? cur.player2Throws.length : 0;
  const hasThrow = p1Throws > 0 || p2Throws > 0;

  if (!hasThrow) {
    return { player1Remaining: starting, player2Remaining: starting };
  }

  return {
    player1Remaining: p1Raw != null ? Number(p1Raw) : starting,
    player2Remaining: p2Raw != null ? Number(p2Raw) : starting,
  };
}

function liveFeedMatchFromSocketState(matchId: string, state: any): LiveFeedMatch {
  const p1Legs = Number(state?.player1LegsWon ?? 0);
  const p2Legs = Number(state?.player2LegsWon ?? 0);
  const cur = state?.currentLegData;
  const { player1Remaining, player2Remaining } = remainingsFromSocketMatchState(state);
  return {
    _id: matchId,
    status: "ongoing",
    currentLeg: Number(state?.currentLeg ?? p1Legs + p2Legs + 1),
    player1Remaining,
    player2Remaining,
    player1: {
      _id: cur?.player1Id != null ? String(cur.player1Id) : undefined,
      name: state?.player1Name || "Player 1",
    },
    player2: {
      _id: cur?.player2Id != null ? String(cur.player2Id) : undefined,
      name: state?.player2Name || "Player 2",
    },
    player1LegsWon: p1Legs,
    player2LegsWon: p2Legs,
    lastUpdate: new Date().toISOString(),
  };
}

const normalizeMatch = (match: any): LiveFeedMatch => {
  const startingDefault = Number(match?.startingScore ?? 501);
  return {
  _id: String(match?._id || ""),
  status: match?.status || "ongoing",
  currentLeg: Number(match?.currentLeg ?? 1),
  player1Remaining:
    match?.player1Remaining !== undefined && match?.player1Remaining !== null
      ? Number(match.player1Remaining)
      : startingDefault,
  player2Remaining:
    match?.player2Remaining !== undefined && match?.player2Remaining !== null
      ? Number(match.player2Remaining)
      : startingDefault,
  player1: {
    _id: match?.player1?.playerId?._id || match?.player1?._id,
    name: match?.player1?.playerId?.name || match?.player1?.name || "Player 1",
  },
  player2: {
    _id: match?.player2?.playerId?._id || match?.player2?._id,
    name: match?.player2?.playerId?.name || match?.player2?.name || "Player 2",
  },
  player1LegsWon: Number(match?.player1?.legsWon ?? match?.player1LegsWon ?? 0),
  player2LegsWon: Number(match?.player2?.legsWon ?? match?.player2LegsWon ?? 0),
  lastUpdate: match?.lastUpdate || new Date().toISOString(),
};
};

const mergeMatch = (prev: LiveFeedMatch, incoming: Partial<LiveFeedMatch>): LiveFeedMatch => ({
  ...prev,
  ...incoming,
  currentLeg: incoming.currentLeg ?? prev.currentLeg,
  player1Remaining: incoming.player1Remaining ?? prev.player1Remaining,
  player2Remaining: incoming.player2Remaining ?? prev.player2Remaining,
  player1LegsWon: incoming.player1LegsWon ?? prev.player1LegsWon ?? 0,
  player2LegsWon: incoming.player2LegsWon ?? prev.player2LegsWon ?? 0,
  player1: {
    _id: incoming.player1?._id ?? prev.player1?._id,
    name: incoming.player1?.name ?? prev.player1?.name,
  },
  player2: {
    _id: incoming.player2?._id ?? prev.player2?._id,
    name: incoming.player2?.name ?? prev.player2?.name,
  },
  lastUpdate: incoming.lastUpdate ?? new Date().toISOString(),
});

export function useLiveMatchesFeed(tournamentCode: string) {
  const [matches, setMatches] = useState<LiveFeedMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const clubId = useLiveTournamentClubId();
  const {
    socket,
    isConnected,
    error: socketFeatureError,
    socketFeatureDenialReason,
    socketFeatureGateReason,
    socketStatus,
  } = useSocket({ tournamentId: tournamentCode, clubId });
  const [isPageVisible, setIsPageVisible] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getTournamentLiveMatchesClientAction({ code: tournamentCode }) as any;
      if (!data?.success) return;
      const normalized = (data.matches || []).map(normalizeMatch);
      setMatches(normalized);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibility = () => setIsPageVisible(!document.hidden);
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    // Socket-connected pages should not also poll continuously.
    if (isConnected || !isPageVisible) return;
    const polling = setInterval(() => {
      void refresh();
    }, 10000);
    return () => clearInterval(polling);
  }, [isConnected, isPageVisible, refresh]);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void refresh();
      }, 350);
    };

    const onMatchStarted = (data: { matchId: string; matchData?: any }) => {
      const id = normalizeMatchId(data?.matchId);
      if (!id) return;
      const fallback = normalizeMatch({ _id: id, status: "ongoing" });
      const normalized = data.matchData ? normalizeMatch({ ...data.matchData, _id: id }) : fallback;
      setMatches((prev) => {
        const index = prev.findIndex((m) => normalizeMatchId(m._id) === id);
        if (index === -1) return [...prev, normalized];
        const next = [...prev];
        next[index] = mergeMatch(prev[index], normalized);
        return next;
      });
    };

    const onMatchFinished = (data: { matchId: string }) => {
      const id = normalizeMatchId(data?.matchId);
      if (!id) return;
      setMatches((prev) => prev.filter((m) => normalizeMatchId(m._id) !== id));
    };

    const onMatchUpdate = (data: { matchId: string; state?: any }) => {
      const id = normalizeMatchId(data?.matchId);
      if (!id) return;

      setMatches((prev) => {
        const index = prev.findIndex((m) => normalizeMatchId(m._id) === id);
        if (index === -1) {
          scheduleRefresh();
          const fromState = liveFeedMatchFromSocketState(id, data.state);
          return [...prev, fromState];
        }
        return prev.map((m) => {
          if (normalizeMatchId(m._id) !== id) return m;
          const rem = remainingsFromSocketMatchState(data.state);
          return mergeMatch(m, {
            currentLeg: data.state?.currentLeg,
            player1Remaining: rem.player1Remaining,
            player2Remaining: rem.player2Remaining,
            player1LegsWon: data.state?.player1LegsWon,
            player2LegsWon: data.state?.player2LegsWon,
            player1: {
              _id: m.player1?._id,
              name: data.state?.player1Name ?? m.player1?.name,
            },
            player2: {
              _id: m.player2?._id,
              name: data.state?.player2Name ?? m.player2?.name,
            },
          });
        });
      });
    };

    const onLegComplete = () => {
      // Event payloads already update local state; fetch once to reconcile scoreboard snapshots.
      scheduleRefresh();
    };

    socket.on("match-started", onMatchStarted);
    socket.on("match-finished", onMatchFinished);
    socket.on("match-update", onMatchUpdate);
    socket.on("leg-complete", onLegComplete);
    socket.on("fetch-match-data", onLegComplete);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      socket.off("match-started", onMatchStarted);
      socket.off("match-finished", onMatchFinished);
      socket.off("match-update", onMatchUpdate);
      socket.off("leg-complete", onLegComplete);
      socket.off("fetch-match-data", onLegComplete);
    };
  }, [refresh, socket]);

  return useMemo(
    () => ({
      matches,
      isLoading,
      isConnected,
      refresh,
      socketFeatureError,
      socketFeatureDenialReason,
      socketFeatureGateReason,
      socketStatus,
    }),
    [
      matches,
      isLoading,
      isConnected,
      refresh,
      socketFeatureError,
      socketFeatureDenialReason,
      socketFeatureGateReason,
      socketStatus,
    ],
  );
}
