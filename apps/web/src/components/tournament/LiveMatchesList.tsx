"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveMatchesFeed } from "@/hooks/useLiveMatchesFeed";
import { getTournamentUpcomingMatchesClientAction } from "@/features/tournaments/actions/tournamentRoster.action";
import { LiveSocketConnectionLabel } from "@/components/tournament/LiveSocketConnectionLabel";
import { Badge } from "@/components/ui/Badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { IconDeviceGamepad2, IconTrophy, IconClock, IconChevronDown, IconCalendarEvent } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

interface LiveMatchesListProps {
  tournamentCode: string;
  onMatchSelect: (matchId: string, match: any) => void;
  selectedMatchId?: string | null;
}

function normalizeMatchId(id: unknown): string {
  if (!id) return "";
  // handle rare cases where an object shape slips through serialization
  const anyId = id as any;
  if (typeof anyId === "object") {
    const direct = anyId._id ?? anyId.$oid ?? anyId.id ?? anyId.value;
    if (typeof direct === "string") return direct;
    // last resort: extract a 24-hex ObjectId from JSON
    try {
      const s = JSON.stringify(anyId);
      const m = s.match(/[a-f0-9]{24}/i);
      if (m) return m[0];
    } catch {
      /* ignore */
    }
    return "";
  }
  const s = String(id);
  const m = s.match(/[a-f0-9]{24}/i);
  return m ? m[0] : s;
}

function matchIdOf(match: any): string {
  return normalizeMatchId(match?._id ?? match?.id ?? match?.matchId);
}

