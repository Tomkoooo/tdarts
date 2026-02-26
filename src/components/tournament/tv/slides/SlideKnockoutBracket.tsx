import { KnockoutRoundDisplay } from "@/lib/tv/slideshow";
import SlideFrame from "./SlideFrame";

interface SlideKnockoutBracketProps {
  title: string;
  rounds: KnockoutRoundDisplay[];
  sideLabel: string;
  emptyLabel: string;
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
}: SlideKnockoutBracketProps) {
  return (
    <SlideFrame title={title} subtitle={sideLabel} accentClassName="from-primary/20 to-background">
      {rounds.length === 0 ? (
        <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="flex h-full gap-4 overflow-x-auto pb-2">
          {rounds.map((round) => (
            <div key={round.id} className="min-w-[22rem] flex-1">
              <div className="mb-3 text-2xl font-bold text-primary">{round.label}</div>
              <div className="space-y-3">
                {round.matches.map((match) => (
                  <article
                    key={match.id}
                    className={`rounded-xl border p-3 ${statusClass(match.status)}`}
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
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SlideFrame>
  );
}
