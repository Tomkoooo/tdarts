"use client";

import { useCallback, useEffect, useRef } from "react";

/** Matches SlideKnockoutBracket: 1px per 50ms. */
export const TV_SCROLL_STEP_MS = 50;
export const TV_SCROLL_SPEED_PX_PER_STEP = 1;
export const TV_SCROLL_PAUSE_AT_END_MS = 1500;
export const TV_SCROLL_REQUIRED_EXTRA_MS = 400;
const END_TOLERANCE_PX = 1;

const pxPerMs = TV_SCROLL_SPEED_PX_PER_STEP / TV_SCROLL_STEP_MS;

export function computeRequiredDisplayMs(maxScrollX: number, maxScrollY: number): number {
  let maxRequiredMs = 0;
  if (maxScrollX > 0) {
    maxRequiredMs = Math.max(maxRequiredMs, maxScrollX / pxPerMs);
  }
  if (maxScrollY > 0) {
    maxRequiredMs = Math.max(maxRequiredMs, maxScrollY / pxPerMs);
  }
  return maxRequiredMs > 0 ? Math.ceil(maxRequiredMs + TV_SCROLL_REQUIRED_EXTRA_MS) : 0;
}

/** Minimum dwell for vertical overflow only (ignore horizontal). */
export function computeVerticalOnlyRequiredDisplayMs(maxScrollY: number): number {
  if (maxScrollY <= 0) return 0;
  return Math.ceil(maxScrollY / pxPerMs + TV_SCROLL_REQUIRED_EXTRA_MS);
}

export type TvSlideAutoScrollMode = "vertical" | "both";

export interface UseTvSlideAutoScrollOptions {
  /** When this changes, scroll position resets and autoscroll restarts. */
  resetKey: unknown;
  mode: TvSlideAutoScrollMode;
  onRequiredDisplayMsChange?: (ms: number) => void;
  /** If false, skip autoscroll and report 0 (e.g. empty slide). */
  enabled?: boolean;
}

export function useTvSlideAutoScroll({
  resetKey,
  mode,
  onRequiredDisplayMsChange,
  enabled = true,
}: UseTvSlideAutoScrollOptions) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userInterruptedRef = useRef(false);

  const stopAutoScrollForUser = useCallback(() => {
    userInterruptedRef.current = true;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const container = scrollRef.current;
    if (!container) return;

    container.scrollTop = 0;
    container.scrollLeft = 0;
    userInterruptedRef.current = false;

    let intervalId: number | null = null;
    let innerRaf = 0;
    let cancelled = false;

    const startInterval = () => {
      if (cancelled) return;
      const maxScrollX =
        mode === "both" ? Math.max(0, container.scrollWidth - container.clientWidth) : 0;
      const maxScrollY = Math.max(0, container.scrollHeight - container.clientHeight);
      if (maxScrollX <= 0 && maxScrollY <= 0) return;

      let phase: "forward" | "pause" = "forward";
      let pauseStartedAt = 0;

      intervalId = window.setInterval(() => {
        if (userInterruptedRef.current) return;

        if (phase === "pause") {
          if (Date.now() - pauseStartedAt >= TV_SCROLL_PAUSE_AT_END_MS) {
            container.scrollLeft = 0;
            container.scrollTop = 0;
            phase = "forward";
          }
          return;
        }

        if (maxScrollX > 0) {
          container.scrollLeft = Math.min(maxScrollX, container.scrollLeft + TV_SCROLL_SPEED_PX_PER_STEP);
        }

        if (maxScrollY > 0) {
          container.scrollTop = Math.min(maxScrollY, container.scrollTop + TV_SCROLL_SPEED_PX_PER_STEP);
        }

        const atX = maxScrollX <= 0 || container.scrollLeft >= maxScrollX - END_TOLERANCE_PX;
        const atY = maxScrollY <= 0 || container.scrollTop >= maxScrollY - END_TOLERANCE_PX;
        if (atX && atY) {
          phase = "pause";
          pauseStartedAt = Date.now();
        }
      }, TV_SCROLL_STEP_MS);
    };

    const outerRaf = window.requestAnimationFrame(() => {
      innerRaf = window.requestAnimationFrame(startInterval);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(outerRaf);
      window.cancelAnimationFrame(innerRaf);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [resetKey, mode, enabled]);

  const reportRequiredMs = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !enabled) {
      onRequiredDisplayMsChange?.(0);
      return;
    }
    const maxScrollX =
      mode === "both" ? Math.max(0, container.scrollWidth - container.clientWidth) : 0;
    const maxScrollY = Math.max(0, container.scrollHeight - container.clientHeight);

    if (mode === "vertical") {
      onRequiredDisplayMsChange?.(computeVerticalOnlyRequiredDisplayMs(maxScrollY));
    } else {
      onRequiredDisplayMsChange?.(computeRequiredDisplayMs(maxScrollX, maxScrollY));
    }
  }, [enabled, mode, onRequiredDisplayMsChange]);

  useEffect(() => {
    if (!enabled) {
      onRequiredDisplayMsChange?.(0);
      return;
    }
    const container = scrollRef.current;
    if (!container) return;

    reportRequiredMs();

    const ro = new ResizeObserver(() => {
      reportRequiredMs();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [resetKey, enabled, mode, reportRequiredMs, onRequiredDisplayMsChange]);

  const userInteractionHandlers = {
    onWheel: stopAutoScrollForUser,
    onTouchStart: stopAutoScrollForUser,
    onPointerDown: stopAutoScrollForUser,
    onMouseDown: stopAutoScrollForUser,
  };

  return { scrollRef, userInteractionHandlers, stopAutoScrollForUser };
}
