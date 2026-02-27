import { PlayerRankingRow } from "@/lib/tv/slideshow";
import SlideFrame from "./SlideFrame";

interface SlideRankingsCombinedProps {
  rows180: PlayerRankingRow[];
  rowsCheckout: PlayerRankingRow[];
  title: string;
  title180: string;
  titleCheckout: string;
  emptyLabel: string;
}

const RankingColumn = ({
  rows,
  heading,
  accentClass,
}: {
  rows: PlayerRankingRow[];
  heading: string;
  accentClass: string;
}) => (
  <section className="rounded-xl border border-muted/20 bg-background/35 p-4">
    <h3 className="mb-3 text-2xl font-black">{heading}</h3>
    {rows.length === 0 ? (
      <div className="rounded-lg bg-muted/15 px-4 py-5 text-lg text-muted-foreground">-</div>
    ) : (
      <div className="space-y-2">
        {rows.slice(0, 8).map((row, index) => (
          <div key={row.playerId} className="flex items-center justify-between rounded-lg bg-muted/15 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`w-10 text-2xl font-black ${accentClass}`}>#{index + 1}</span>
              <span className="truncate text-xl font-semibold">{row.name}</span>
            </div>
            <span className={`text-3xl font-black ${accentClass}`}>{row.value}</span>
          </div>
        ))}
      </div>
    )}
  </section>
);

export default function SlideRankingsCombined({
  rows180,
  rowsCheckout,
  title,
  title180,
  titleCheckout,
  emptyLabel,
}: SlideRankingsCombinedProps) {
  const hasData = rows180.length > 0 || rowsCheckout.length > 0;

  return (
    <SlideFrame title={title} accentClassName="from-primary/20 to-background">
      {!hasData ? (
        <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="grid h-full grid-cols-2 gap-4">
          <RankingColumn rows={rows180} heading={title180} accentClass="text-primary" />
          <RankingColumn rows={rowsCheckout} heading={titleCheckout} accentClass="text-warning" />
        </div>
      )}
    </SlideFrame>
  );
}
