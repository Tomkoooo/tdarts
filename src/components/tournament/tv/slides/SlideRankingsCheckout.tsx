import { PlayerRankingRow } from "@/lib/tv/slideshow";
import SlideFrame from "./SlideFrame";

interface SlideRankingsCheckoutProps {
  rows: PlayerRankingRow[];
  title: string;
  emptyLabel: string;
}

export default function SlideRankingsCheckout({
  rows,
  title,
  emptyLabel,
}: SlideRankingsCheckoutProps) {
  return (
    <SlideFrame title={title} accentClassName="from-warning/20 to-background">
      {rows.length === 0 ? (
        <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="grid h-full grid-cols-1 gap-3">
          {rows.slice(0, 10).map((row, index) => (
            <div key={row.playerId} className="flex items-center justify-between rounded-xl bg-background/40 px-6 py-4">
              <div className="flex items-center gap-4">
                <span className="w-16 text-4xl font-black text-warning">#{index + 1}</span>
                <span className="truncate text-3xl font-semibold">{row.name}</span>
              </div>
              <span className="text-5xl font-black text-warning">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </SlideFrame>
  );
}
