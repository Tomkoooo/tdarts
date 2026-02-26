"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SlideDefinition, TvSettings } from "@/lib/tv/slideshow";

interface UseSlideSchedulerOptions {
  baseSlides: SlideDefinition[];
  settings: TvSettings;
  enabled?: boolean;
  consumeUrgent: () => SlideDefinition | undefined;
}

const FALLBACK_SLIDE: SlideDefinition = {
  id: "fallback-slide",
  type: "fallback",
  kind: "fallback",
};

export const useSlideScheduler = ({
  baseSlides,
  settings,
  consumeUrgent,
  enabled = true,
}: UseSlideSchedulerOptions) => {
  const [activeSlide, setActiveSlide] = useState<SlideDefinition | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const baseIndexRef = useRef(0);
  const consecutiveUrgentRef = useRef(0);
  const activeSlideRef = useRef<SlideDefinition | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pickBase = useCallback(() => {
    if (!baseSlides.length) return FALLBACK_SLIDE;
    const idx = baseIndexRef.current % baseSlides.length;
    const selected = baseSlides[idx];
    baseIndexRef.current = (idx + 1) % baseSlides.length;
    consecutiveUrgentRef.current = 0;
    return selected;
  }, [baseSlides]);

  const pickNext = useCallback(
    (preferUrgent = true) => {
      if (!enabled) return;

      let next: SlideDefinition | undefined;
      if (preferUrgent && consecutiveUrgentRef.current < settings.maxConsecutiveUrgent) {
        next = consumeUrgent();
        if (next) {
          consecutiveUrgentRef.current += 1;
        }
      }

      if (!next) {
        next = pickBase();
      }

      activeSlideRef.current = next;
      setActiveSlide(next);
    },
    [enabled, settings.maxConsecutiveUrgent, consumeUrgent, pickBase]
  );

  const showUrgentNow = useCallback(() => {
    if (!enabled || !settings.highAlertInterrupts) return false;
    if (consecutiveUrgentRef.current >= settings.maxConsecutiveUrgent) return false;

    const urgent = consumeUrgent();
    if (!urgent) return false;

    clearTimer();
    consecutiveUrgentRef.current += 1;
    activeSlideRef.current = urgent;
    setActiveSlide(urgent);
    return true;
  }, [
    enabled,
    settings.highAlertInterrupts,
    settings.maxConsecutiveUrgent,
    consumeUrgent,
    clearTimer,
  ]);

  useEffect(() => {
    if (!enabled || isPaused) return;
    if (!activeSlideRef.current) {
      pickNext(true);
      return;
    }

    const active = activeSlideRef.current;
    const durationMs =
      active?.durationMs ??
      (active?.kind === "urgent" ? settings.urgentIntervalMs : settings.baseIntervalMs);

    clearTimer();
    timerRef.current = setTimeout(() => {
      pickNext(true);
    }, durationMs);

    return clearTimer;
  }, [
    enabled,
    isPaused,
    settings.baseIntervalMs,
    settings.urgentIntervalMs,
    activeSlide,
    pickNext,
    clearTimer,
  ]);

  useEffect(() => {
    if (!enabled) return;

    if (!baseSlides.length && (!activeSlideRef.current || activeSlideRef.current.kind !== "urgent")) {
      activeSlideRef.current = FALLBACK_SLIDE;
      setActiveSlide(FALLBACK_SLIDE);
      return;
    }

    if (baseIndexRef.current >= baseSlides.length && baseSlides.length > 0) {
      baseIndexRef.current = 0;
    }
  }, [enabled, baseSlides]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return useMemo(
    () => ({
      activeSlide: activeSlide ?? FALLBACK_SLIDE,
      nextSlide: () => pickNext(true),
      showUrgentNow,
      pause: () => setIsPaused(true),
      resume: () => setIsPaused(false),
      isPaused,
    }),
    [activeSlide, pickNext, showUrgentNow, isPaused]
  );
};
