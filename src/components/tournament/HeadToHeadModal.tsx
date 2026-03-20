import React, { useEffect, useState } from "react";
import { IconLoader2, IconSword, IconTrophy, IconChartBar } from "@tabler/icons-react";
import { SmartAvatar } from "@/components/ui/smart-avatar";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getPlayerTranslations } from "@/data/translations/player";
import LegsViewModal from "@/components/tournament/LegsViewModal";
import { getMatchByIdClientAction } from "@/features/tournaments/actions/tournamentRoster.action";

interface HeadToHeadResponse {
  playerA: { _id: string; name: string };
  playerB: { _id: string; name: string };
  summary: {
    matchesPlayed: number;
    playerAWins: number;
    playerBWins: number;
    playerAAverage: number;
    playerBAverage: number;
    playerAHighestCheckout: number;
    playerBHighestCheckout: number;
    playerAOneEighties: number;
    playerBOneEighties: number;
    playerAFirstNineAvg: number;
    playerBFirstNineAvg: number;
  };
  allTimeComparison?: {
    playerA: {
      matchesPlayed: number;
      wins: number;
      losses: number;
      winRate: number;
      avg: number;
      firstNineAvg: number;
      highestCheckout: number;
      oneEightiesCount: number;
    };
    playerB: {
      matchesPlayed: number;
      wins: number;
      losses: number;
      winRate: number;
      avg: number;
      firstNineAvg: number;
      highestCheckout: number;
      oneEightiesCount: number;
    };
  };
  matches: Array<{
    _id: string;
    date: string;
    tournament: { tournamentId: string; name: string };
    playerA: { legsWon: number; average: number; firstNineAvg?: number; highestCheckout: number; oneEightiesCount: number };
    playerB: { legsWon: number; average: number; firstNineAvg?: number; highestCheckout: number; oneEightiesCount: number };
  }>;
}

interface HeadToHeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  fetchData: () => Promise<any>;
}

