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
} from "@tabler/icons-react"
import axios from "axios"

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
  const [activePlayer, setActivePlayer] = React.useState<Player | null>(player)
  const [navigationHistory, setNavigationHistory] = React.useState<Player[]>([])
  const [playerStats, setPlayerStats] = React.useState<Player | null>(null)
  const [matchHistory, setMatchHistory] = React.useState<any[]>([])
  const [teams, setTeams] = React.useState<Player[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [expandedTournament, setExpandedTournament] = React.useState<number | null>(null)
  const [selectedSeason, setSelectedSeason] = React.useState<string>('current')

  // Reset local state when the prop player changes
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
        const response = await axios.get(`/api/players/${activePlayer._id}/stats`)
        setPlayerStats(response.data.player)
        setMatchHistory(response.data.matchHistory || [])
        setTeams(response.data.teams || [])
        if (response.data.player.tournamentHistory && response.data.player.tournamentHistory.length > 0) {
          setExpandedTournament(0)
        }
      } catch (error: any) {
        console.error('Failed to fetch player stats:', error)
        showErrorToast(t("nem_sikerült_betölteni_76"), {
          error: error?.response?.data?.error,
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
  
  // Calculate All Time Stats
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
    
    // Weighted Average Calculation
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

  // Determine active data
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

    // OAC Filter logic
    if (isOacContext) {
        history = history.filter((t: any) => t.verified || t.isVerified);
    }

    return { activeStats: stats, activeHistory: history };
  }, [selectedSeason, displayPlayer, allTimeStats, previousSeasons, currentYear, isOacContext]);

  if (!player || !displayPlayer) return null;

  const renderStatsContent = (stats: any, isCareer: boolean) => {
    const highlightCards = [
      {
        label: isCareer ? "Összes torna" : "Szezon tornák",
        value: stats.tournamentsPlayed ?? stats.totalTournaments ?? 0,
        icon: IconTrophy,
        variant: "amber"
      },
      {
        label: t("legjobb_helyezes_i1t1"),
        value: stats.bestPosition === 999 ? "—" : `#${stats.bestPosition}`,
        icon: IconMedal,
        variant: "blue"
      },
      {
        label: t("atlagos_helyezes_ctvu"),
        value: stats.averagePosition ? `#${stats.averagePosition.toFixed(1)}` : "—",
        icon: IconChartBar,
        variant: "emerald"
      },
      {
        label: t("gyozelmi_arany_vqqj"),
        value:
          stats.totalMatchesWon || stats.totalMatchesLost
            ? `${Math.round(((stats.totalMatchesWon ?? 0) / ((stats.totalMatchesWon ?? 0) + (stats.totalMatchesLost ?? 0))) * 100)}%`
            : "—",
        icon: IconTrendingUp,
        variant: "primary"
      },
    ];

    return (
      <div className="space-y-6">
          <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {highlightCards.map(({ label, value, icon: Icon, variant }) => (
                <StatCard 
                  key={label}
                  label={label}
                  value={value}
                  icon={<Icon size={14} />}
                  variant={variant as any}
                />
              ))}
          </section>

          <Card className="bg-card border-muted/20 shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <IconCalendarStats size={16} className="text-primary" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t("részletes_mutatók")}</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <MiniStatBox label={t("meccsek")} value={`${stats.totalMatchesWon || 0}W / ${stats.totalMatchesLost || 0}L`} />
                <MiniStatBox label={t("legek")} value={`${stats.totalLegsWon || stats.legsWon || 0}W / ${stats.totalLegsLost || stats.legsLost || 0}L`} />
                <MiniStatBox label={t("as_dobások")} value={stats.oneEightiesCount ?? stats.total180s ?? 0} />
                <MiniStatBox label={t("max_kiszálló")} value={stats.highestCheckout || "—"} />
                <MiniStatBox label={t("dobás_átlag")} value={stats.avg ? stats.avg.toFixed(1) : "—"} />
                <MiniStatBox label="First 9 Avg" value={typeof stats.firstNineAvg === "number" ? stats.firstNineAvg.toFixed(1) : "—"} />
              </div>
            </CardContent>
          </Card>
      </div>
    );
  };

  return (
    <Dialog open={Boolean(player)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent
        className="flex h-[90vh] max-w-4xl flex-col overflow-hidden bg-background p-0 shadow-2xl border-muted/20 sm:rounded-2xl"
      >
        <header className="relative flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between border-b border-muted/10">
          <div className="flex items-center gap-4">
            <SmartAvatar 
              playerId={displayPlayer._id} 
              name={displayPlayer.name} 
              size="xl"
            />
            <div className="space-y-3">
              <DialogHeader className="p-0 text-left">
                <div className="flex items-center gap-2">
                  {navigationHistory.length > 0 && (
                    <button 
                      onClick={navigateBack}
                      className="p-1 hover:bg-muted/50 rounded-full transition-colors -ml-1"
                      title={t("vissza")}
                    >
                      <IconChevronDown size={24} className="rotate-90 text-primary" />
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-3xl font-black text-foreground tracking-tighter uppercase">{displayPlayer.name}</DialogTitle>
                    <CountryFlag countryCode={displayPlayer.country} className="text-xl" />
                  </div>
                </div>
              </DialogHeader>
              <div className="flex flex-wrap gap-2">
                {isTeam && (
                  <Badge className="text-[10px] font-black h-5 px-2 bg-indigo-500/10 text-indigo-600 border-indigo-500/20 uppercase tracking-tighter gap-1">
                    <IconSword size={10} />
                    {displayPlayer.type === 'pair' ? 'Páros' : 'Csapat'}
                  </Badge>
                )}
                {honors.map((h, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="min-w-0 max-w-full gap-1 overflow-hidden bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-amber-600 border-amber-500/20 h-auto"
                  >
                    <IconMedal size={10} />
                    <span className="truncate max-w-[120px] sm:max-w-[180px]">{h.title}</span>
                  </Badge>
                ))}
                {!honors.length && (
                  <Badge variant="outline" className="text-[9px] font-bold h-5 px-2 uppercase tracking-widest opacity-40">{t("kihívó")}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline" className="rounded-lg border-primary/20 bg-primary/5 px-4 py-2 text-base font-black text-primary gap-2 shadow-sm">
              <IconTarget size={18} />
              {displayPlayer.stats?.mmr || 800} {t("mmr")}</Badge>
            {displayPlayer.stats.oacMmr !== 800 && (
              <Badge variant="outline" className="rounded-lg border-blue-500/20 bg-blue-500/5 px-4 py-2 text-base font-black text-blue-500 gap-2 shadow-sm">
                <IconTarget size={18} />
                {displayPlayer.stats.oacMmr} {t("oac_mmr")}</Badge>
            )}
          </div>
        </header>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <IconLoader2 size={48} className="animate-spin text-primary/50" />
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">{t("adatok_szinkronizálása")}</p>
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto px-6 pb-8 pt-6 space-y-8 custom-scrollbar">
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t("statisztikai_időszak")}</h3>
                    <select 
                        value={selectedSeason} 
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        className=""
                    >
                        <option value="current">{t("jelenlegi_szezon")}</option>
                        <option value="all-time">{t("összesített")}</option>
                        {availableYears.filter(y => y !== currentYear.toString()).map(year => (
                            <option key={year} value={year}>{year} {t("szezon")}</option>
                        ))}
                    </select>
                </div>
                
                {renderStatsContent(activeStats, selectedSeason === 'all-time')}
            </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Recent Matches */}
              <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                    <IconSword size={14} className="text-primary" />
                    {t("legutóbbi_meccsek")}</h3>
                  <div className="space-y-2">
                    {matchHistory.length > 0 ? matchHistory.map((match) => (
                        <div key={match._id} className="flex items-center justify-between p-3 bg-card border border-muted/10 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className={cn("w-1.5 h-1.5 rounded-full", match.won ? "bg-emerald-500" : "bg-rose-500")} />
                                <span className="text-xs font-bold truncate max-w-[100px]">{match.opponent}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black font-mono">{match.player1Score} - {match.player2Score}</span>
                                <span className="text-[9px] text-muted-foreground opacity-50">{new Date(match.date).toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' })}</span>
                            </div>
                        </div>
                    )) : (
                        <div className="p-8 text-center border border-dashed border-muted/20 rounded-lg text-[10px] uppercase font-bold text-muted-foreground/30">{t("nincs_meccs_adat")}</div>
                    )}
                  </div>
              </section>

              {/* Tournament History */}
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                        <IconHistory size={14} className="text-primary" />
                        {t("események")}</h3>
                    <span className="text-[9px] font-bold text-muted-foreground/40">{activeHistory.length} {t("torna_13")}</span>
                </div>

                <div className="space-y-3">
                {activeHistory.length > 0 ? (
                    activeHistory.map((history, index) => {
                    const isOpen = expandedTournament === index
                    return (
                        <div
                        key={`${history.tournamentName}-${index}`}
                        className={cn(
                            "bg-card border border-muted/10 rounded-xl transition-all",
                            isOpen && "border-primary/20 bg-muted/5 shadow-sm"
                        )}
                        >
                        <button
                            type="button"
                            onClick={() => setExpandedTournament(isOpen ? null : index)}
                            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                        >
                            <div className="space-y-1">
                                <p className="text-xs font-bold tracking-tight">{history.tournamentName}</p>
                                <p className="text-[9px] font-medium text-muted-foreground uppercase opacity-60">
                                    {new Date(history.date).toLocaleDateString("hu-HU")} • #{history.position}.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {history.mmrChange !== undefined && (
                                    <span className={cn("text-[10px] font-black", history.mmrChange >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                        {history.mmrChange >= 0 ? "+" : ""}{history.mmrChange}
                                    </span>
                                )}
                                {history.isVerified && history.oacMmrChange && (
                                    <span className={cn("text-[10px] font-black flex items-center gap-1", history.oacMmrChange >= 0 ? "text-blue-300" : "text-red-300")}>
                                      <IconShieldCheck className={cn("h-4 w-4", history.oacMmrChange >= 0 ? "text-blue-300" : "text-red-300")} />
                                        {history.oacMmrChange >= 0 ? "+" : ""}{history.oacMmrChange}
                                    </span>
                                )}
                                <IconChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen ? "rotate-180 text-primary" : "")} />
                            </div>
                        </button>
                        {isOpen && (
                            <div className="px-4 pb-4">
                                <div className="h-px bg-muted/5 mb-3" />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <MiniRowStat label={t("meccsek")} value={`${history.stats?.matchesWon || 0}W / ${history.stats?.matchesLost || 0}L`} />
                                    <MiniRowStat label="180-ak" value={history.stats?.oneEightiesCount || 0} />
                                    <MiniRowStat label={t("kiszálló_62")} value={history.stats?.highestCheckout || '—'} />
                                    <MiniRowStat label={t("átlag_39")} value={history.stats?.average?.toFixed(1) || '—'} />
                                </div>
                                <div className="mt-3 flex justify-between items-center text-[9px] font-black">
                                     <span className="text-muted-foreground opacity-40 uppercase">{t("esemény_rögzítve")}</span>
                                     {history.tournamentId && (
                                         <Link href={`/tournaments/${history.tournamentId}`} className="text-primary hover:underline">{t("megtekintés")}</Link>
                                     )}
                                </div>
                            </div>
                        )}
                        </div>
                    )
                    })
                ) : (
                    <div className="p-8 text-center border border-dashed border-muted/20 rounded-lg text-[10px] uppercase font-bold text-muted-foreground/30">{t("nincsenek_eredmények")}</div>
                )}
                </div>
              </section>

              {/* Duo/Team Members */}
              {isTeam && members.length > 0 && (
                <section className="space-y-4 md:col-span-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2 border-t border-muted/10 pt-6">
                    <IconUsers size={14} className="text-primary" />
                    {t("tagok_statisztikái")}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {members.map((member: any) => (
                      <Card key={member._id} className="bg-card border-muted/10 hover:border-primary/30 transition-all group">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <SmartAvatar 
                              playerId={member._id} 
                              name={member.name} 
                              size="md"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold">{member.name}</p>
                                <CountryFlag countryCode={member.country} />
                              </div>
                              <p className="text-[10px] text-muted-foreground uppercase font-black opacity-50 tracking-wider">
                                {member.stats?.mmr || 800} {t("mmr")}</p>
                            </div>
                          </div>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="bg-primary/10 text-primary hover:bg-primary hover:text-white border-0"
                            onClick={() => navigateToPlayer(member)}
                          >
                            {t("megtekintés_87")}</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* My Teams (for individuals) */}
              {!isTeam && teams.length > 0 && (
                <section className="space-y-4 md:col-span-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2 border-t border-muted/10 pt-6">
                    <IconUsers size={14} className="text-primary" />
                    {t("párosaim_csapataim")}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {teams.map((team: any) => (
                      <Card 
                        key={team._id} 
                        className="bg-card border-muted/10 hover:border-primary/30 transition-all group cursor-pointer"
                        onClick={() => navigateToPlayer(team)}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <SmartAvatar 
                              playerId={team._id} 
                              name={team.name} 
                              size="md"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold">{team.name}</p>
                                <CountryFlag countryCode={team.country} />
                              </div>
                              <p className="text-[10px] text-muted-foreground uppercase font-black opacity-50 tracking-wider">
                                {team.type === 'pair' ? 'Páros' : 'Csapat'} • {team.stats?.mmr || 800} {t("mmr")}</p>
                            </div>
                          </div>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white border-0 transition-all"
                          >
                            {t("megtekintés_98")}</Button>
                        </CardContent>
                      </Card>
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

function StatCard({ label, value, icon, variant }: { label: string, value: string | number, icon: React.ReactNode, variant: 'primary' | 'blue' | 'amber' | 'emerald' }) {
    const variants = {
        primary: "border-primary/20 bg-primary/5 text-primary",
        blue: "border-blue-500/20 bg-blue-500/5 text-blue-600",
        amber: "border-amber-500/20 bg-amber-500/5 text-amber-600",
        emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600",
    }
    
    return (
        <div className={cn("p-4 rounded-xl border transition-all", variants[variant])}>
            <div className="flex items-center justify-between mb-2 opacity-70">
                <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                {icon}
            </div>
            <div className="text-xl font-black tracking-tighter">{value}</div>
        </div>
    )
}

function MiniStatBox({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="bg-background border border-muted/10 p-3 rounded-lg flex flex-col gap-1">
            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-50">{label}</span>
            <span className="text-sm font-black text-foreground">{value}</span>
        </div>
    )
}

function MiniRowStat({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="flex flex-col items-center justify-center bg-background/50 p-2 rounded-md gap-0.5 border border-muted/5">
            <span className="text-[7px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">{label}</span>
            <span className="text-[10px] font-black tracking-tight">{value}</span>
        </div>
    )
}

export default PlayerStatsModal