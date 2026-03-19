"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";

const LIVE_TOURNAMENT_STATUSES = new Set([
  "group-stage",
  "knockout",
  "ongoing",
  "in_progress",
]);

const COALESCE_MS = 400;

export function useTournamentRealtimeRefresh(
  tournament: any,
  tournamentId: string | undefined,
  silentRefresh: () => Promise<void>
) {
  const isRealtimeEnabled = LIVE_TOURNAMENT_STATUSES.has(
    tournament?.tournamentSettings?.status
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVisibleRef = useRef(true);

  const scheduleSilentRefresh = useCallback(() => {
    if (!isVisibleRef.current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void silentRefresh();
    }, COALESCE_MS);
  }, [silentRefresh]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
    };
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const { lastEvent } = useRealTimeUpdates({
    tournamentId,
    enabled: isRealtimeEnabled,
  });

  useEffect(() => {
    if (!lastEvent) return;
    if (
      lastEvent.type === "tournament-update" ||
      lastEvent.type === "match-update" ||
      lastEvent.type === "group-update"
    ) {
      const eventTournamentId = lastEvent.data?.tournamentId;
      if (!eventTournamentId || eventTournamentId === tournamentId) {
        scheduleSilentRefresh();
      }
    }
  }, [lastEvent, scheduleSilentRefresh, tournamentId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
}
