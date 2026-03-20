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
const RESYNC_JITTER_MIN_MS = 100;
const RESYNC_JITTER_RANGE_MS = 400;
const FULL_ESCALATION_FAILURE_THRESHOLD = 2;
const SSE_DEBUG = process.env.NEXT_PUBLIC_SSE_DEBUG === "true";

export function useTournamentRealtimeRefresh(
  tournament: any,
  tournamentId: string | undefined,
  applyDelta: (delta: SseDeltaPayload<any>) => boolean,
  refreshLite: () => Promise<boolean>,
  resyncFullData: () => Promise<void>
) {
  const isRealtimeEnabled = LIVE_TOURNAMENT_STATUSES.has(
    tournament?.tournamentSettings?.status
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVisibleRef = useRef(true);
  const lastResyncAtRef = useRef(0);
  const resyncInFlightRef = useRef(false);
  const liteFailureCountRef = useRef(0);

  const jitteredDelay = useCallback((baseMs: number) => {
    const jitter = RESYNC_JITTER_MIN_MS + Math.floor(Math.random() * RESYNC_JITTER_RANGE_MS);
    return baseMs + jitter;
  }, []);

  const scheduleResync = useCallback((mode: "lite" | "full") => {
    if (!isVisibleRef.current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      if (resyncInFlightRef.current) return;
      resyncInFlightRef.current = true;
      lastResyncAtRef.current = Date.now();
      if (SSE_DEBUG) {
        console.log("[SSE][TournamentRealtime] fallback-resync:start", {
          mode,
          tournamentId,
        });
      }
      const resyncJob = async () => {
        if (mode === "lite") {
          const liteOk = await refreshLite();
          if (liteOk) {
            liteFailureCountRef.current = 0;
            return;
          }
          liteFailureCountRef.current += 1;
          if (liteFailureCountRef.current >= FULL_ESCALATION_FAILURE_THRESHOLD) {
            scheduleResync("full");
          }
          return;
        }
        liteFailureCountRef.current = 0;
        await resyncFullData();
      };
      void resyncJob().finally(() => {
        resyncInFlightRef.current = false;
        if (SSE_DEBUG) {
          console.log("[SSE][TournamentRealtime] fallback-resync:done", {
            mode,
            tournamentId,
          });
        }
      });
    }, mode === "full" ? jitteredDelay(COALESCE_MS * 2) : jitteredDelay(COALESCE_MS));
  }, [jitteredDelay, refreshLite, resyncFullData, tournamentId]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current && Date.now() - lastResyncAtRef.current > 10_000) {
        scheduleResync("lite");
      }
    };
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [scheduleResync]);

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
      const fallbackMode: "lite" | "full" =
        delta.requiresResync || delta.scope === "match" || delta.scope === "group"
          ? "full"
          : "lite";
      scheduleResync(fallbackMode);
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