export default function HeadToHeadModal({ isOpen, onClose, fetchData }: HeadToHeadModalProps) {
  const t = getPlayerTranslations(typeof navigator !== "undefined" ? navigator.language : "hu");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<HeadToHeadResponse | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<"tournament" | "all-time">("tournament");

  useEffect(() => {
    const run = async () => {
      if (!isOpen) return;
      setLoading(true);
      setError("");
      try {
        const payload = await fetchData();
        if (!payload || typeof payload !== "object" || !("success" in payload) || !payload.success) {
          throw new Error((payload as any)?.error || t.headToHeadFetchError);
        }
        setData((payload as any).data);
      } catch (err: any) {
        setData(null);
        setError(err?.message || t.headToHeadFetchError);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [isOpen, fetchData, reloadToken]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="w-[95vw] max-h-[90vh] max-w-3xl overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t.headToHeadTitle}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setReloadToken((prev) => prev + 1)}>
              {t.retry}
            </Button>
          </div>
        ) : data ? (
          <div className="space-y-8 animate-fade-in relative">
            {/* Head-to-Head Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
              
              {/* Player 1 Card */}
              <div className="lg:col-span-4 bg-card rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden shadow-lg border border-border/50">
                <div className="w-28 h-28 rounded-full overflow-hidden mb-5 ring-4 ring-muted flex items-center justify-center bg-background border border-border/50 shadow-inner">
                  <SmartAvatar playerId={data.playerA._id} name={data.playerA.name} className="w-full h-full text-4xl" />
                </div>
                <h2 className="font-headline text-2xl sm:text-3xl font-bold mb-1 line-clamp-1">{data.playerA.name}</h2>
                <div className="w-full h-px bg-border/50 my-5"></div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="text-left bg-muted/20 p-3 rounded-lg border border-border/30">
                    <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{t.headToHeadAverage || "Avg"}</span>
                    <span className="text-lg font-headline font-black text-foreground">{data.summary.playerAAverage ? data.summary.playerAAverage.toFixed(1) : "—"}</span>
                  </div>
                  <div className="text-right bg-muted/20 p-3 rounded-lg border border-border/30">
                    <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{t.headToHeadOneEighties || "180s"}</span>
                    <span className="text-lg font-headline font-black text-primary">{data.summary.playerAOneEighties || 0}</span>
                  </div>
                </div>
              </div>

              {/* VS Gauge Center */}
              <div className="lg:col-span-4 flex flex-col justify-center items-center gap-6 py-8 lg:py-0">
                <div className="relative w-44 h-44 flex items-center justify-center group">
                  <svg className="absolute w-full h-full -rotate-90 transform drop-shadow-xl" viewBox="0 0 100 100">
                    <circle className="text-muted/30" cx="50" cy="50" fill="none" r="45" stroke="currentColor" strokeWidth="6"></circle>
                    <circle 
                      className="text-primary transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" 
                      cx="50" cy="50" fill="none" r="45" 
                      stroke="currentColor" 
                      strokeDasharray="282.7" 
                      strokeDashoffset={282.7 - (282.7 * ((data.summary.playerAWins / (data.summary.matchesPlayed || 1))))} 
                      strokeLinecap="round" strokeWidth="8">
                    </circle>
                  </svg>
                  <div className="text-center z-10 transition-transform group-hover:scale-110">
                    <span className="block text-4xl sm:text-5xl font-headline font-black text-primary drop-shadow-sm">
                      {((data.summary.playerAWins / (data.summary.matchesPlayed || 1)) * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{t.headToHeadWinrate || "Win Rate"}</span>
                  </div>
                  {/* VS Text */}
                  <div className="absolute -top-6 font-headline italic font-black text-5xl sm:text-6xl text-muted/20 select-none">VS</div>
                </div>
                <div className="flex gap-4 w-full">
                  <div className="flex-1 bg-primary/5 p-4 rounded-xl text-center border border-primary/20 shadow-sm">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-primary mb-1">{t.wins || "Győzelem"}</span>
                    <span className="text-3xl font-headline font-black text-primary">{data.summary.playerAWins}</span>
                  </div>
                  <div className="flex-1 bg-destructive/5 p-4 rounded-xl text-center border border-destructive/20 shadow-sm">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-destructive mb-1">{t.losses || "Vereség"}</span>
                    <span className="text-3xl font-headline font-black text-destructive">{data.summary.playerBWins}</span>
                  </div>
                </div>
              </div>

              {/* Player 2 Card */}
              <div className="lg:col-span-4 bg-card rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden shadow-lg border border-border/50">
                <div className="w-28 h-28 rounded-full overflow-hidden mb-5 ring-4 ring-muted flex items-center justify-center bg-background border border-border/50 shadow-inner">
                  <SmartAvatar playerId={data.playerB._id} name={data.playerB.name} className="w-full h-full text-4xl" />
                </div>
                <h2 className="font-headline text-2xl sm:text-3xl font-bold mb-1 line-clamp-1">{data.playerB.name}</h2>
                <div className="w-full h-px bg-border/50 my-5"></div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="text-left bg-muted/20 p-3 rounded-lg border border-border/30">
                    <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{t.headToHeadAverage || "Avg"}</span>
                    <span className="text-lg font-headline font-black text-foreground">{data.summary.playerBAverage ? data.summary.playerBAverage.toFixed(1) : "—"}</span>
                  </div>
                  <div className="text-right bg-muted/20 p-3 rounded-lg border border-border/30">
                    <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{t.headToHeadOneEighties || "180s"}</span>
                    <span className="text-lg font-headline font-black text-foreground">{data.summary.playerBOneEighties || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Comparison Grids */}
            <div className="grid grid-cols-1 gap-8">
              {/* All-time összehasonlítás Table */}
              <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50 flex flex-col">
                <div className="px-6 py-5 flex items-center justify-between border-b border-border/50 bg-muted/10">
                  <h3 className="font-headline font-bold text-lg">Összesített Mutatók</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={comparisonMode === "tournament" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setComparisonMode("tournament")}
                      className="h-7 px-2 text-[10px] uppercase tracking-widest"
                    >
                      {t.headToHeadScopeTournament || "Tournament"}
                    </Button>
                    <Button
                      variant={comparisonMode === "all-time" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setComparisonMode("all-time")}
                      className="h-7 px-2 text-[10px] uppercase tracking-widest"
                    >
                      {t.headToHeadScopeAllTime || "All-time"}
                    </Button>
                    <IconChartBar className="text-primary" />
                  </div>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full table-fixed text-sm border-collapse min-w-[400px]">
                    <colgroup>
                      <col className="w-[42%]" />
                      <col className="w-[29%]" />
                      <col className="w-[29%]" />
                    </colgroup>
                    <thead>
                      <tr className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold bg-muted/5 border-b border-border/30">
                        <th className="text-left py-4 px-6">{t.headToHeadStatsMetric || "Kategória"}</th>
                        <th className="text-right py-4 px-4 truncate">{data.playerA.name}</th>
                        <th className="text-right py-4 px-6 truncate">{data.playerB.name}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      <tr className="hover:bg-muted/30 transition-colors group">
                        <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadAverage || "Összesített Átlag"}</td>
                        <td className="py-4 px-4 text-right font-headline font-black text-lg text-primary">
                          {comparisonMode === "all-time"
                            ? (data.allTimeComparison?.playerA?.avg ? data.allTimeComparison.playerA.avg.toFixed(1) : "—")
                            : (data.summary.playerAAverage ? data.summary.playerAAverage.toFixed(1) : "—")}
                        </td>
                        <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">
                          {comparisonMode === "all-time"
                            ? (data.allTimeComparison?.playerB?.avg ? data.allTimeComparison.playerB.avg.toFixed(1) : "—")
                            : (data.summary.playerBAverage ? data.summary.playerBAverage.toFixed(1) : "—")}
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/30 transition-colors group">
                        <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadFirstNineAvg || "Első 9 Átlag"}</td>
                        <td className="py-4 px-4 text-right font-headline font-black text-lg text-foreground">
                          {comparisonMode === "all-time"
                            ? (typeof data.allTimeComparison?.playerA?.firstNineAvg === "number" ? data.allTimeComparison.playerA.firstNineAvg.toFixed(1) : "—")
                            : (typeof data.summary.playerAFirstNineAvg === "number" ? data.summary.playerAFirstNineAvg.toFixed(1) : "—")}
                        </td>
                        <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">
                          {comparisonMode === "all-time"
                            ? (typeof data.allTimeComparison?.playerB?.firstNineAvg === "number" ? data.allTimeComparison.playerB.firstNineAvg.toFixed(1) : "—")
                            : (typeof data.summary.playerBFirstNineAvg === "number" ? data.summary.playerBFirstNineAvg.toFixed(1) : "—")}
                        </td>
                      </tr>
                      {comparisonMode === "all-time" ? (
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadWinrate || "Winrate"}</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-foreground">
                            {typeof data.allTimeComparison?.playerA?.winRate === "number" ? `${data.allTimeComparison.playerA.winRate.toFixed(0)}%` : "—"}
                          </td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">
                            {typeof data.allTimeComparison?.playerB?.winRate === "number" ? `${data.allTimeComparison.playerB.winRate.toFixed(0)}%` : "—"}
                          </td>
                        </tr>
                      ) : null}
                      <tr className="hover:bg-muted/30 transition-colors group">
                        <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadHighestCheckout || "Legmagasabb Koszálló"}</td>
                        <td className="py-4 px-4 text-right font-headline font-black text-lg text-foreground">
                          {comparisonMode === "all-time"
                            ? (data.allTimeComparison?.playerA?.highestCheckout || "—")
                            : (data.summary.playerAHighestCheckout || "—")}
                        </td>
                        <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">
                          {comparisonMode === "all-time"
                            ? (data.allTimeComparison?.playerB?.highestCheckout || "—")
                            : (data.summary.playerBHighestCheckout || "—")}
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/30 transition-colors group">
                        <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadOneEighties || "180-as dobások"}</td>
                        <td className="py-4 px-4 text-right font-headline font-black text-lg text-foreground">
                          {comparisonMode === "all-time"
                            ? (data.allTimeComparison?.playerA?.oneEightiesCount || 0)
                            : (data.summary.playerAOneEighties || 0)}
                        </td>
                        <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">
                          {comparisonMode === "all-time"
                            ? (data.allTimeComparison?.playerB?.oneEightiesCount || 0)
                            : (data.summary.playerBOneEighties || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Match History Table */}
              <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50 flex flex-col">
                <div className="px-6 py-5 flex items-center justify-between border-b border-border/50 bg-muted/10">
                  <h3 className="font-headline font-bold text-lg">{t.headToHeadMatches || "Közös Meccsek"} ({data.matches.length})</h3>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  </div>
                </div>
                <div className="p-0 overflow-hidden flex-1 flex flex-col">
                  {data.matches.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-8 text-center text-sm font-bold uppercase tracking-widest text-muted-foreground/50">
                      {t.headToHeadNoMatches || "Nincsenek közös meccsek"}
                    </div>
                  ) : (
                    <div className="max-h-[385px] overflow-y-auto w-full custom-scrollbar">
                      {data.matches.map((match) => {
                        const isWin = match.playerA.legsWon > match.playerB.legsWon;
                        const isDraw = match.playerA.legsWon === match.playerB.legsWon;
                        return (
                          <div key={match._id} className="group relative bg-card border-b border-border/30 hover:bg-muted/30 transition-all p-1">
                            <div className="flex flex-col sm:flex-row justify-between gap-4 p-4">
                              <div className="flex-1 min-w-0 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-headline font-black text-lg shadow-inner ${isWin ? 'bg-primary/20 text-primary' : isDraw ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive/60'}`}>
                                  {isWin ? 'W' : isDraw ? 'D' : 'L'}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold capitalize">{match.tournament.name}</p>
                                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{new Date(match.date).toLocaleDateString("hu-HU")}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 sm:justify-end shrink-0 pl-14 sm:pl-0">
                                <div className="text-right flex items-center gap-3 bg-muted/20 px-3 py-1.5 rounded-lg border border-border/30">
                                  <span className={`font-headline text-2xl font-black ${isWin ? 'text-primary' : 'text-foreground'}`}>{match.playerA.legsWon}</span>
                                  <span className="text-[10px] text-muted-foreground opacity-50 font-black">—</span>
                                  <span className={`font-headline text-2xl font-black ${!isWin && !isDraw ? 'text-foreground' : 'text-muted-foreground/60'}`}>{match.playerB.legsWon}</span>
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={async () => {
                  try {
                    const response = await getMatchByIdClientAction({ matchId: match._id });
                    const nextMatch =
                      response &&
                      typeof response === "object" &&
                      "success" in response &&
                      response.success &&
                      "match" in response
                        ? (response as any).match
                        : { _id: match._id };
                    setSelectedMatch(nextMatch);
                    setShowMatchModal(true);
                  } catch {
                    setSelectedMatch({ _id: match._id });
                    setShowMatchModal(true);
                  }
                }}>
                                    <IconChartBar size={16} />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showMatchModal && selectedMatch && (
          <LegsViewModal
            isOpen={showMatchModal}
            onClose={() => {
              setShowMatchModal(false);
              setSelectedMatch(null);
            }}
            match={selectedMatch}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-muted/20 bg-muted/10 p-2 sm:p-3">
      <div className="mb-2 flex items-center justify-between text-muted-foreground">
        <span className="text-[10px] font-bold uppercase wrap-break-word">{label}</span>
        {icon}
      </div>
      <p className="text-base font-black sm:text-lg">{value}</p>
    </div>
  );
}
