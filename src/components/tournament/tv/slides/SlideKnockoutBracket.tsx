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
  if (status === "ongoing") return "border-green-500/50 bg-green-500/10";
  if (status === "finished") return "border-blue-500/40 bg-blue-500/10";
  return "border-yellow-500/40 bg-yellow-500/10";
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
  const cardHeightPx = 132;
  const baseGapPx = 12;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    container.scrollTop = 0;
    container.scrollLeft = 0;
    const maxScrollX = container.scrollWidth - container.clientWidth;
    const maxScrollY = container.scrollHeight - container.clientHeight;
    if (maxScrollX <= 0 && maxScrollY <= 0) return;

    const speedPxX = 1;
    const speedPxY = 1;
    const stepMs = 50;
    const interval = window.setInterval(() => {
      if (maxScrollX > 0) {
        const nextX = container.scrollLeft + speedPxX;
        container.scrollLeft = nextX >= maxScrollX ? 0 : nextX;
      }

      if (maxScrollY > 0) {
        const nextY = container.scrollTop + speedPxY;
        container.scrollTop = nextY >= maxScrollY ? 0 : nextY;
      }
    }, stepMs);
    return () => window.clearInterval(interval);
  }, [rounds]);

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
    <SlideFrame title={title} subtitle={sideLabel} accentClassName="from-primary/20 to-background">
      {rounds.length === 0 ? (
        <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div ref={scrollRef} className="flex h-full items-stretch gap-4 overflow-x-auto pb-2">
          {rounds.map((round, roundIndex) => {
            const factor = Math.pow(2, roundIndex);
            const dynamicGap = baseGapPx + (factor - 1) * (cardHeightPx + baseGapPx);
            const dynamicPaddingTop = roundIndex === 0 ? 0 : ((cardHeightPx + baseGapPx) * (factor - 1)) / 2;
            return (
            <div key={round.id} className="flex min-h-0 min-w-88 flex-1 flex-col">
              <div className="mb-3 text-2xl font-bold text-primary">{round.label}</div>
              <div
                className="min-h-0 flex-1 pr-1"
                style={{ paddingTop: `${dynamicPaddingTop}px` }}
              >
                <div className="flex flex-col" style={{ gap: `${dynamicGap}px` }}>
                {round.matches.map((match) => (
                  <article
                    key={match.id}
                    className={`h-33 rounded-xl border p-3 ${statusClass(match.status)}`}
                  >
                    <div className="mb-2 text-sm font-semibold text-muted-foreground">
                      {match.boardLabel}
                    </div>
                    <div className="flex items-center justify-between text-lg">
                      <span className="truncate">{match.player1Name}</span>
                      <strong>{match.player1Legs}</strong>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-lg">
                      <span className="truncate">{match.player2Name}</span>
                      <strong>{match.player2Legs}</strong>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
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
