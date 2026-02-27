import { KnockoutMatchDisplay } from "@/lib/tv/slideshow";
import SlideFrame from "./SlideFrame";

interface SlideKnockoutFinalProps {
  title: string;
  finalMatch?: KnockoutMatchDisplay;
  emptyLabel: string;
  scorerLabel: string;
  scorerFallback: string;
}

export default function SlideKnockoutFinal({
  title,
  finalMatch,
  emptyLabel,
  scorerLabel,
  scorerFallback,
}: SlideKnockoutFinalProps) {
  return (
    <SlideFrame title={title} accentClassName="from-warning/25 to-background">
      {!finalMatch ? (
        <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="w-full max-w-4xl rounded-2xl border border-warning/40 bg-background/40 p-10">
            <div className="mb-4 text-center text-4xl font-black text-warning">Final Match</div>
            <div className="space-y-4 text-4xl">
              <div className="flex items-center justify-between rounded-xl bg-muted/20 px-6 py-4">
                <span className="truncate">{finalMatch.player1Name}</span>
                <span className="font-black">{finalMatch.player1Legs}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/20 px-6 py-4">
                <span className="truncate">{finalMatch.player2Name}</span>
                <span className="font-black">{finalMatch.player2Legs}</span>
              </div>
            </div>
            <div className="mt-5 text-center text-lg text-muted-foreground">{finalMatch.boardLabel}</div>
            <div className="mt-2 text-center text-lg text-muted-foreground">
              {scorerLabel}: {finalMatch.scorerName || scorerFallback}
            </div>
          </div>
        </div>
      )}
    </SlideFrame>
  );
}
