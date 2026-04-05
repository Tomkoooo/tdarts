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
  <section className="rounded-xl border border-muted/20 bg-background/35 p-2.5 sm:p-3 md:p-4">
    <h3 className="mb-2 sm:mb-3 text-lg sm:text-xl md:text-2xl font-black">{heading}</h3>
    {rows.length === 0 ? (
      <div className="rounded-lg bg-muted/15 px-3 sm:px-4 py-4 sm:py-5 text-sm sm:text-base md:text-lg text-muted-foreground">-</div>
    ) : (
      <div className="space-y-1.5 sm:space-y-2">
        {rows.slice(0, 8).map((row, index) => (
          <div key={row.playerId} className="flex items-center justify-between rounded-lg bg-muted/15 px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className={`w-8 sm:w-10 text-lg sm:text-xl md:text-2xl font-black ${accentClass}`}>#{index + 1}</span>
              <span className="truncate text-sm sm:text-base md:text-xl font-semibold">{row.name}</span>
            </div>
            <span className={`text-lg sm:text-2xl md:text-3xl font-black ${accentClass}`}>{row.value}</span>
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
        <div className="flex h-full items-center justify-center text-lg sm:text-2xl md:text-3xl text-muted-foreground text-center px-3">{emptyLabel}</div>
      ) : (
        <div className="grid h-full grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 overflow-y-auto pr-1">
          <RankingColumn rows={rows180} heading={title180} accentClass="text-primary" />
          <RankingColumn rows={rowsCheckout} heading={titleCheckout} accentClass="text-warning" />
        </div>
      )}
    </SlideFrame>
  );
}
