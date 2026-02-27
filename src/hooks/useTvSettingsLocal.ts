"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDefaultTvSettings, TvSettings } from "@/lib/tv/slideshow";

const SETTINGS_KEY_PREFIX = "tv-slideshow-settings";

const mergeSettings = (base: TvSettings, incoming: Partial<TvSettings>): TvSettings => {
  const incomingSlides = (incoming as any)?.enabledSlides;
  const migratedSlides =
    incomingSlides && typeof incomingSlides === "object" && !("rankings" in incomingSlides)
      ? {
          ...incomingSlides,
          rankings: Boolean(incomingSlides.rankings180) || Boolean(incomingSlides.rankingsCheckout),
        }
      : incoming.enabledSlides;

  return {
    ...base,
    ...incoming,
    enabledSlides: {
      ...base.enabledSlides,
      ...(migratedSlides || {}),
    },
    perSlideDurationMs: {
      ...base.perSlideDurationMs,
      ...(incoming.perSlideDurationMs || {}),
    },
  };
};

export const useTvSettingsLocal = (tournamentCode?: string) => {
  const key = useMemo(
    () => `${SETTINGS_KEY_PREFIX}:${tournamentCode || "default"}`,
    [tournamentCode]
  );

  const [settings, setSettings] = useState<TvSettings>(getDefaultTvSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        setLoaded(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<TvSettings>;
      setSettings(mergeSettings(getDefaultTvSettings(), parsed));
    } catch (error) {
      console.error("Failed to parse TV settings:", error);
      setSettings(getDefaultTvSettings());
    } finally {
      setLoaded(true);
    }
  }, [key]);

  const updateSettings = useCallback(
    (partial: Partial<TvSettings>) => {
      setSettings((prev) => {
        const next = mergeSettings(prev, partial);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(next));
        }
        return next;
      });
    },
    [key]
  );

  const resetSettings = useCallback(() => {
    const defaults = getDefaultTvSettings();
    setSettings(defaults);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(defaults));
    }
  }, [key]);

  return {
    settings,
    setSettings: updateSettings,
    resetSettings,
    loaded,
  };
};
