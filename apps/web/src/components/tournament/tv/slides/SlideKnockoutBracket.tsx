import { useEffect, useRef } from "react";
import { KnockoutRoundDisplay } from "@/lib/tv/slideshow";
import SlideFrame from "./SlideFrame";

interface SlideKnockoutBracketProps {
  title: string;
  rounds: KnockoutRoundDisplay[];
  sideLabel: string;
  emptyLabel: string;
  scorerLabel: string;
  scorerFallback: string;
  onRequiredDisplayMsChange?: (ms: number) => void;
}

const statusClass = (status: string) => {
  if (status === "ongoing") return "border-emerald-400/60 bg-emerald-400/12";
  if (status === "finished") return "border-sky-400/55 bg-sky-400/10";
  return "border-amber-300/45 bg-amber-300/10";
};

export default function SlideKnockoutBracket({
  title,
  rounds,
  sideLabel,
  emptyLabel,
  scorerLabel,
  scorerFallback,
  onRequiredDisplayMsChange,
}: SlideKnockoutBracketProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userInterruptedAutoScrollRef = useRef(false);
  const cardHeightPx = 132;
  const baseGapPx = 12;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    container.scrollTop = 0;
    container.scrollLeft = 0;
    userInterruptedAutoScrollRef.current = false;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    const rafId = window.requestAnimationFrame(() => {
      const maxScrollX = Math.max(0, container.scrollWidth - container.clientWidth);
      const maxScrollY = Math.max(0, container.scrollHeight - container.clientHeight);
      if (maxScrollX <= 0 && maxScrollY <= 0) return;

      const speedPxX = 1;
      const speedPxY = 1;
      const stepMs = 50;
      const endTolerancePx = 1;
      const pauseAtEndMs = 1500;
      let phase: "forward" | "pause" = "forward";
      let pauseStartedAt = 0;

      intervalId = window.setInterval(() => {
        if (userInterruptedAutoScrollRef.current) return;

        if (phase === "pause") {
          if (Date.now() - pauseStartedAt >= pauseAtEndMs) {
            container.scrollLeft = 0;
            container.scrollTop = 0;
            phase = "forward";
          }
          return;
        }

        if (maxScrollX > 0) {
          container.scrollLeft = Math.min(maxScrollX, container.scrollLeft + speedPxX);
        }

        if (maxScrollY > 0) {
          container.scrollTop = Math.min(maxScrollY, container.scrollTop + speedPxY);
        }

        const atX = maxScrollX <= 0 || container.scrollLeft >= maxScrollX - endTolerancePx;
        const atY = maxScrollY <= 0 || container.scrollTop >= maxScrollY - endTolerancePx;
        if (atX && atY) {
          phase = "pause";
          pauseStartedAt = Date.now();
        }
      }, stepMs);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [rounds]);

  const stopAutoScrollForUser = () => {
    userInterruptedAutoScrollRef.current = true;
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const verticalSpeedPxPerMs = 1 / 50;
    const horizontalSpeedPxPerMs = 1 / 50;
    let maxRequiredMs = 0;

    const horizontalMaxScroll = container.scrollWidth - container.clientWidth;
    if (horizontalMaxScroll > 0) {
      maxRequiredMs = Math.max(maxRequiredMs, horizontalMaxScroll / horizontalSpeedPxPerMs);
    }

    const verticalMaxScroll = container.scrollHeight - container.clientHeight;
    if (verticalMaxScroll > 0) {
      maxRequiredMs = Math.max(maxRequiredMs, verticalMaxScroll / verticalSpeedPxPerMs);
    }

    onRequiredDisplayMsChange?.(maxRequiredMs > 0 ? Math.ceil(maxRequiredMs + 400) : 0);
  }, [rounds, onRequiredDisplayMsChange]);

  return (
    <SlideFrame title={title} subtitle={sideLabel} accentClassName="from-violet-500/25 via-transparent to-transparent">
      {rounds.length === 0 ? (
        <div className="flex h-full items-center justify-center px-3 text-center text-lg text-slate-300 sm:text-2xl md:text-3xl">{emptyLabel}</div>
      ) : (
        <div
          ref={scrollRef}
          className="flex h-full items-stretch gap-3 overflow-x-auto pb-2"
          onWheel={stopAutoScrollForUser}
          onTouchStart={stopAutoScrollForUser}
          onPointerDown={stopAutoScrollForUser}
          onMouseDown={stopAutoScrollForUser}
        >
          {rounds.map((round, roundIndex) => {
            const factor = Math.pow(2, roundIndex);
            const dynamicGap = baseGapPx + (factor - 1) * (cardHeightPx + baseGapPx);
            const dynamicPaddingTop = roundIndex === 0 ? 0 : ((cardHeightPx + baseGapPx) * (factor - 1)) / 2;
            return (
            <div key={round.id} className="flex min-h-0 min-w-72 flex-1 flex-col sm:min-w-80 md:min-w-96">
              <div className="mb-3 text-xl font-black text-violet-200 sm:text-2xl md:text-3xl">{round.label}</div>
              <div
                className="min-h-0 flex-1 pr-1"
                style={{ paddingTop: `${dynamicPaddingTop}px` }}
              >
                <div className="flex flex-col" style={{ gap: `${dynamicGap}px` }}>
                {round.matches.map((match) => (
                  <article
                    key={match.id}
                    className={`h-36 rounded-2xl border p-3 ${statusClass(match.status)}`}
                  >
                    <div className="mb-2 text-sm font-semibold text-slate-300">
                      {match.boardLabel}
                    </div>
                    <div className="flex items-center justify-between text-lg md:text-xl">
                      <span
                        className={`truncate ${
                          match.status === "finished" && match.player1Legs > match.player2Legs ? "font-black text-violet-100" : "font-semibold"
                        }`}
                      >
                        {match.player1Name}
                      </span>
                      <strong>{match.player1Legs}</strong>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-lg md:text-xl">
                      <span
                        className={`truncate ${
                          match.status === "finished" && match.player2Legs > match.player1Legs ? "font-black text-violet-100" : "font-semibold"
                        }`}
                      >
                        {match.player2Name}
                      </span>
                      <strong>{match.player2Legs}</strong>
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      {scorerLabel}: {match.scorerName || scorerFallback}
                    </div>
                  </article>
                ))}
                </div>
              </div>
            </div>
          )})}
        </div>
      )}
    </SlideFrame>
  );
}
