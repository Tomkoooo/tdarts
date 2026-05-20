"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  defaultStreamPlayerProfile,
  mergeStreamPlayerProfile,
  streamPlayerProfileStorageKey,
  type StreamPlayerProfile,
} from "@/lib/stream/streamPlayerProfile";

const SAVE_DEBOUNCE_MS = 400;

export function useStreamPlayerProfile(playerId: string | null | undefined) {
  const [profile, setProfile] = useState<StreamPlayerProfile>(defaultStreamPlayerProfile);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!playerId || typeof window === "undefined") {
      setProfile(defaultStreamPlayerProfile());
      setLoaded(true);
      return;
    }

    setLoaded(false);
    try {
      const raw = window.localStorage.getItem(streamPlayerProfileStorageKey(playerId));
      if (raw) {
        setProfile({ ...defaultStreamPlayerProfile(), ...(JSON.parse(raw) as StreamPlayerProfile) });
      } else {
        setProfile(defaultStreamPlayerProfile());
      }
    } catch {
      setProfile(defaultStreamPlayerProfile());
    } finally {
      setLoaded(true);
    }
  }, [playerId]);

  const updateProfile = useCallback(
    (patch: Partial<StreamPlayerProfile>) => {
      if (!playerId) return;
      setProfile((prev) => {
        const next = mergeStreamPlayerProfile(prev, patch);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          try {
            window.localStorage.setItem(
              streamPlayerProfileStorageKey(playerId),
              JSON.stringify(next)
            );
          } catch {
            /* ignore */
          }
        }, SAVE_DEBOUNCE_MS);
        return next;
      });
    },
    [playerId]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return { profile, loaded, updateProfile, setProfile };
}
