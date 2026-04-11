"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";
import type { SseDeltaPayload, SseSectionHint } from "@/lib/events";
import { isSseVerboseDebugEnabled } from "@/lib/sseDebug";

const LIVE_TOURNAMENT_STATUSES = new Set([
  "group-stage",
  "knockout",
  "ongoing",
  "in_progress",
  "active",
]);

const COALESCE_MS = 400;
const RESYNC_JITTER_MIN_MS = 100;
const RESYNC_JITTER_RANGE_MS = 400;
const SSE_DEBUG = process.env.NEXT_PUBLIC_SSE_DEBUG === "true";

type RefetchSection = "boards" | "groups" | "bracket";

function parseSectionHintParts(hint: SseSectionHint | undefined): RefetchSection[] {
  const raw = (hint?.split("+") ?? []).map((s) => s.trim()).filter(Boolean);
  const parts = (raw.length ? raw : ["boards"]).filter(
    (s): s is RefetchSection => s === "boards" || s === "groups" || s === "bracket"
  );
  return parts.length ? [...new Set(parts)] : ["boards"];
}

export function useTournamentRealtimeRefresh(
  tournament: any,
  tournamentId: string | undefined,
  applyDelta: (delta: SseDeltaPayload<any>) => boolean,
  fetchSection: (section: RefetchSection) => Promise<void>
) {
  const isRealtimeEnabled = LIVE_TOURNAMENT_STATUSES.has(
    tournament?.tournamentSettings?.status
  );
  const isVisibleRef = useRef(true);
  const lastResyncAtRef = useRef(0);
  const sectionTimersRef = useRef<Partial<Record<RefetchSection, ReturnType<typeof setTimeout>>>>(
    {}
  );
  const applyDeltaRef = useRef(applyDelta);
  const fetchSectionRef = useRef(fetchSection);

  useEffect(() => {
    applyDeltaRef.current = applyDelta;
    fetchSectionRef.current = fetchSection;
  }, [applyDelta, fetchSection]);

  const jitteredDelay = useCallback((baseMs: number) => {
    const jitter = RESYNC_JITTER_MIN_MS + Math.floor(Math.random() * RESYNC_JITTER_RANGE_MS);
    return baseMs + jitter;
  }, []);

  const scheduleSectionFetch = useCallback(
    (hint: SseSectionHint | undefined) => {
      if (!isVisibleRef.current) return;
      const sections = parseSectionHintParts(hint);
      for (const section of sections) {
        const prev = sectionTimersRef.current[section];
        if (prev) clearTimeout(prev);
        sectionTimersRef.current[section] = setTimeout(() => {
          sectionTimersRef.current[section] = undefined;
          void fetchSectionRef.current(section);
        }, jitteredDelay(COALESCE_MS));
      }
    },
    [jitteredDelay]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current && Date.now() - lastResyncAtRef.current > 10_000) {
        lastResyncAtRef.current = Date.now();
        void fetchSectionRef.current("boards");
      }
    };
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const { sseTick, drainPendingSseEvents, isConnected, sessionExpired } = useRealTimeUpdates({
    tournamentId,
    enabled: isRealtimeEnabled,
  });

  useEffect(() => {
    const events = drainPendingSseEvents();
    if (events.length === 0) return;

    for (const lastEvent of events) {
      const delta = lastEvent.delta;
      if (isSseVerboseDebugEnabled()) {
        console.log("[SSE][TournamentRealtime] drained event", {
          eventType: lastEvent.type,
          hasDelta: Boolean(delta),
          data: lastEvent.data,
          delta,
          pageTournamentCode: tournamentId,
          pageTournamentMongoId:
            typeof tournament?._id === "string" ? tournament._id : tournament?._id?.toString?.(),
          isRealtimeEnabled,
        });
      }
      if (!delta) {
        if (isSseVerboseDebugEnabled()) {
          console.warn("[SSE][TournamentRealtime] no delta — event ignored for merge", lastEvent.type);
        }
        continue;
      }

      const eventTournamentId = delta.tournamentId || lastEvent.data?.tournamentId;
      const tournamentMongoId =
        typeof tournament?._id === "string" ? tournament._id : tournament?._id?.toString?.();
      const isForTournament =
        !eventTournamentId ||
        eventTournamentId === tournamentId ||
        (tournamentMongoId && eventTournamentId === tournamentMongoId);
      if (!isForTournament) {
        if (isSseVerboseDebugEnabled()) {
          console.warn("[SSE][TournamentRealtime] ignored — tournament id mismatch", {
            eventTournamentId,
            pageTournamentCode: tournamentId,
            tournamentMongoId,
          });
        }
        continue;
      }

      const applied = applyDeltaRef.current(delta);
      if (SSE_DEBUG || isSseVerboseDebugEnabled()) {
        console.log("[SSE][TournamentRealtime] applyDelta result", {
          eventType: lastEvent.type,
          scope: delta.scope,
          action: delta.action,
          tournamentId: delta.tournamentId,
          applied,
          sectionHint: delta.sectionHint,
          requiresResync: delta.requiresResync,
        });
      }

      if (delta.scope === "match" && delta.action === "leg-finished" && applied) {
        continue;
      }
      if (delta.scope === "match" && delta.action === "started" && applied) {
        continue;
      }

      if (delta.sectionHint) {
        scheduleSectionFetch(delta.sectionHint);
        continue;
      }

      if (!applied || delta.requiresResync) {
        scheduleSectionFetch("boards");
      }
    }
  }, [sseTick, drainPendingSseEvents, scheduleSectionFetch, tournamentId, tournament?._id]);

  useEffect(() => {
    return () => {
      const timers = sectionTimersRef.current;
      for (const k of Object.keys(timers) as RefetchSection[]) {
        const t = timers[k];
        if (t) clearTimeout(t);
      }
      sectionTimersRef.current = {};
    };
  }, []);

  return { isConnected, sessionExpired, isRealtimeEnabled };
}
