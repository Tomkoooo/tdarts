import { BoardSummary } from "@/lib/tv/slideshow";
import SlideFrame from "./SlideFrame";

interface SlideBoardStatusProps {
  boardSummary: BoardSummary;
  title: string;
  emptyLabel: string;
  waitingLabel: string;
  scorerLabel: string;
  scorerFallback: string;
}

export default function SlideBoardStatus({
  boardSummary,
  title,
  emptyLabel,
  waitingLabel,
  scorerLabel,
  scorerFallback,
}: SlideBoardStatusProps) {
  return (
    <SlideFrame
      title={title}
      subtitle={`${boardSummary.waitingCount} waiting • ${boardSummary.playingCount} playing`}
      accentClassName="from-warning/25 to-background"
    >
      {boardSummary.waitingBoards.length === 0 ? (
        <div className="flex h-full items-center justify-center text-lg sm:text-2xl md:text-3xl text-muted-foreground text-center px-3">{emptyLabel}</div>
      ) : (
        <div className="grid h-full grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 overflow-y-auto pr-1 sm:pr-2">
          {boardSummary.waitingBoards.map((board) => (
            <div key={board.boardNumber} className="rounded-xl border border-warning/30 bg-warning/10 p-3 sm:p-4 md:p-5">
              <div className="mb-2 sm:mb-3 text-xl sm:text-2xl md:text-3xl font-black text-warning">Board {board.boardNumber}</div>
              <div className="text-base sm:text-lg md:text-2xl font-semibold">{waitingLabel}</div>
              <div className="mt-1.5 sm:mt-2 text-base sm:text-lg md:text-2xl">
                {board.player1Name} vs {board.player2Name}
              </div>
              <div className="mt-1.5 sm:mt-2 text-sm sm:text-base md:text-lg text-muted-foreground">
                {scorerLabel}: {board.scorerName || scorerFallback}
              </div>
            </div>
          ))}
        </div>
      )}
    </SlideFrame>
  );
}
