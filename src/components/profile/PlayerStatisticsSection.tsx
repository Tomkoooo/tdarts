"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconTrophy,
  IconTarget,
  IconTrendingUp,
  IconCalendar,
  IconSword,
  IconChartBar,
  IconHistory,
  IconMedal,
  IconUsers,
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import { SmartAvatar } from "@/components/ui/smart-avatar"
import PlayerStatsModal from "@/components/player/PlayerStatsModal"
import { Player } from "@/interface/player.interface"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts"
import { TournamentHistory, PlayerHonor } from "@/interface/player.interface"

interface PlayerStatsData {
  hasPlayer: boolean
  player: {
    _id: string
    name: string
    stats: {
        mmr: number
        oacMmr: number
        totalMatchesWon: number
        totalMatchesLost: number
        totalLegsWon: number
        totalLegsLost: number
        averagePosition: number
        bestPosition: number
        highestCheckout: number
        avg: number
        total180s: number
        matchesPlayed?: number
        tournamentsPlayed?: number
    }
    mmrTier: {
        name: string
        color: string
    }
    globalRank: number
    previousSeasons: any[]
    tournamentHistory: TournamentHistory[]
    honors: PlayerHonor[]
  }
  tournamentHistory: any[]
  matchHistory: any[]
  teams?: any[]
  summary: {
    totalTournaments: number
    winRate: number
    legWinRate: number
    wins: number
    losses: number
    totalLegsWon: number
    totalLegsLost: number
    avg?: number
  }
}

interface PlayerStatisticsSectionProps {
  playerStats: PlayerStatsData
  isLoading: boolean
  onViewLegs: (match: any) => void
}

