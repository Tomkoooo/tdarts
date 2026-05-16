import { PlayerRankingRow } from "@/lib/tv/slideshow";
import { useTvSlideAutoScroll } from "@/components/tournament/tv/useTvSlideAutoScroll";
import SlideFrame from "./SlideFrame";

interface SlideRankingsCombinedProps {
  rows180: PlayerRankingRow[];
  rowsCheckout: PlayerRankingRow[];
  title: string;
  title180: string;
  titleCheckout: string;
  emptyLabel: string;
  onRequiredDisplayMsChange?: (ms: number) => void;
}

const formatStat = (value: number | null | undefined, decimals = 1) => {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return value.toFixed(decimals);
};

const formatTvRankingStats = (row: PlayerRankingRow) => {
  const bestLeg =
    row.bestLegDarts != null && Number.isFinite(row.bestLegDarts) && row.bestLegDarts > 0
      ? String(row.bestLegDarts)
      : "—";
  const tour = formatStat(row.tournamentAvg);
  const match = formatStat(row.bestMatchAvg);
  const avgLine = tour === "—" && match === "—" ? "—" : `${tour} / ${match}`;
  return { bestLeg, avgLine };
};

const RankingColumn = ({
  rows,
  heading,
  accentClass,
}: {
  rows: PlayerRankingRow[];
  heading: string;
  accentClass: string;
}) => (
  <section className="rounded-2xl border border-slate-700/60 bg-slate-900/65 p-3 sm:p-4 md:p-5">
    <h3 className="mb-3 text-xl font-black text-slate-100 sm:text-2xl md:text-3xl">{heading}</h3>
    {rows.length === 0 ? (
      <div className="rounded-lg bg-slate-800/80 px-4 py-5 text-base text-slate-300">-</div>
    ) : (
      <div className="space-y-2">
        {rows.slice(0, 8).map((row, index) => {
          const { bestLeg, avgLine } = formatTvRankingStats(row);
          return (
            <div key={row.playerId} className="flex items-center justify-between gap-2 rounded-xl bg-slate-800/80 px-4 py-2.5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className={`w-10 shrink-0 font-black ${accentClass} ${
                    index === 0 ? "text-4xl" : index <= 2 ? "text-3xl" : "text-2xl"
                  }`}
                >
                  #{index + 1}
                </span>
                <span className={`truncate font-semibold text-slate-100 ${index === 0 ? "text-2xl" : "text-xl"}`}>
                  {row.name}
                  {row.timeLabel ? (
                    <span className="ml-1.5 text-sm font-normal italic text-slate-500">{row.timeLabel}</span>
                  ) : null}
                </span>
              </div>
              <div className="flex min-w-[4.5rem] shrink-0 flex-col items-end justify-center leading-tight">
                <span className="text-sm font-bold text-slate-300">{bestLeg}</span>
                <span className="text-xs font-semibold text-slate-500">{avgLine}</span>
              </div>
              <span className={`shrink-0 text-3xl font-black ${accentClass} sm:text-4xl`}>{row.value}</span>
            </div>
          );
        })}
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
  onRequiredDisplayMsChange,
}: SlideRankingsCombinedProps) {
  const hasData = rows180.length > 0 || rowsCheckout.length > 0;

  const scrollResetKey = `${rows180.map((r) => `${r.playerId}:${r.value}:${r.timeLabel ?? ""}`).join("|")}__${rowsCheckout.map((r) => `${r.playerId}:${r.value}:${r.timeLabel ?? ""}`).join("|")}`;

  const { scrollRef, userInteractionHandlers } = useTvSlideAutoScroll({
    resetKey: scrollResetKey,
    mode: "vertical",
    onRequiredDisplayMsChange,
    enabled: hasData,
  });

  return (
    <SlideFrame title={title} accentClassName="from-fuchsia-500/25 via-transparent to-transparent">
      {!hasData ? (
        <div className="flex h-full items-center justify-center px-3 text-center text-lg text-slate-300 sm:text-2xl md:text-3xl">
          {emptyLabel}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="grid h-full grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2 md:gap-4"
          {...userInteractionHandlers}
        >
          <RankingColumn rows={rows180} heading={`Darts ${title180}`} accentClass="text-fuchsia-300" />
          <RankingColumn rows={rowsCheckout} heading={`Trophy ${titleCheckout}`} accentClass="text-amber-300" />
        </div>
      )}
    </SlideFrame>
  );
}
