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
        <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="grid h-full grid-cols-2 gap-4 overflow-y-auto pr-2">
          {boardSummary.waitingBoards.map((board) => (
            <div key={board.boardNumber} className="rounded-xl border border-warning/30 bg-warning/10 p-5">
              <div className="mb-3 text-3xl font-black text-warning">Board {board.boardNumber}</div>
              <div className="text-2xl font-semibold">{waitingLabel}</div>
              <div className="mt-2 text-2xl">
                {board.player1Name} vs {board.player2Name}
              </div>
              <div className="mt-2 text-lg text-muted-foreground">
                {scorerLabel}: {board.scorerName || scorerFallback}
              </div>
            </div>
          ))}
        </div>
      )}
    </SlideFrame>
  );
}
