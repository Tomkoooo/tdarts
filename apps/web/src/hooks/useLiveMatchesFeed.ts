"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useLiveTournamentClubId } from "@/components/tournament/LiveTournamentClubProvider";
import { getTournamentLiveMatchesClientAction } from "@/features/tournaments/actions/tournamentRoster.action";
import { getLiveMatches } from "@/lib/socketApi";

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

/**
 * Prefer explicit remainings from socket memory whenever both are set (even before throws are listed).
 * Otherwise fall back to starting score until the first throw, then per-field fallbacks.
 */
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

  const n1 = p1Raw != null && p1Raw !== "" ? Number(p1Raw) : NaN;
  const n2 = p2Raw != null && p2Raw !== "" ? Number(p2Raw) : NaN;

  if (!Number.isNaN(n1) && !Number.isNaN(n2)) {
    return { player1Remaining: n1, player2Remaining: n2 };
  }
  if (!hasThrow) {
    return { player1Remaining: starting, player2Remaining: starting };
  }
  return {
    player1Remaining: Number.isNaN(n1) ? starting : n1,
    player2Remaining: Number.isNaN(n2) ? starting : n2,
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

/** Overlay in-memory socket scores for this tournament's ongoing rows (HTTP; works before room join). */
async function hydrateMatchesFromSocketServer(matchesFromDb: LiveFeedMatch[]): Promise<LiveFeedMatch[]> {
  if (!matchesFromDb.length) return matchesFromDb;
  try {
    const data = (await getLiveMatches()) as { success?: boolean; matches?: any[] };
    if (!data?.success || !Array.isArray(data.matches)) return matchesFromDb;
    const allowed = new Set(matchesFromDb.map((m) => normalizeMatchId(m._id)));
    const byId = new Map<string, any>();
    for (const row of data.matches) {
      const id = normalizeMatchId(row?._id);
      if (id && allowed.has(id)) byId.set(id, row);
    }
    return matchesFromDb.map((m) => {
      const row = byId.get(normalizeMatchId(m._id));
      if (!row) return m;
      return mergeMatch(m, {
        currentLeg: Number(row.currentLeg ?? m.currentLeg),
        player1Remaining:
          row.player1Remaining != null ? Number(row.player1Remaining) : m.player1Remaining,
        player2Remaining:
          row.player2Remaining != null ? Number(row.player2Remaining) : m.player2Remaining,
        player1LegsWon: row.player1LegsWon != null ? Number(row.player1LegsWon) : m.player1LegsWon,
        player2LegsWon: row.player2LegsWon != null ? Number(row.player2LegsWon) : m.player2LegsWon,
        player1: {
          _id: row.player1Id != null ? String(row.player1Id) : m.player1?._id,
          name: row.player1Name ?? m.player1?.name,
        },
        player2: {
          _id: row.player2Id != null ? String(row.player2Id) : m.player2?._id,
          name: row.player2Name ?? m.player2?.name,
        },
      });
    });
  } catch {
    return matchesFromDb;
  }
}

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
  const matchesRef = useRef<LiveFeedMatch[]>([]);
  matchesRef.current = matches;
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
      const hydrated = await hydrateMatchesFromSocketServer(normalized);
      setMatches(hydrated);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Merge socket-server memory when the transport is up and we have rows (covers: auth ready after first DB fetch,
   * or first fetch finishing while already connected).
   */
  useEffect(() => {
    if (!isConnected || !matches.length) return;
    let cancelled = false;
    void (async () => {
      const next = await hydrateMatchesFromSocketServer(matchesRef.current);
      if (!cancelled) setMatches(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, matches.length]);

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
