"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

export interface LiveFeedMatch {
  _id: string;
  player1: { _id?: string; name?: string };
  player2: { _id?: string; name?: string };
  currentLeg: number;
  player1Remaining: number;
  player2Remaining: number;
  status: string;
  player1LegsWon?: number;
  player2LegsWon?: number;
  lastUpdate?: string;
}

const normalizeMatch = (match: any): LiveFeedMatch => ({
  _id: String(match?._id || ""),
  status: match?.status || "ongoing",
  currentLeg: Number(match?.currentLeg ?? 1),
  player1Remaining: Number(match?.player1Remaining ?? 501),
  player2Remaining: Number(match?.player2Remaining ?? 501),
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
});

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
  const { socket, isConnected } = useSocket({ tournamentId: tournamentCode });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentCode}/live-matches`, { cache: "no-store" });
      const data = await response.json();
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
    const polling = setInterval(() => {
      void refresh();
    }, 7000);
    return () => clearInterval(polling);
  }, [refresh]);

  useEffect(() => {
    const onMatchStarted = (data: { matchId: string; matchData?: any }) => {
      const fallback = normalizeMatch({ _id: data.matchId, status: "ongoing" });
      const normalized = data.matchData ? normalizeMatch({ ...data.matchData, _id: data.matchId }) : fallback;
      setMatches((prev) => {
        const index = prev.findIndex((m) => m._id === normalized._id);
        if (index === -1) return [...prev, normalized];
        const next = [...prev];
        next[index] = mergeMatch(prev[index], normalized);
        return next;
      });
    };

    const onMatchFinished = (data: { matchId: string }) => {
      setMatches((prev) => prev.filter((m) => m._id !== data.matchId));
    };

    const onMatchUpdate = (data: { matchId: string; state?: any }) => {
      setMatches((prev) =>
        prev.map((match) => {
          if (match._id !== data.matchId) return match;
          return mergeMatch(match, {
            currentLeg: data.state?.currentLeg,
            player1Remaining: data.state?.currentLegData?.player1Remaining,
            player2Remaining: data.state?.currentLegData?.player2Remaining,
            player1LegsWon: data.state?.player1LegsWon,
            player2LegsWon: data.state?.player2LegsWon,
          });
        })
      );
    };

    const onLegComplete = () => void refresh();

    socket.on("match-started", onMatchStarted);
    socket.on("match-finished", onMatchFinished);
    socket.on("match-update", onMatchUpdate);
    socket.on("leg-complete", onLegComplete);
    socket.on("fetch-match-data", onLegComplete);

    return () => {
      socket.off("match-started", onMatchStarted);
      socket.off("match-finished", onMatchFinished);
      socket.off("match-update", onMatchUpdate);
      socket.off("leg-complete", onLegComplete);
      socket.off("fetch-match-data", onLegComplete);
    };
  }, [refresh, socket]);

  return useMemo(
    () => ({ matches, isLoading, isConnected, refresh }),
    [matches, isLoading, isConnected, refresh]
  );
}
