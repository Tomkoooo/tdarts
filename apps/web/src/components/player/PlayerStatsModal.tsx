import { useTranslations } from "next-intl";
import React from "react"
import {
  IconCalendarStats,
  IconChartBar,
  IconMedal,
  IconTarget,
  IconTrophy,
  IconTrendingUp,
  IconChevronDown,
  IconLoader2,
  IconHistory,
  IconSword,
  IconShieldCheck,
  IconUsers,
  IconTargetArrow
} from "@tabler/icons-react"
import { getPlayerModalDataAction } from "@/features/players/actions/getPlayerModalData.action"

import { Player } from "@/interface/player.interface"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/Badge"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { showErrorToast } from "@/lib/toastUtils"
import { SmartAvatar } from "@/components/ui/smart-avatar"
import CountryFlag from "@/components/ui/country-flag"

interface PlayerStatsModalProps {
  player: Player | null
  clubId?: string
  onClose: () => void
  isOacContext?: boolean
}

const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ player, onClose, isOacContext }) => {
  const tTour = useTranslations("Tournament");
  const t = (key: string, values?: any) => tTour(`player_stats_modal.${key}`, values);
  const tStats = (key: string, values?: any) => tTour(`statistics.${key}`, values);
  const [activePlayer, setActivePlayer] = React.useState<Player | null>(player)
  const [navigationHistory, setNavigationHistory] = React.useState<Player[]>([])
  const [playerStats, setPlayerStats] = React.useState<Player | null>(null)
  const [matchHistory, setMatchHistory] = React.useState<any[]>([])
  const [teams, setTeams] = React.useState<Player[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [expandedTournament, setExpandedTournament] = React.useState<number | null>(null)
  const [selectedSeason, setSelectedSeason] = React.useState<string>('current')

  React.useEffect(() => {
    setActivePlayer(player)
    setNavigationHistory([])
  }, [player])

  const navigateToPlayer = (newPlayer: Player) => {
    if (activePlayer) {
      setNavigationHistory(prev => [...prev, activePlayer])
    }
    setActivePlayer(newPlayer)
  }

  const navigateBack = () => {
    const prev = [...navigationHistory]
    const last = prev.pop()
    if (last) {
      setNavigationHistory(prev)
      setActivePlayer(last)
    }
  }

  React.useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!activePlayer?._id) return
      
      setIsLoading(true)
      try {
        const response = await getPlayerModalDataAction({ playerId: String(activePlayer._id) })
        const payload =
          response &&
          typeof response === "object" &&
          "success" in response &&
          response.success &&
          "data" in response
            ? (response as unknown as { data?: { player?: Player | null; matchHistory?: any[]; teams?: Player[] } }).data
            : null
        const nextPlayer = payload?.player || null
        setPlayerStats(nextPlayer)
        setMatchHistory(payload?.matchHistory || [])
        setTeams(payload?.teams || [])
        if (nextPlayer?.tournamentHistory && nextPlayer.tournamentHistory.length > 0) {
          setExpandedTournament(0)
        }
      } catch (error: any) {
        console.error('Failed to fetch player stats:', error)
        showErrorToast(t("nem_sikerült_betölteni_76"), {
          error: error?.message,
          context: 'Játékos statisztika betöltése',
          errorName: 'Statisztika betöltése sikertelen',
        })
        setPlayerStats(activePlayer)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlayerStats()
  }, [activePlayer?._id])

  const displayPlayer = React.useMemo(() => playerStats || activePlayer, [playerStats, activePlayer]);
  const isTeam = displayPlayer?.type === 'pair' || displayPlayer?.type === 'team'
  const members = displayPlayer?.members || []
  const previousSeasons = React.useMemo(() => displayPlayer?.previousSeasons || [], [displayPlayer]);
  const honors = React.useMemo(() => displayPlayer?.honors || [], [displayPlayer]);
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);

  const availableYears = React.useMemo(() => {
    if (!displayPlayer) return []
    return Array.from(new Set([
        currentYear.toString(),
        ...previousSeasons.map((s: any) => s.year.toString())
    ])).sort((a, b) => b.localeCompare(a));
  }, [currentYear, previousSeasons, displayPlayer]);
  
  const allTimeStats = React.useMemo(() => {
    if (!displayPlayer) return {} as any;
    const current = displayPlayer.stats || {};
    const previous = displayPlayer.previousSeasons || [];
    
    const allTime = {
      tournamentsPlayed: (current.tournamentsPlayed || 0) + previous.reduce((acc, s) => acc + (s.stats.tournamentsPlayed || 0), 0),
      matchesPlayed: (current.matchesPlayed || 0) + previous.reduce((acc, s) => acc + (s.stats.matchesPlayed || 0), 0),
      totalMatchesWon: (current.totalMatchesWon || 0) + previous.reduce((acc, s) => acc + (s.stats.totalMatchesWon || 0), 0),
      totalMatchesLost: (current.totalMatchesLost || 0) + previous.reduce((acc, s) => acc + (s.stats.totalMatchesLost || 0), 0),
      totalLegsWon: (current.totalLegsWon || current.legsWon || 0) + previous.reduce((acc, s) => acc + (s.stats.totalLegsWon || s.stats.legsWon || 0), 0),
      totalLegsLost: (current.totalLegsLost || current.legsLost || 0) + previous.reduce((acc, s) => acc + (s.stats.totalLegsLost || s.stats.legsLost || 0), 0),
      oneEightiesCount: (current.oneEightiesCount || current.total180s || 0) + previous.reduce((acc, s) => acc + (s.stats.oneEightiesCount || s.stats.total180s || 0), 0),
      highestCheckout: Math.max(current.highestCheckout || 0, ...previous.map(s => s.stats.highestCheckout || 0)),
      avg: current.avg || 0,
      firstNineAvg: current.firstNineAvg || 0,
      bestPosition: Math.min(current.bestPosition || 999, ...previous.map(s => s.stats.bestPosition || 999)),
      averagePosition: current.averagePosition || 0
    };
    
    let totalMatchesForAvg = (current.matchesPlayed || (current.totalMatchesWon || 0) + (current.totalMatchesLost || 0));
    let weightedAvgSum = (current.avg || 0) * totalMatchesForAvg;
    let weightedFirstNineAvgSum = (current.firstNineAvg || 0) * totalMatchesForAvg;
    
    let totalTournamentsForPos = (current.tournamentsPlayed || 0);
    let weightedPosSum = (current.averagePosition || 0) * totalTournamentsForPos;

    previous.forEach(s => {
        const m = s.stats.matchesPlayed || (s.stats.totalMatchesWon || 0) + (s.stats.totalMatchesLost || 0);
        if (m > 0) {
            weightedAvgSum += (s.stats.avg || 0) * m;
            weightedFirstNineAvgSum += (s.stats.firstNineAvg || 0) * m;
            totalMatchesForAvg += m;
        }

        const tCount = s.stats.tournamentsPlayed || (s.tournamentHistory?.length || 0);
        if (tCount > 0) {
            weightedPosSum += (s.stats.averagePosition || 0) * tCount;
            totalTournamentsForPos += tCount;
        }
    });

    if (totalMatchesForAvg > 0) allTime.avg = weightedAvgSum / totalMatchesForAvg;
    if (totalMatchesForAvg > 0) allTime.firstNineAvg = weightedFirstNineAvgSum / totalMatchesForAvg;
    if (totalTournamentsForPos > 0) allTime.averagePosition = weightedPosSum / totalTournamentsForPos;

    return allTime;
  }, [displayPlayer]);

  const { activeStats, activeHistory } = React.useMemo(() => {
    if (!displayPlayer) return { activeStats: {} as any, activeHistory: [] };
    
    let history = [];
    let stats = {};

    if (selectedSeason === 'all-time') {
        stats = allTimeStats;
        history = [
            ...(displayPlayer.tournamentHistory || []).map(t => ({...t, year: currentYear})),
            ...previousSeasons.flatMap((s: any) => (s.tournamentHistory || []).map((t: any) => ({
                ...t,
                tournamentName: t.tournamentName || (t as any).name,
                date: t.date || (t as any).startDate,
                year: s.year
            })))
        ].sort((a, b) => new Date(b.date || (b as any).startDate).getTime() - new Date(a.date || (a as any).startDate).getTime());
    } else if (selectedSeason === 'current') {
        stats = displayPlayer.stats || {};
        history = (displayPlayer.tournamentHistory || []).map(t => ({...t, year: currentYear}));
    } else {
        const yearNum = parseInt(selectedSeason);
        const seasonData = previousSeasons.find((s: any) => s.year === yearNum);
        stats = seasonData?.stats || {};
        history = (seasonData?.tournamentHistory || []).map((t: any) => ({
            ...t,
            tournamentName: t.tournamentName || (t as any).name,
            date: t.date || (t as any).startDate,
            year: yearNum
        })).reverse();
    }

    if (isOacContext) {
        history = history.filter((t: any) => t.verified || t.isVerified);
    }

    return { activeStats: stats, activeHistory: history };
  }, [selectedSeason, displayPlayer, allTimeStats, previousSeasons, currentYear, isOacContext]);

  if (!player || !displayPlayer) return null;

  const renderStatsContent = (stats: any, isCareer: boolean) => {
    const totalW = stats.totalMatchesWon || 0;
    const totalL = stats.totalMatchesLost || 0;
    const totalMatches = totalW + totalL;
    const winRate = totalMatches > 0 ? Math.round((totalW / totalMatches) * 100) : 0;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Main Stats Card (Bento Style) */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          <div className="relative group overflow-hidden rounded-2xl bg-card p-6 sm:p-8 shadow-2xl border-l-4 border-primary">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-foreground">
              <IconChartBar size={160} stroke={1.5} />
            </div>
            <div className="relative flex flex-col md:flex-row gap-8 items-center z-10">
              {/* Avatar with Glow */}
              <div className="relative shrink-0">
                <div className="absolute -inset-2 bg-gradient-to-tr from-primary to-accent rounded-full blur-xl opacity-40 group-hover:opacity-100 transition duration-700"></div>
                <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full border-4 border-background overflow-hidden bg-muted">
                  <SmartAvatar 
                    playerId={displayPlayer._id} 
                    name={displayPlayer.name} 
                    className="w-full h-full text-5xl"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full font-headline font-black text-xs sm:text-sm shadow-xl border-2 border-background">
                    {displayPlayer.stats?.mmr || 800} MMR
                </div>
              </div>

              {/* Identity & Primary Stats */}
              <div className="flex-grow text-center md:text-left">
                <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase text-foreground mb-1 line-clamp-2">
                  {displayPlayer.name}
                </h2>
                <div className="flex items-center justify-center md:justify-start gap-2 mb-6">
                  <CountryFlag countryCode={displayPlayer.country} className="text-xl shadow-sm" />
                  <p className="font-body text-sm text-muted-foreground uppercase tracking-widest font-bold">
                    {isTeam ? (displayPlayer.type === 'pair' ? tStats("pair") : tStats("team")) : t("player_profile") || "Player Profile"}
                  </p>
                </div>
                
                <div className="flex flex-wrap justify-center md:justify-start gap-8 sm:gap-12">
                  <div>
                    <div className="font-label text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground">Win Rate</div>
                    <div className="font-headline text-4xl sm:text-5xl font-black text-primary shadow-glow-primary-sm">{winRate}%</div>
                  </div>
                  <div className="border-l border-border/50 pl-8 sm:pl-12">
                    <div className="font-label text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground">Matches Won</div>
                    <div className="font-headline text-4xl sm:text-5xl font-black text-foreground">{totalW}</div>
                  </div>
                  <div className="border-l border-border/50 pl-8 sm:pl-12 hidden sm:block">
                    <div className="font-label text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground">Losses</div>
                    <div className="font-headline text-4xl sm:text-5xl font-black text-muted-foreground/50">{totalL}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Metrics - Glassmorphism Bento Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors">
              <IconTargetArrow className="text-primary mb-3 h-6 w-6" />
              <div className="font-label text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Average</div>
              <div className="font-headline text-2xl sm:text-3xl font-bold text-foreground truncate">{stats.avg ? stats.avg.toFixed(2) : "—"}</div>
            </div>
            <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors">
              <IconTrendingUp className="text-primary mb-3 h-6 w-6" />
              <div className="font-label text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">First 9 Avg</div>
              <div className="font-headline text-2xl sm:text-3xl font-bold text-foreground truncate">{stats.firstNineAvg ? stats.firstNineAvg.toFixed(2) : "—"}</div>
            </div>
            <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors">
              <IconMedal className="text-primary mb-3 h-6 w-6" />
              <div className="font-label text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Highest Out</div>
              <div className="font-headline text-2xl sm:text-3xl font-bold text-foreground truncate">{stats.highestCheckout || "—"}</div>
            </div>
            <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors">
              <IconTarget className="text-primary mb-3 h-6 w-6" />
              <div className="font-label text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Total 180s</div>
              <div className="font-headline text-2xl sm:text-3xl font-bold text-foreground truncate">{stats.oneEightiesCount ?? stats.total180s ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Sidebar Info / Achievements */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card rounded-2xl p-6 sm:p-8 border-t-4 border-accent shadow-xl border-border/50">
            <h3 className="font-headline text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground mb-6 flex items-center">
              <IconTrophy className="mr-2 text-accent" />
              {t("recent_honors") || "Honors & Info"}
            </h3>
            
            <ul className="space-y-5">
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 shrink-0 bg-muted rounded-lg flex items-center justify-center">
                  <IconChartBar className="text-accent h-5 w-5" />
                </div>
                <div>
                  <div className="font-label text-sm font-bold text-foreground">{stats.bestPosition === 999 ? "—" : `#${stats.bestPosition}`}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">{t("legjobb_helyezes_i1t1") || "Best Position"}</div>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 shrink-0 bg-muted rounded-lg flex items-center justify-center">
                  <IconChartBar className="text-primary h-5 w-5" />
                </div>
                <div>
                  <div className="font-label text-sm font-bold text-foreground">{stats.averagePosition ? `#${stats.averagePosition.toFixed(1)}` : "—"}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">{t("atlagos_helyezes_ctvu") || "Avg Position"}</div>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 shrink-0 bg-muted rounded-lg flex items-center justify-center">
                  <IconSword className="text-secondary h-5 w-5" />
                </div>
                <div>
                  <div className="font-label text-sm font-bold text-foreground">{stats.tournamentsPlayed ?? stats.totalTournaments ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">{isCareer ? tStats("total_tournaments") : tStats("season_tournaments")}</div>
                </div>
              </li>
            </ul>

            {honors.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground mb-4">Medals & Awards</h4>
                <div className="flex flex-wrap gap-2">
                  {honors.map((h, i) => (
                    <Badge key={i} variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] uppercase tracking-wider py-1 font-black">
                      <IconMedal className="w-3 h-3 mr-1" />
                      {h.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={Boolean(player)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-[1280px] w-[95vw] flex h-[90vh] flex-col overflow-hidden bg-background p-0 border-border shadow-glow-primary sm:rounded-3xl">
        <header className="relative flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 shrink-0 z-20 bg-background/95 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {navigationHistory.length > 0 && (
              <button 
                onClick={navigateBack}
                className="p-2 hover:bg-muted rounded-full transition-colors shrink-0 border border-border"
                title={t("vissza")}
              >
                <IconChevronDown size={24} className="rotate-90 text-primary" />
              </button>
            )}
            <div>
              <DialogTitle className="font-headline text-2xl md:text-3xl font-black tracking-tighter uppercase italic shadow-glow-primary-sm text-foreground">
                Player Statistics
              </DialogTitle>
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-primary mt-1 font-bold">
                Dart Arena Profile
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-muted px-4 py-2 rounded-lg border border-border flex items-center gap-3 w-full sm:w-auto">
                <IconCalendarStats size={16} className="text-muted-foreground" />
                <select 
                    value={selectedSeason} 
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold uppercase tracking-wider text-foreground focus:ring-0 cursor-pointer w-full pl-0 py-0"
                >
                    <option value="current">{t("jelenlegi_szezon") || "CURRENT SEASON"}</option>
                    <option value="all-time">{t("összesített") || "ALL TIME"}</option>
                    {availableYears.filter(y => y !== currentYear.toString()).map(year => (
                        <option key={year} value={year}>{year} {t("szezon") || "SEASON"}</option>
                    ))}
                </select>
             </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <IconLoader2 size={48} className="animate-spin text-primary/50" />
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">{t("adatok_szinkronizálása")}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 space-y-12 custom-scrollbar">
              
            {renderStatsContent(activeStats, selectedSeason === 'all-time')}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Matches */}
                <section className="space-y-6">
                    <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                      <IconSword className="text-primary h-6 w-6" />
                      {t("legutóbbi_meccsek") || "Recent Matches"}
                    </h3>
                    <div className="space-y-3">
                      {matchHistory.length > 0 ? matchHistory.map((match) => (
                          <div key={match._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/20 border border-border hover:border-border/80 rounded-xl transition-all gap-3">
                              <div className="flex items-center gap-4">
                                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold font-headline text-sm shadow-sm", match.won ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                    {match.won ? "W" : "L"}
                                  </div>
                                  <div>
                                    <span className="text-sm font-bold uppercase tracking-tight">{match.opponent}</span>
                                    <div className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5 flex items-center gap-1">
                                      <IconHistory size={10} />
                                      {new Date(match.date).toLocaleDateString('hu-HU', { month: 'short', day: '2-digit', year: 'numeric' })}
                                    </div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-6 sm:pl-4 sm:border-l border-border/50 self-end sm:self-auto w-full sm:w-auto justify-end sm:justify-start">
                                  <div className="text-center">
                                    <span className="block text-[9px] uppercase font-bold text-muted-foreground mb-0.5 tracking-widest">Score</span>
                                    <span className="text-lg font-black font-headline">{match.player1Score} - {match.player2Score}</span>
                                  </div>
                              </div>
                          </div>
                      )) : (
                          <div className="p-8 text-center border border-dashed border-border/50 rounded-xl bg-muted/10">
                            <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest">{t("nincs_meccs_adat") || "No match data"}</p>
                          </div>
                      )}
                    </div>
                </section>

                {/* Tournament History */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between gap-2">
                      <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                          <IconHistory className="text-primary h-6 w-6" />
                          {t("események") || "Event History"}
                      </h3>
                      <Badge variant="outline" className="text-[10px] font-bold tracking-widest uppercase bg-muted/50 border-border">
                        {activeHistory.length} {t("torna_13")}
                      </Badge>
                  </div>

                  <div className="space-y-3">
                  {activeHistory.length > 0 ? (
                      activeHistory.map((history, index) => {
                      const isOpen = expandedTournament === index
                      return (
                          <div
                          key={`${history.tournamentName}-${index}`}
                          className={cn(
                              "bg-muted/10 border border-border rounded-xl transition-all overflow-hidden",
                              isOpen && "border-primary/50 shadow-glow-primary-sm"
                          )}
                          >
                          <button
                              type="button"
                              onClick={() => setExpandedTournament(isOpen ? null : index)}
                              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                          >
                              <div className="space-y-1 pr-4 min-w-0">
                                  <p className="text-sm font-bold tracking-tight uppercase truncate">{history.tournamentName}</p>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-80 tracking-widest">
                                      {new Date(history.date).toLocaleDateString("hu-HU")} • Rank #{history.position}
                                  </p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                  {history.mmrChange !== undefined && (
                                      <span className={cn("text-xs font-black", history.mmrChange >= 0 ? "text-primary" : "text-destructive")}>
                                          {history.mmrChange >= 0 ? "+" : ""}{history.mmrChange}
                                      </span>
                                  )}
                                  {history.isVerified && history.oacMmrChange !== undefined && (
                                      <span className={cn("text-xs font-black flex items-center gap-1", history.oacMmrChange >= 0 ? "text-accent" : "text-destructive")}>
                                        <IconShieldCheck className="h-4 w-4" />
                                          {history.oacMmrChange >= 0 ? "+" : ""}{history.oacMmrChange}
                                      </span>
                                  )}
                                  <div className={cn("p-1 rounded-full bg-muted transition-transform", isOpen && "rotate-180 bg-primary/20 text-primary")}>
                                    <IconChevronDown className="h-4 w-4" />
                                  </div>
                              </div>
                          </button>
                          {isOpen && (
                              <div className="px-5 pb-5 bg-card">
                                  <div className="h-px bg-border my-2" />
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
                                      <div className="bg-muted/30 rounded-lg p-3 text-center border border-border/50">
                                        <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Matches</div>
                                        <div className="font-headline font-bold">{history.stats?.matchesWon || 0}W / {history.stats?.matchesLost || 0}L</div>
                                      </div>
                                      <div className="bg-muted/30 rounded-lg p-3 text-center border border-border/50">
                                        <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Total 180s</div>
                                        <div className="font-headline font-bold">{history.stats?.oneEightiesCount || 0}</div>
                                      </div>
                                      <div className="bg-muted/30 rounded-lg p-3 text-center border border-border/50">
                                        <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Highest Out</div>
                                        <div className="font-headline font-bold">{history.stats?.highestCheckout || '—'}</div>
                                      </div>
                                      <div className="bg-muted/30 rounded-lg p-3 text-center border border-border/50">
                                        <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Average</div>
                                        <div className="font-headline font-bold text-primary">{history.stats?.average?.toFixed(2) || '—'}</div>
                                      </div>
                                  </div>
                                  <div className="mt-2 flex justify-end">
                                       {history.tournamentId && (
                                           <Link href={`/tournaments/${history.tournamentId}`}>
                                             <Button variant="outline" size="sm" className="text-[10px] uppercase font-bold tracking-widest">
                                               {t("megtekintés") || "View Details"}
                                             </Button>
                                           </Link>
                                       )}
                                  </div>
                              </div>
                          )}
                          </div>
                      )
                      })
                  ) : (
                      <div className="p-8 text-center border border-dashed border-border/50 rounded-xl bg-muted/10">
                        <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest">{t("nincsenek_eredmények") || "No tournament history"}</p>
                      </div>
                  )}
                  </div>
                </section>
            </div>

            {/* Teams / Members Grid */}
            <div className="pt-6 border-t border-border">
                {isTeam && members.length > 0 && (
                  <section className="space-y-6">
                    <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                      <IconUsers className="text-accent h-6 w-6" />
                      {t("tagok_statisztikái") || "Team Members"}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {members.map((member: any) => (
                        <div key={member._id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-glow-primary-sm transition-all group flex items-center justify-between">
                            <div className="flex items-center gap-4 min-w-0 pr-4">
                              <SmartAvatar 
                                playerId={member._id} 
                                name={member.name} 
                                size="lg"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-bold uppercase truncate">{member.name}</p>
                                  <CountryFlag countryCode={member.country} className="shrink-0" />
                                </div>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                  {member.stats?.mmr || 800} {t("mmr")}</p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="shrink-0 bg-muted/50 group-hover:bg-primary group-hover:text-primary-foreground rounded-full h-10 w-10 transition-colors"
                              onClick={() => navigateToPlayer(member)}
                            >
                              <IconTargetArrow className="h-5 w-5" />
                            </Button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* My Teams (for individuals) */}
                {!isTeam && teams.length > 0 && (
                  <section className="space-y-6">
                    <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                      <IconUsers className="text-accent h-6 w-6" />
                      {t("párosaim_csapataim") || "My Teams & Pairs"}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {teams.map((team: any) => (
                        <div key={team._id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-glow-primary-sm transition-all group flex items-center justify-between cursor-pointer" onClick={() => navigateToPlayer(team)}>
                            <div className="flex items-center gap-4 min-w-0 pr-4">
                              <SmartAvatar 
                                playerId={team._id} 
                                name={team.name} 
                                size="lg"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-bold uppercase truncate">{team.name}</p>
                                  <CountryFlag countryCode={team.country} className="shrink-0" />
                                </div>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                  {team.type === 'pair' ? tStats("pair") : tStats("team")} • {team.stats?.mmr || 800} {t("mmr")}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 bg-muted/50 group-hover:bg-primary group-hover:text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center transition-colors">
                              <IconChevronDown className="h-4 w-4 -rotate-90" />
                            </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default PlayerStatsModal