const LiveMatchesList: React.FC<LiveMatchesListProps> = ({ tournamentCode, onMatchSelect, selectedMatchId }) => {
  const tTour = useTranslations("Tournament");
  const t = (key: string, values?: any) => tTour(`live_matches.${key}`, values);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(selectedMatchId || null);
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const {
    matches: liveMatches,
    isLoading,
    socketFeatureError,
    socketFeatureDenialReason,
    socketFeatureGateReason,
    socketStatus,
  } = useLiveMatchesFeed(tournamentCode);

  const liveMatchIds = useMemo(() => new Set(liveMatches.map((m) => matchIdOf(m))), [liveMatches]);
  const filteredUpcomingMatches = useMemo(
    () =>
      upcomingMatches.filter((m) => {
        // upcoming section should *only* contain pending matches
        if (String(m?.status || "pending") !== "pending") return false;
        return !liveMatchIds.has(matchIdOf(m));
      }),
    [upcomingMatches, liveMatchIds],
  );

  const loadUpcoming = useCallback(async () => {
    setUpcomingLoading(true);
    try {
      const data = (await getTournamentUpcomingMatchesClientAction({ code: tournamentCode })) as any;
      if (data?.success && Array.isArray(data.matches)) {
        setUpcomingMatches(data.matches);
      } else {
        setUpcomingMatches([]);
      }
    } catch {
      setUpcomingMatches([]);
    } finally {
      setUpcomingLoading(false);
    }
  }, [tournamentCode]);

  useEffect(() => {
    void loadUpcoming();
  }, [loadUpcoming]);

  useEffect(() => {
    if (upcomingOpen) void loadUpcoming();
  }, [upcomingOpen, loadUpcoming]);

  const handleMatchSelect = (match: any) => {
    const id = matchIdOf(match);
    setSelectedMatch(id);
    onMatchSelect(id, match);
  };

  useEffect(() => {
    if (selectedMatchId) {
      setSelectedMatch(selectedMatchId);
    }
  }, [selectedMatchId]);

  // Keep the upcoming list consistent when matches transition to live:
  // remove anything that is already live (or not pending anymore).
  useEffect(() => {
    if (!upcomingMatches.length) return;
    setUpcomingMatches((prev) =>
      prev.filter((m) => {
        if (String(m?.status || "pending") !== "pending") return false;
        return !liveMatchIds.has(matchIdOf(m));
      }),
    );
  }, [liveMatchIds, upcomingMatches.length]);

  // When a previously "upcoming" selection goes live, collapse the upcoming section
  // so the highlight clearly appears in the live list instead of requiring a second click.
  useEffect(() => {
    if (!selectedMatch) return;
    if (liveMatches.some((m) => matchIdOf(m) === selectedMatch)) {
      setUpcomingOpen(false);
    }
  }, [selectedMatch, liveMatches]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <IconDeviceGamepad2 className="w-5 h-5 text-primary" />
            {t("title")}
          </h3>
          <LiveSocketConnectionLabel
            socketStatus={socketStatus}
            denialReason={socketFeatureDenialReason}
            gateReason={socketFeatureGateReason}
            featureError={socketFeatureError}
            labelPrefix={tTour("live_matches.socket_status.a11y_status")}
            className="max-w-[min(100%,14rem)] sm:max-w-[min(100%,18rem)]"
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("desc")}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {liveMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <IconTrophy className="w-12 h-12 mb-3 opacity-20" />
              <p>{t("no_matches")}</p>
              <p className="text-xs mt-1">{t("no_matches_auto")}</p>
            </div>
          ) : (
            liveMatches.map((match) => (
              <div
                key={matchIdOf(match)}
                onClick={() => handleMatchSelect(match)}
                className={cn(
                  "group relative overflow-hidden rounded-lg border p-4 transition-all hover:shadow-md cursor-pointer",
                  selectedMatch === matchIdOf(match)
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "bg-card hover:border-primary/50",
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge
                    variant={selectedMatch === matchIdOf(match) ? "default" : "secondary"}
                    className="text-[10px] uppercase font-bold tracking-wider"
                  >
                    {t("leg_1mum")}
                    {match.currentLeg}
                  </Badge>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <IconClock className="w-3 h-3" />
                    <span>
                      {match.lastUpdate
                        ? new Date(match.lastUpdate).toLocaleTimeString("hu-HU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 text-center">
                    <div className="text-sm font-semibold truncate px-1" title={match.player1?.name}>
                      {match.player1?.name || t("player_1")}
                    </div>
                    <div
                      className={cn(
                        "text-2xl font-bold font-mono my-1",
                        typeof match.player1Remaining === "number" && match.player1Remaining <= 100
                          ? "text-primary"
                          : "text-foreground",
                      )}
                    >
                      {typeof match.player1Remaining === "number" ? match.player1Remaining : "—"}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5 inline-block">
                      {match.player1LegsWon ?? 0} {t("leg_2aku")}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center text-muted-foreground/30 text-xs font-black">
                    VS
                  </div>

                  <div className="flex-1 text-center">
                    <div className="text-sm font-semibold truncate px-1" title={match.player2?.name}>
                      {match.player2?.name || t("player_2")}
                    </div>
                    <div
                      className={cn(
                        "text-2xl font-bold font-mono my-1",
                        typeof match.player2Remaining === "number" && match.player2Remaining <= 100
                          ? "text-primary"
                          : "text-foreground",
                      )}
                    >
                      {typeof match.player2Remaining === "number" ? match.player2Remaining : "—"}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5 inline-block">
                      {match.player2LegsWon ?? 0} {t("leg_2aku")}
                    </div>
                  </div>
                </div>

                {selectedMatch === matchIdOf(match) && <div className="absolute inset-y-0 left-0 w-1 bg-primary" />}
              </div>
            ))
          )}

          <div className="rounded-lg border bg-muted/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setUpcomingOpen((o) => !o)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 p-3 text-sm font-semibold hover:bg-muted/30 text-left"
            >
              <span className="flex items-center gap-2">
                <IconCalendarEvent className="w-4 h-4 text-primary shrink-0" />
                {t("upcoming_title")}
              </span>
              <IconChevronDown
                className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", upcomingOpen && "rotate-180")}
              />
            </button>
            {upcomingOpen ? (
              <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border/60">
                <p className="text-[11px] text-muted-foreground pt-2">{t("upcoming_desc")}</p>
                {upcomingLoading ? (
                  <div className="h-16 animate-pulse rounded-md bg-muted/40" />
                ) : filteredUpcomingMatches.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">{t("upcoming_empty")}</p>
                ) : (
                  filteredUpcomingMatches.map((match) => (
                    <div
                      key={matchIdOf(match)}
                      onClick={() => handleMatchSelect(match)}
                      className={cn(
                        "rounded-md border p-3 transition-all hover:shadow-sm cursor-pointer text-left",
                        selectedMatch === matchIdOf(match)
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "bg-card/80 hover:border-primary/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant="outline" className="text-[9px] uppercase">
                          {match.type === "knockout" ? t("badge_knockout") : t("badge_group")} ·{" "}
                          {match.boardReference != null ? t("board_n_short", { n: match.boardReference }) : "—"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium truncate">{match.player1?.playerId?.name || t("player_1")}</span>
                        <span className="text-muted-foreground text-xs shrink-0">vs</span>
                        <span className="font-medium truncate text-right">{match.player2?.playerId?.name || t("player_2")}</span>
                      </div>
                      {selectedMatch === matchIdOf(match) && <div className="mt-2 h-0.5 w-full bg-primary rounded-full" />}
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default LiveMatchesList;
