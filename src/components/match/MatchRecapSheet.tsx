"use client";

import { useTranslations } from "next-intl";
import { IconCircleCheck } from "@tabler/icons-react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { MatchRecapSheetProps } from "@/components/match/matchRecapTypes";

function StatCard({
  column,
  labels,
}: {
  column: MatchRecapSheetProps["model"]["player1"];
  labels: {
    avg: string;
    firstNine: string;
    legsWon: string;
    visits: string;
    n140Label: string;
    n100Label: string;
    highestCheckout: string;
    bestLeg: string;
    worstLeg: string;
  };
}) {
  return (
    <Card className="border-border/80 bg-background/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{column.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>{labels.avg}</span>
          <span className="font-bold">{column.average}</span>
        </div>
        <div className="flex justify-between">
          <span>{labels.firstNine}</span>
          <span className="font-bold">{column.firstNine}</span>
        </div>
        <div className="flex justify-between">
          <span>{labels.legsWon}</span>
          <span className="font-bold">{column.legsWon}</span>
        </div>
        <div className="flex justify-between">
          <span>{labels.visits}</span>
          <span className="font-bold">{column.visits}</span>
        </div>
        <div className="flex justify-between">
          <span>{labels.bestLeg}</span>
          <span className="font-bold">{column.bestLegDarts}</span>
        </div>
        <div className="flex justify-between">
          <span>{labels.worstLeg}</span>
          <span className="font-bold">{column.worstLegDarts}</span>
        </div>
        <div className="flex justify-between">
          <span>180</span>
          <span className="font-bold">{column.n180}</span>
        </div>
        <div className="flex justify-between">
          <span>{labels.n140Label}</span>
          <span className="font-bold">{column.n140}</span>
        </div>
        <div className="flex justify-between">
          <span>{labels.n100Label}</span>
          <span className="font-bold">{column.n100}</span>
        </div>
        <div className="flex justify-between">
          <span>{labels.highestCheckout}</span>
          <span className="font-bold">{column.highestCheckout}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const MatchRecapSheet: React.FC<MatchRecapSheetProps> = ({ exportRef, model }) => {
  const t = useTranslations("Board");

  const statLabels = {
    avg: t("átlag"),
    firstNine: t("local.first_nine_avg"),
    legsWon: t("leg_nyert"),
    visits: t("local.throws"),
    n140Label: t("local.scores_140_plus"),
    n100Label: t("local.scores_100_plus"),
    highestCheckout: t("legnagyobb_kiszálló"),
    bestLeg: t("local.best_leg_darts"),
    worstLeg: t("local.worst_leg_darts"),
  };

  return (
    <div
      ref={exportRef}
      className="space-y-8 rounded-xl border border-border bg-card p-4 text-foreground shadow-sm sm:p-6"
    >
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {model.hero.brandLine}
        </p>
        <h2 className="mt-2 text-2xl font-bold">{model.hero.titleLine}</h2>
        <p className="text-muted-foreground">{model.hero.scoreLine}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard column={model.player1} labels={statLabels} />
        <StatCard column={model.player2} labels={statLabels} />
      </div>

      <div className="space-y-3">
        <h3 className="font-headline text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("local.finish_subtitle")}
        </h3>
        {model.legs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("local.no_legs_recorded")}</p>
        ) : (
          <div className="space-y-4">
            {model.legs.map((leg) => (
              <section
                key={leg.legIndex}
                className={cn(
                  "w-full overflow-hidden rounded-2xl border bg-card shadow-sm",
                  leg.legIndex === model.legs.length - 1
                    ? "border-accent/40 ring-1 ring-accent/10"
                    : "border-border",
                )}
              >
                <div
                  className={cn(
                    "flex flex-col gap-2 border-b border-border/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4",
                    leg.legIndex === model.legs.length - 1 ? "bg-accent/5" : "bg-muted/20",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-3 py-1 text-xs font-black uppercase",
                        leg.legIndex === model.legs.length - 1
                          ? "bg-accent text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {t("leg").toUpperCase()} {leg.legIndex + 1}
                    </span>
                  </div>
                  {leg.winnerName ? (
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase">
                      <IconCircleCheck className="h-4 w-4 text-primary" />
                      <span>
                        {t("local.leg_winner")}: {leg.winnerName}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="p-2.5 sm:p-3">
                  <div className="mx-auto w-full max-w-full overflow-x-auto rounded-lg border border-border/30">
                    <div className="min-w-[280px]">
                      <div className="grid grid-cols-[minmax(0,1fr)_44px_28px_44px_minmax(0,1fr)] items-end gap-1 border-b border-border/40 px-2 py-2 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        <div className="min-w-0 text-center">
                          <p className="truncate">{model.player1.name}</p>
                          <p className="font-normal normal-case text-[8px] tracking-normal">
                            {leg.p1DartsApprox ? "~" : ""}
                            {leg.p1DartCount} {t("local.darts_abbr")}
                          </p>
                        </div>
                        <div className="text-center">S</div>
                        <div className="text-center">#</div>
                        <div className="text-center">S</div>
                        <div className="min-w-0 text-center">
                          <p className="truncate">{model.player2.name}</p>
                          <p className="font-normal normal-case text-[8px] tracking-normal">
                            {leg.p2DartsApprox ? "~" : ""}
                            {leg.p2DartCount} {t("local.darts_abbr")}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1.5 p-2">
                        {leg.rows.map((row) => (
                          <div
                            key={`${leg.legIndex}-v-${row.centerLabel}-${row.p1Score}-${row.p2Score}`}
                            className="grid grid-cols-[minmax(0,1fr)_44px_28px_44px_minmax(0,1fr)] items-center gap-1 rounded border border-border/20 bg-muted/10 px-1 py-0.5"
                          >
                            <div className="rounded bg-background/40 px-1 py-0.5 text-center font-mono text-[11px] font-bold text-muted-foreground">
                              {row.p1After}
                            </div>
                            <div
                              className={cn(
                                "rounded px-1 py-0.5 text-center font-mono text-[11px] font-bold",
                                row.p1CellClass,
                              )}
                            >
                              {row.p1Score}
                            </div>
                            <div className="text-center text-[9px] font-bold text-muted-foreground">
                              {row.centerLabel}
                            </div>
                            <div
                              className={cn(
                                "rounded px-1 py-0.5 text-center font-mono text-[11px] font-bold",
                                row.p2CellClass,
                              )}
                            >
                              {row.p2Score}
                            </div>
                            <div className="rounded bg-background/40 px-1 py-0.5 text-center font-mono text-[11px] font-bold text-muted-foreground">
                              {row.p2After}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2 border-t border-border/40 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <div>
                          {t("local.remaining_short")}:{" "}
                          <span
                            className={cn(
                              "ml-1 text-xs font-bold",
                              leg.isP1Winner ? "text-primary" : "text-foreground",
                            )}
                          >
                            {leg.p1Remaining}
                          </span>
                        </div>
                        <div className="text-right">
                          {t("local.remaining_short")}:{" "}
                          <span
                            className={cn(
                              "ml-1 text-xs font-bold",
                              leg.isP2Winner ? "text-primary" : "text-foreground",
                            )}
                          >
                            {leg.p2Remaining}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchRecapSheet;
