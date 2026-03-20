"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";
import type { SseDeltaPayload } from "@/lib/events";

const LIVE_TOURNAMENT_STATUSES = new Set([
  "group-stage",
  "knockout",
  "ongoing",
  "in_progress",
]);

const COALESCE_MS = 400;
const SSE_DEBUG = process.env.NEXT_PUBLIC_SSE_DEBUG === "true";

export function useTournamentRealtimeRefresh(
  tournament: any,
  tournamentId: string | undefined,
  applyDelta: (delta: SseDeltaPayload<any>) => boolean,
  resyncFullData: () => Promise<void>
) {
  const isRealtimeEnabled = LIVE_TOURNAMENT_STATUSES.has(
    tournament?.tournamentSettings?.status
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVisibleRef = useRef(true);
  const resyncInFlightRef = useRef(false);

  const scheduleResync = useCallback(() => {
    if (!isVisibleRef.current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      if (resyncInFlightRef.current) return;
      resyncInFlightRef.current = true;
      if (SSE_DEBUG) {
        console.log("[SSE][TournamentRealtime] fallback-resync:start", {
          tournamentId,
        });
      }
      void resyncFullData().finally(() => {
        resyncInFlightRef.current = false;
        if (SSE_DEBUG) {
          console.log("[SSE][TournamentRealtime] fallback-resync:done", {
            tournamentId,
          });
        }
      });
    }, COALESCE_MS);
  }, [resyncFullData, tournamentId]);

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
    const delta = lastEvent.delta;
    if (!delta) return;

    const eventTournamentId = delta.tournamentId || lastEvent.data?.tournamentId;
    const tournamentMongoId =
      typeof tournament?._id === "string" ? tournament._id : tournament?._id?.toString?.();
    const isForTournament =
      !eventTournamentId ||
      eventTournamentId === tournamentId ||
      (tournamentMongoId && eventTournamentId === tournamentMongoId);
    if (!isForTournament) return;

    const applied = applyDelta(delta);
    if (SSE_DEBUG) {
      console.log("[SSE][TournamentRealtime] delta", {
        eventType: lastEvent.type,
        scope: delta.scope,
        action: delta.action,
        tournamentId: delta.tournamentId,
        applied,
        fallbackResync: delta.requiresResync || !applied,
      });
    }
    if (delta.requiresResync || !applied) {
      scheduleResync();
    }
  }, [lastEvent, scheduleResync, applyDelta, tournamentId, tournament?._id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
}
