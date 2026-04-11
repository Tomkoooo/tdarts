"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

function formatRelativeTimeAgo(
  referenceMs: number,
  nowMs: number,
  t: (key: string, values?: Record<string, number | string>) => string
): string {
  const sec = Math.max(0, Math.floor((nowMs - referenceMs) / 1000));
  if (sec < 5) {
    return t("boards_view.relative_just_now");
  }
  if (sec < 60) {
    return t("boards_view.relative_seconds_ago", { count: sec });
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return t("boards_view.relative_minutes_ago", { count: min });
  }
  const h = Math.floor(min / 60);
  if (h < 48) {
    return t("boards_view.relative_hours_ago", { count: h });
  }
  const d = Math.floor(h / 24);
  return t("boards_view.relative_days_ago", { count: d });
}

/**
 * Live-updating relative time string (1s tick) for a fixed reference timestamp (ms since epoch).
 */
export function useRelativeTimeAgo(referenceMs: number | null | undefined): string | null {
  const t = useTranslations("Tournament");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (referenceMs == null || !Number.isFinite(referenceMs)) {
      return;
    }
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [referenceMs]);

  if (referenceMs == null || !Number.isFinite(referenceMs)) {
    return null;
  }

  return formatRelativeTimeAgo(referenceMs, nowMs, (key, values) => t(key, values));
}
