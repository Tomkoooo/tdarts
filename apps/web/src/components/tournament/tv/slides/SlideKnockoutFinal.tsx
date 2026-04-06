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
    <SlideFrame title={title} accentClassName="from-amber-500/30 via-transparent to-transparent">
      {!finalMatch ? (
        <div className="flex h-full items-center justify-center px-3 text-center text-lg text-slate-300 sm:text-2xl md:text-3xl">{emptyLabel}</div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="w-full max-w-6xl rounded-3xl border border-amber-300/50 bg-slate-900/75 p-5 sm:p-7 md:p-10">
            <div className="mb-5 text-center text-2xl font-black uppercase tracking-[0.2em] text-amber-300 sm:text-3xl">Final Match</div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
              <div className="rounded-2xl bg-slate-800/80 px-4 py-4 text-center sm:px-6 sm:py-6">
                <div className="truncate text-2xl font-bold sm:text-3xl md:text-4xl">{finalMatch.player1Name}</div>
                <div className="mt-2 text-6xl font-black text-amber-200 sm:text-7xl md:text-8xl">{finalMatch.player1Legs}</div>
              </div>
              <div className="text-center text-3xl font-black uppercase tracking-wider text-slate-300 sm:text-4xl">VS</div>
              <div className="rounded-2xl bg-slate-800/80 px-4 py-4 text-center sm:px-6 sm:py-6">
                <div className="truncate text-2xl font-bold sm:text-3xl md:text-4xl">{finalMatch.player2Name}</div>
                <div className="mt-2 text-6xl font-black text-amber-200 sm:text-7xl md:text-8xl">{finalMatch.player2Legs}</div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-300 sm:text-base md:text-lg">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
              LIVE
            </div>
            <div className="mt-2 text-center text-sm text-slate-300 sm:text-base md:text-lg">{finalMatch.boardLabel}</div>
            <div className="mt-1.5 text-center text-sm text-slate-300 sm:text-base md:text-lg">
              {scorerLabel}: {finalMatch.scorerName || scorerFallback}
            </div>
          </div>
        </div>
      )}
    </SlideFrame>
  );
}