export function PlayerStatisticsSection({
  playerStats: initialPlayerStats,
  isLoading,
  onViewLegs,
}: PlayerStatisticsSectionProps) {
  const [selectedSeason, setSelectedSeason] = React.useState<string>('current');
  const [selectedTeam, setSelectedTeam] = React.useState<Player | null>(null);

  // Move all hooks to the top
  const playerStats = React.useMemo(() => initialPlayerStats || { hasPlayer: false } as any, [initialPlayerStats]);
  
  const previousSeasons = React.useMemo(() => playerStats?.player?.previousSeasons || [], [playerStats]);
  console.log(playerStats)
  const honors = React.useMemo(() => playerStats?.player?.honors || [], [playerStats]);
  console.log(honors)
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);
  
  const availableYears = React.useMemo(() => {
    return Array.from(new Set([
      currentYear.toString(),
      ...previousSeasons.map((s: any) => s.year.toString())
    ])).sort((a, b) => b.localeCompare(a));
  }, [currentYear, previousSeasons]);

  const mmrHistory = React.useMemo(() => {
    if (!playerStats?.player) return [];
    const history: any[] = [];
    
    // 1. Process previous seasons
    [...previousSeasons].sort((a: any, b: any) => a.year - b.year).forEach((season: any) => {
        let seasonMmr = 800;
        history.push({
            display: `${season.year} Start`,
            mmr: 800,
            year: season.year,
            fullDate: `${season.year}.01.01.`
        });

        const seasonalTournaments: TournamentHistory[] = season.tournamentHistory || [];
        seasonalTournaments.forEach((t) => {
            seasonMmr += (t.mmrChange || 0);
            history.push({
                display: t.tournamentName || (t as any).name,
                mmr: seasonMmr,
                year: season.year,
                fullDate: new Date(t.date || (t as any).startDate).toLocaleDateString('hu-HU'),
                change: t.mmrChange
            });
        });
    });

    // 2. Process current season
    let currentSeasonMmr = 800;
    history.push({
        display: `${currentYear} Start`,
        mmr: 800,
        year: currentYear,
        fullDate: `${currentYear}.01.01.`
    });

    (playerStats.tournamentHistory || []).forEach((t) => {
        currentSeasonMmr += (t.mmrChange || 0);
        history.push({
            display: t.name || t.tournamentName,
            mmr: currentSeasonMmr,
            year: currentYear,
            fullDate: new Date(t.startDate || t.date).toLocaleDateString('hu-HU'),
            change: t.mmrChange
        });
    });

    return history;
  }, [playerStats, currentYear, previousSeasons]);

  const allTimeSummary = React.useMemo(() => {
    if (!playerStats?.player) return { totalTournaments: 0, wins: 0, losses: 0, totalLegsWon: 0, totalLegsLost: 0, winRate: 0, legWinRate: 0 };
    const current = playerStats.player.stats || {};
    const previous = playerStats.player.previousSeasons || [];
    
    let totalTournaments = (playerStats.player.tournamentHistory?.length || 0);
    previous.forEach((s: any) => {
        totalTournaments += (s.tournamentHistory?.length || 0);
    });

    const summary = {
        totalTournaments,
        wins: (current.totalMatchesWon || 0) + previous.reduce((acc, s) => acc + (s.stats.totalMatchesWon || 0), 0),
        losses: (current.totalMatchesLost || 0) + previous.reduce((acc, s) => acc + (s.stats.totalMatchesLost || 0), 0),
        totalLegsWon: (current.totalLegsWon || 0) + previous.reduce((acc, s) => acc + (s.stats.totalLegsWon || 0), 0),
        totalLegsLost: (current.totalLegsLost || 0) + previous.reduce((acc, s) => acc + (s.stats.totalLegsLost || 0), 0),
    };

    return {
        ...summary,
        winRate: (summary.wins + summary.losses) > 0 ? Math.round((summary.wins / (summary.wins + summary.losses)) * 100) : 0,
        legWinRate: (summary.totalLegsWon + summary.totalLegsLost) > 0 ? Math.round((summary.totalLegsWon / (summary.totalLegsWon + summary.totalLegsLost)) * 100) : 0,
    };
  }, [playerStats]);

  // Aggregate stats for "All-Time" detailed stats
  const allTimeDetailedStats = React.useMemo(() => {
    if (!playerStats?.player) return { avg: 0, total180s: 0, bestPosition: 999, highestCheckout: 0, averagePosition: 0 };
    const current = playerStats.player.stats || {};
    const previous = playerStats.player.previousSeasons || [];
    
    // Calculate Weighted Career Average
    const currentMatches = (current.matchesPlayed || (current.totalMatchesWon || 0) + (current.totalMatchesLost || 0));
    let totalMatchesForAvg = 0;
    let weightedAvgSum = 0;
    
    if (currentMatches > 0) {
        weightedAvgSum += (current.avg || 0) * currentMatches;
        totalMatchesForAvg += currentMatches;
    }

    previous.forEach((s: any) => {
        const m = s.stats.matchesPlayed || (s.stats.totalMatchesWon || 0) + (s.stats.totalMatchesLost || 0);
        if (m > 0) {
            weightedAvgSum += (s.stats.avg || 0) * m;
            totalMatchesForAvg += m;
        }
    });

    // Calculate Weighted Average Position
    const currentTournaments = current.tournamentsPlayed || (playerStats.player.tournamentHistory?.length || 0);
    let totalTournamentsForPos = 0;
    let weightedPosSum = 0;

    if (currentTournaments > 0) {
        weightedPosSum += (current.averagePosition || 0) * currentTournaments;
        totalTournamentsForPos += currentTournaments;
    }

    previous.forEach((s: any) => {
        const tCount = s.stats.tournamentsPlayed || s.tournamentHistory?.length || 0;
        if (tCount > 0) {
            weightedPosSum += (s.stats.averagePosition || 0) * tCount;
            totalTournamentsForPos += tCount;
        }
    });
    
    return {
        avg: totalMatchesForAvg > 0 ? Number((weightedAvgSum / totalMatchesForAvg).toFixed(2)) : (current.avg || 0),
        total180s: (current.total180s || 0) + previous.reduce((acc, s) => acc + (s.stats.total180s || 0), 0),
        bestPosition: Math.min(current.bestPosition || 999, ...previous.map((s: any) => s.stats.bestPosition || 999)),
        highestCheckout: Math.max(current.highestCheckout || 0, ...previous.map((s: any) => s.stats.highestCheckout || 0)),
        averagePosition: totalTournamentsForPos > 0 ? Number((weightedPosSum / totalTournamentsForPos).toFixed(2)) : (current.averagePosition || 0),
    };
  }, [playerStats]);

  const { activeStats, activeHistory, activeSummary, activeMmrHistory } = React.useMemo(() => {
    if (!playerStats?.player) return { activeStats: {} as any, activeHistory: [], activeSummary: {} as any, activeMmrHistory: [] };
    
    if (selectedSeason === 'all-time') {
      return {
          activeStats: allTimeDetailedStats,
          activeSummary: allTimeSummary,
          activeHistory: [
              ...(playerStats.tournamentHistory || []).map((t: any) => ({...t, year: currentYear})),
              ...previousSeasons.flatMap((s: any) => (s.tournamentHistory || []).map((t: any) => ({
                  ...t,
                  tournamentName: t.tournamentName || t.name,
                  date: t.date || t.startDate,
                  year: s.year
              })))
          ].sort((a, b) => new Date(b.date || b.startDate).getTime() - new Date(a.date || a.startDate).getTime()),
          activeMmrHistory: mmrHistory
      };
    } else if (selectedSeason === 'current' || selectedSeason === currentYear.toString()) {
      return {
          activeStats: playerStats.player.stats,
          activeSummary: playerStats.summary,
          activeHistory: [...(playerStats.tournamentHistory || [])].reverse(),
          activeMmrHistory: mmrHistory.filter(h => h.year === currentYear)
      };
    } else {
      const yearNum = parseInt(selectedSeason);
      const seasonData = previousSeasons.find((s: any) => s.year === yearNum);
      const stats = seasonData?.stats || {};
      const summary = {
          totalTournaments: seasonData?.tournamentHistory?.length || 0,
          wins: stats.totalMatchesWon || 0,
          losses: stats.totalMatchesLost || 0,
          winRate: (stats.totalMatchesWon + stats.totalMatchesLost) > 0 ? Math.round((stats.totalMatchesWon / (stats.totalMatchesWon + stats.totalMatchesLost)) * 100) : 0,
          totalLegsWon: stats.totalLegsWon || 0,
          totalLegsLost: stats.totalLegsLost || 0,
          legWinRate: (stats.totalLegsWon + stats.totalLegsLost) > 0 ? Math.round((stats.totalLegsWon / (stats.totalLegsWon + stats.totalLegsLost)) * 100) : 0,
      };
      return {
          activeStats: stats,
          activeHistory: (seasonData?.tournamentHistory || []).map((t: any) => ({
              ...t,
              tournamentName: t.tournamentName || t.name,
              date: t.date || t.startDate,
              year: yearNum
          })).reverse(),
          activeMmrHistory: mmrHistory.filter(h => h.year === yearNum),
          activeSummary: summary
      };
    }
  }, [selectedSeason, playerStats, mmrHistory, allTimeDetailedStats, allTimeSummary, currentYear, previousSeasons]);

  const activeRecentFormData = React.useMemo(() => {
    return activeHistory.slice(0, 10).map((t: any) => ({
        name: t.tournamentName || t.name || 'Unknown',
        avg: (t.stats?.average || t.average || 0),
        oneEighties: (t.stats?.oneEightiesCount || t.oneEightiesCount || 0),
        date: new Date(t.date || t.startDate).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
    })).reverse();
  }, [activeHistory]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 pb-7">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-[160px]" />
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Early returns move AFTER hooks
  if (!playerStats?.hasPlayer) {
    return null;
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 pb-7 px-0">
        <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            <IconTrophy className="w-6 h-6 text-primary" />
            Játékos statisztikák
            </CardTitle>
            <div className="flex flex-wrap gap-2 pt-1">
                {honors.map((honor, i) => (
                    <Badge key={i} variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-black uppercase tracking-tighter gap-1">
                        <IconMedal size={10} />
                        {honor.title}
                    </Badge>
                ))}
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Időszak:</span>
            <select 
                value={selectedSeason} 
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="h-9 w-[160px] rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-primary focus:outline-none"
            >
                <option value="current">Jelenlegi Szezon</option>
                <option value="all-time">Összesített</option>
                <optgroup label="Korábbi évek">
                    {availableYears.filter(y => y !== currentYear.toString()).map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </optgroup>
            </select>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-8 px-0">
        {/* Summary Stats - Flatter Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={cn("p-5 rounded-xl border transition-all hover:bg-opacity-10", "border-primary/20 bg-primary/5 text-primary")}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                {selectedSeason === 'current' || selectedSeason === 'all-time' ? 'Aktuális MMR' : 'Szezon végi MMR'}
              </span>
              <div className="opacity-50"><IconTarget className="w-4 h-4" /></div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-black text-primary ">
                  {selectedSeason === 'current' || selectedSeason === 'all-time' ? playerStats.player.stats.mmr : (activeStats.mmr || 800)}
                </div>
                <span className="text-[10px] font-bold uppercase opacity-60">MMR</span>
              </div>
              {((selectedSeason === 'current' || selectedSeason === 'all-time') && playerStats.player.stats.oacMmr !== 800) && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="text-lg font-black text-primary">
                    {playerStats.player.stats.oacMmr}
                  </div>
                  <span className="text-[9px] font-bold uppercase text-primary/70">OAC MMR</span>
                </div>
              )}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-tighter mt-1 opacity-60">
              {selectedSeason === 'current' || selectedSeason === 'all-time' ? playerStats.player.mmrTier.name : 'Archivált'}
            </div>
          </div>
          <StatCard 
            label={selectedSeason === 'current' || selectedSeason === 'all-time' ? 'Rangsor' : 'Végezte'}
            value={selectedSeason === 'current' || selectedSeason === 'all-time' ? `#${playerStats.player.globalRank || '—'}` : '—'}
            subtext="Globális lista"
            icon={<IconTrendingUp className="w-4 h-4" />}
            variant="blue"
          />
          <StatCard 
            label="Tornák"
            value={activeSummary.totalTournaments}
            subtext={selectedSeason === 'all-time' ? 'Pályafutás' : 'Időszak'}
            icon={<IconCalendar className="w-4 h-4" />}
            variant="amber"
          />
          <StatCard 
            label="Győzelmi ráta"
            value={`${activeSummary.winRate}%`}
            subtext={`${activeSummary.wins} Győzelem`}
            icon={<IconSword className="w-4 h-4" />}
            variant="emerald"
          />
        </div>

        {/* GRAPHS SECTION - Flatter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-muted/20 shadow-sm">
                <CardHeader className="py-4 border-b border-muted/10">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                        Forma (Átlag)
                        <IconChartBar size={14} className="text-blue-500" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[240px] pt-6">
                    {activeRecentFormData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activeRecentFormData}>
                                <defs>
                                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis domain={['auto', 'auto']} fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="avg" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2}
                                    fill="url(#colorAvg)" 
                                    animationDuration={1000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30">
                            <span className="text-xs font-bold uppercase tracking-widest">Nincs adat</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-card border-muted/20 shadow-sm">
                <CardHeader className="py-4 border-b border-muted/10">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                        MMR Alakulás
                        <IconTarget size={14} className="text-emerald-500" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[240px] pt-6">
                    {activeMmrHistory.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={activeMmrHistory}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis dataKey="fullDate" hide />
                                <YAxis domain={['auto', 'auto']} fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(value: any, name: any, props: any) => {
                                        const data = props.payload;
                                        return [
                                            <div key="mmr-tip" className="space-y-1">
                                                <div className="font-bold">{value} MMR</div>
                                                <div className="text-[10px] text-muted-foreground">{data.display}</div>
                                                {data.change !== undefined && (
                                                    <div className={cn("text-[10px] font-bold", data.change >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                        {data.change >= 0 ? "+" : ""}{data.change} MMR
                                                    </div>
                                                )}
                                            </div>,
                                            null
                                        ];
                                    }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="mmr" 
                                    stroke="#10b981" 
                                    strokeWidth={2} 
                                    dot={activeMmrHistory.length < 30}
                                    activeDot={{ r: 4, strokeWidth: 0 }} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30">
                            <span className="text-xs font-bold uppercase tracking-widest">Nincs MMR történet</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Stats and Tournament History Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <IconChartBar size={16} className="text-primary" />
              Szezonális Mutatók
            </h3>
            <div className="bg-card border border-muted/20 rounded-xl overflow-hidden divide-y divide-muted/10">
                <SimpleStatRow label="Átlag" value={activeStats.avg?.toFixed(1) || '—'} />
                <SimpleStatRow label="180-as Dobások" value={activeStats.total180s || activeStats.oneEightiesCount || 0} />
                <SimpleStatRow label="Legjobb Helyezés" value={activeStats.bestPosition !== 999 ? `#${activeStats.bestPosition}` : '—'} />
                <SimpleStatRow label="Átlagos Helyezés" value={activeStats.averagePosition ? `#${activeStats.averagePosition.toFixed(1)}` : '—'} />
                <SimpleStatRow label="Max Kiszálló" value={activeStats.highestCheckout || '—'} />
            </div>

            {/* Recent Matches Restoration */}
            {playerStats.matchHistory && playerStats.matchHistory.length > 0 && (
                <>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 pt-4">
                        <IconSword size={16} className="text-primary" />
                        Legutóbbi Meccsek
                    </h3>
                    <div className="space-y-2">
                        {playerStats.matchHistory.map((match: any) => (
                            <div key={match._id} className="flex items-center justify-between p-3 bg-card border border-muted/10 rounded-lg hover:border-primary/20 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", match.won ? "bg-emerald-500" : "bg-rose-500")} />
                                    <span className="text-xs font-bold truncate max-w-[120px]">{match.opponent}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-black font-mono">{match.player1Score} - {match.player2Score}</span>
                                    <span className="text-[10px] text-muted-foreground opacity-60">{new Date(match.date).toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' })}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onViewLegs(match)}>
                                        <IconHistory size={14} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* My Teams Section */}
            {playerStats.teams && playerStats.teams.length > 0 && (
                <>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 pt-4">
                        <IconUsers size={16} className="text-primary" />
                        Párosaim / Csapataim
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {playerStats.teams.map((team: any) => (
                            <div 
                                key={team._id} 
                                className="group flex items-center justify-between p-3 bg-card border border-muted/10 rounded-lg hover:border-primary/20 transition-all cursor-pointer"
                                onClick={() => setSelectedTeam(team)}
                            >
                                <div className="flex items-center gap-3">
                                    <SmartAvatar playerId={team._id} name={team.name} size="sm" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold">{team.name}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase opacity-60">
                                            {team.type === 'pair' ? 'Páros' : 'Csapat'} • {team.stats?.mmr || 800} MMR
                                        </span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <IconChartBar size={16} className="text-primary" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCalendar size={16} className="text-primary" />
                Esemény Napló
              </div>
              <span className="text-[10px] opacity-40">{activeHistory.length} Torna</span>
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {activeHistory.length > 0 ? activeHistory.map((tournament: any, index: number) => (
                <div key={index} className="group bg-card border border-muted/10 rounded-xl p-4 hover:border-primary/30 hover:bg-muted/5 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-secondary font-mono">
                          {new Date(tournament.startDate || tournament.date).getFullYear()}
                        </span>
                        <h4 className="text-xs font-black tracking-tight">{tournament.tournamentName || tournament.name}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                         <Badge variant="outline" className="text-[10px] h-5 py-0 border-amber-500/20 text-amber-600 bg-amber-500/5">#{tournament.finalPosition || tournament.position}.</Badge>
                         {tournament.mmrChange !== undefined && (
                            <span className={cn("text-[10px] font-bold", tournament.mmrChange >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                {tournament.mmrChange >= 0 ? "+" : ""}{tournament.mmrChange} MMR
                            </span>
                         )}
                         {tournament.oacMmrChange !== undefined && (
                            <span className={cn("text-[10px] font-bold", tournament.oacMmrChange >= 0 ? "text-blue-500" : "text-red-500")}>
                                {tournament.oacMmrChange >= 0 ? "+" : ""}{tournament.oacMmrChange} OAC MMR
                            </span>
                         )}
                      </div>
                    </div>
                    <Link href={`/tournaments/${tournament.tournamentId}`}>
                       <Button variant="outline" size="sm" className="">
                         Megnyitás
                       </Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mt-3 pt-3 border-t border-muted/5">
                      <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase opacity-60">Meccsek</span>
                          <span className="text-[11px] font-bold">{tournament.stats?.matchesWon || 0}W - {tournament.stats?.matchesLost || 0}L</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase opacity-60">Legek</span>
                          <span className="text-[11px] font-bold text-muted-foreground">{tournament.stats?.legsWon || 0}W - {tournament.stats?.legsLost || 0}L</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase opacity-60">Átlag</span>
                          <span className="text-[11px] font-bold">{tournament.stats?.average?.toFixed(1) || tournament.stats?.avg?.toFixed(1) || '—'}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase opacity-60">180-ak</span>
                          <span className="text-[11px] font-bold">{tournament.stats?.oneEightiesCount || 0}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase opacity-60">Checkout</span>
                          <span className="text-[11px] font-bold">{tournament.stats?.highestCheckout || '—'}</span>
                      </div>
                      <div className="flex flex-col text-right">
                          <span className="text-[9px] text-muted-foreground uppercase opacity-60">Dátum</span>
                          <span className="text-[11px] font-bold opacity-60">{new Date(tournament.startDate || tournament.date).toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' })}</span>
                      </div>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center text-muted-foreground/30 border border-dashed border-muted/10 rounded-xl">
                    <span className="text-xs font-bold uppercase tracking-widest">Üres lista</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {selectedTeam && (
          <PlayerStatsModal 
              player={selectedTeam}
              onClose={() => setSelectedTeam(null)}
          />
      )}
    </Card>
  )
}

function StatCard({ label, value, subtext, icon, variant }: { label: string, value: string | number, subtextText?: string, icon: React.ReactNode, variant: 'primary' | 'blue' | 'amber' | 'emerald', subtext: string }) {
    const variants = {
        primary: "border-primary/20 bg-primary/5 text-primary",
        blue: "border-blue-500/20 bg-blue-500/5 text-blue-600",
        amber: "border-amber-500/20 bg-amber-500/5 text-amber-600",
        emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600",
    }
    
    return (
        <div className={cn("p-5 rounded-xl border transition-all hover:bg-opacity-10", variants[variant])}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
                <div className="opacity-50">{icon}</div>
            </div>
            <div className="text-2xl font-black tracking-tight">{value}</div>
            <div className="text-[10px] font-bold uppercase tracking-tighter mt-1 opacity-60">{subtext}</div>
        </div>
    )
}

function SimpleStatRow({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="flex justify-between items-center px-4 py-3 hover:bg-muted/5 transition-colors">
            <span className="text-xs font-bold text-muted-foreground">{label}</span>
            <span className="text-sm font-black text-foreground">{value}</span>
        </div>
    );
}

export default PlayerStatisticsSection
