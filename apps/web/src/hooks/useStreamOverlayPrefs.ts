"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tdarts.stream.overlayPrefs";

export type StreamOverlayPrefs = {
  showAvg: boolean;
};

const defaultPrefs = (): StreamOverlayPrefs => ({ showAvg: true });

export function useStreamOverlayPrefs() {
  const [prefs, setPrefs] = useState<StreamOverlayPrefs>(defaultPrefs);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<StreamOverlayPrefs>;
      setPrefs({ ...defaultPrefs(), ...parsed });
    } catch {
      setPrefs(defaultPrefs());
    } finally {
      setLoaded(true);
    }
  }, []);

  const setShowAvg = useCallback((showAvg: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, showAvg };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  }, []);

  return { prefs, loaded, setShowAvg };
}
