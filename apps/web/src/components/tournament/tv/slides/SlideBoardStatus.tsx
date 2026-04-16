import { BoardSummary } from "@/lib/tv/slideshow";
import { useTvSlideAutoScroll } from "@/components/tournament/tv/useTvSlideAutoScroll";
import SlideFrame from "./SlideFrame";

interface SlideBoardStatusProps {
  boardSummary: BoardSummary;
  title: string;
  emptyLabel: string;
  waitingLabel: string;
  scorerLabel: string;
  scorerFallback: string;
  onRequiredDisplayMsChange?: (ms: number) => void;
}

export default function SlideBoardStatus({
  boardSummary,
  title,
  emptyLabel,
  waitingLabel,
  scorerLabel,
  scorerFallback,
  onRequiredDisplayMsChange,
}: SlideBoardStatusProps) {
  const waitingCards = boardSummary.waitingBoards;
  const gridColumnsClass =
    waitingCards.length >= 7 ? "xl:grid-cols-4" : waitingCards.length >= 4 ? "xl:grid-cols-3" : "xl:grid-cols-2";

  const scrollResetKey = waitingCards.map((b) => `${b.boardNumber}:${b.player1Name}:${b.player2Name}`).join("|");

  const { scrollRef, userInteractionHandlers } = useTvSlideAutoScroll({
    resetKey: scrollResetKey,
    mode: "vertical",
    onRequiredDisplayMsChange,
    enabled: waitingCards.length > 0,
  });

  return (
    <SlideFrame
      title={title}
      subtitle={`${boardSummary.waitingCount} waiting • ${boardSummary.playingCount} playing`}
      accentClassName="from-amber-400/30 via-transparent to-transparent"
    >
      {waitingCards.length === 0 ? (
        <div className="flex h-full items-center justify-center px-3 text-center text-lg text-slate-300 sm:text-2xl md:text-3xl">{emptyLabel}</div>
      ) : (
        <div
          ref={scrollRef}
          className={`grid h-full grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2 md:gap-4 ${gridColumnsClass}`}
          {...userInteractionHandlers}
        >
          {waitingCards.map((board) => (
            <div key={board.boardNumber} className="rounded-2xl border border-amber-300/45 bg-slate-900/70 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-4xl font-black text-amber-300 sm:text-5xl md:text-6xl">#{board.boardNumber}</div>
                <div className="flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-100 sm:text-sm">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-300" />
                  {waitingLabel}
                </div>
              </div>
              <div className="text-lg font-semibold text-slate-100 sm:text-xl md:text-2xl">
                {board.player1Name} vs {board.player2Name}
              </div>
              <div className="mt-2 text-sm text-slate-300 sm:text-base">
                {scorerLabel}: {board.scorerName || scorerFallback}
              </div>
            </div>
          ))}
        </div>
      )}
    </SlideFrame>
  );
}
