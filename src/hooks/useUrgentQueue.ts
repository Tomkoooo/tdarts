"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { UrgentEvent } from "@/lib/tv/slideshow";

interface UrgentQueueOptions {
  cooldownMs?: number;
  maxQueueSize?: number;
}

export const useUrgentQueue = (options?: UrgentQueueOptions) => {
  const cooldownMs = options?.cooldownMs ?? 20000;
  const maxQueueSize = options?.maxQueueSize ?? 50;
  const [queue, setQueue] = useState<UrgentEvent[]>([]);
  const cooldownRef = useRef<Map<string, number>>(new Map());

  const enqueueMany = useCallback(
    (events: UrgentEvent[]) => {
      if (!events.length) return 0;

      const accepted: UrgentEvent[] = [];
      const now = Date.now();

      for (const event of events) {
        const lastAt = cooldownRef.current.get(event.cooldownKey);
        if (lastAt && now - lastAt < cooldownMs) {
          continue;
        }
        accepted.push(event);
        cooldownRef.current.set(event.cooldownKey, now);
      }

      if (!accepted.length) return 0;

      setQueue((prev) => {
        const dedupe = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        for (const event of accepted) {
          if (!dedupe.has(event.id)) {
            merged.push(event);
            dedupe.add(event.id);
          }
        }
        if (merged.length > maxQueueSize) {
          return merged.slice(merged.length - maxQueueSize);
        }
        return merged;
      });

      return accepted.length;
    },
    [cooldownMs, maxQueueSize]
  );

  const dequeue = useCallback(() => {
    let next: UrgentEvent | undefined;
    setQueue((prev) => {
      if (!prev.length) return prev;
      [next] = prev;
      return prev.slice(1);
    });
    return next;
  }, []);

  const clear = useCallback(() => {
    setQueue([]);
  }, []);

  const pendingCount = queue.length;
  const hasUrgent = pendingCount > 0;

  return useMemo(
    () => ({
      queue,
      enqueueMany,
      dequeue,
      clear,
      pendingCount,
      hasUrgent,
    }),
    [queue, enqueueMany, dequeue, clear, pendingCount, hasUrgent]
  );
};
