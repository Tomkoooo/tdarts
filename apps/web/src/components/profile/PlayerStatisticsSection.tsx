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
  IconMail,
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import { SmartAvatar } from "@/components/ui/smart-avatar"
import PlayerStatsModal from "@/components/player/PlayerStatsModal"
import { Player } from "@/interface/player.interface"
import CountryFlag from "@/components/ui/country-flag"
import PlayerSearch from "@/components/club/PlayerSearch"
import { getPlayerTranslations } from "@/data/translations/player"
import { getHeadToHeadAction, getPendingInvitationsAction } from "@/features/profile/actions"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TournamentHistory, PlayerHonor } from "@/interface/player.interface"
import HonorAverageBadge from "@/components/player/HonorAverageBadge"
import { getPlayerHonorAverage } from "@/lib/honorAvgBadge"
import HonorsSection from "@/features/profile/ui/HonorsSection"

interface PlayerStatsData {
  hasPlayer: boolean
  player: {
    _id: string
    name: string
    country?: string | null
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
    firstNineAvg?: number
  }
}

interface PlayerStatisticsSectionProps {
  playerStats: PlayerStatsData
  isLoading: boolean
  onViewLegs: (match: any) => void
}

interface HeadToHeadData {
  playerA: { _id: string; name: string; country?: string | null }
  playerB: { _id: string; name: string; country?: string | null }
  summary: {
    matchesPlayed: number
    playerAWins: number
    playerBWins: number
    playerALegsWon: number
    playerBLegsWon: number
    playerAAverage: number
    playerBAverage: number
    playerAHighestCheckout: number
    playerBHighestCheckout: number
    playerAOneEighties: number
    playerBOneEighties: number
    playerAFirstNineAvg: number
    playerBFirstNineAvg: number
  }
  allTimeComparison: {
    playerA: {
      matchesPlayed: number
      wins: number
      losses: number
      winRate: number
      avg: number
      firstNineAvg?: number
      highestCheckout: number
      oneEightiesCount: number
    }
    playerB: {
      matchesPlayed: number
      wins: number
      losses: number
      winRate: number
      avg: number
      firstNineAvg?: number
      highestCheckout: number
      oneEightiesCount: number
    }
  }
  matches: Array<{
    _id: string
    date: string
    tournament: { tournamentId: string; name: string }
    playerA: { legsWon: number; average: number; firstNineAvg?: number; highestCheckout: number; oneEightiesCount: number }
    playerB: { legsWon: number; average: number; firstNineAvg?: number; highestCheckout: number; oneEightiesCount: number }
    winnerId?: string
  }>
}

interface TopOpponentEntry {
  opponent: { _id: string; name: string; country?: string | null }
  matchesPlayed: number
  wins: number
  losses: number
  winRate?: number
  lastPlayedAt?: string
}

interface PendingInviteEntry {
  _id: string
  token: string
  createdAt: string
  expiresAt: string
  tournament: { tournamentId: string; name: string }
  team: { _id: string; name: string }
  inviter: { _id: string; name: string; email: string }
  invitee?: { _id?: string; name?: string; email?: string }
  inviteType?: "email" | "account"
}

export function PlayerStatisticsSection({
  playerStats: initialPlayerStats,
  isLoading,
  onViewLegs,
}: PlayerStatisticsSectionProps) {
  const t = getPlayerTranslations(typeof navigator !== "undefined" ? navigator.language : "hu")
  const [selectedSeason, setSelectedSeason] = React.useState<string>('current');
  const [selectedTeam, setSelectedTeam] = React.useState<Player | null>(null);
  const [selectedOpponent, setSelectedOpponent] = React.useState<any | null>(null)
  const [headToHead, setHeadToHead] = React.useState<HeadToHeadData | null>(null)
  const [headToHeadLoading, setHeadToHeadLoading] = React.useState(false)
  const [headToHeadError, setHeadToHeadError] = React.useState("")
  const [h2hComparisonMode, setH2hComparisonMode] = React.useState<"tournament" | "all-time">("tournament")
  const [topOpponents, setTopOpponents] = React.useState<TopOpponentEntry[]>([])
  const [topOpponentsLoading, setTopOpponentsLoading] = React.useState(false)
  const [pendingInvites, setPendingInvites] = React.useState<PendingInviteEntry[]>([])
  const [pendingInvitesLoading, setPendingInvitesLoading] = React.useState(false)
  const [topTournamentLimit, setTopTournamentLimit] = React.useState(3)
  const [topMatchLimit, setTopMatchLimit] = React.useState(5)

  // Move all hooks to the top
  const playerStats = React.useMemo(() => initialPlayerStats || { hasPlayer: false } as any, [initialPlayerStats]);
  
  const previousSeasons = React.useMemo(() => playerStats?.player?.previousSeasons || [], [playerStats]);
  const honors = React.useMemo(() => playerStats?.player?.honors || [], [playerStats]);
  const honorAverage = React.useMemo(() => getPlayerHonorAverage(playerStats?.player), [playerStats]);
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

  const fetchHeadToHead = React.useCallback(
    async (opponentId: string) => {
      setHeadToHeadLoading(true)
      setHeadToHeadError("")
      try {
        const result = await getHeadToHeadAction({ opponentId })
        if (typeof result === "object" && "success" in result && result.success && result.data) {
          const data = result.data as any
          if (data.playerA && data.playerB && data.summary) {
            setHeadToHead(data as HeadToHeadData)
          }
        } else if (typeof result === "object" && "ok" in result && !result.ok) {
          throw new Error((result as any).message || t.headToHeadFetchError)
        }
      } catch (error: any) {
        setHeadToHead(null)
        setHeadToHeadError(error?.message || t.headToHeadFetchError)
      } finally {
        setHeadToHeadLoading(false)
      }
    },
    [t.headToHeadFetchError]
  )

  const fetchTopOpponents = React.useCallback(async () => {
    setTopOpponentsLoading(true)
    try {
      const result = await getHeadToHeadAction({ mode: "top-opponents" })
      if (typeof result === "object" && "success" in result && result.success && result.data) {
        setTopOpponents((result.data as any)?.topOpponents || [])
      }
    } catch (error) {
      console.error("Top opponents fetch error:", error)
      setTopOpponents([])
    } finally {
      setTopOpponentsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!playerStats?.hasPlayer) return
    void fetchTopOpponents()
  }, [fetchTopOpponents, playerStats?.hasPlayer])

  const fetchPendingInvites = React.useCallback(async () => {
    setPendingInvitesLoading(true)
    try {
      const result = await getPendingInvitationsAction()
      if (typeof result === "object" && "success" in result && result.success && result.data) {
        setPendingInvites(result.data?.invitations || [])
      }
    } catch (error) {
      console.error("Pending invites fetch error:", error)
      setPendingInvites([])
    } finally {
      setPendingInvitesLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!playerStats?.hasPlayer) return
    void fetchPendingInvites()
  }, [fetchPendingInvites, playerStats?.hasPlayer])

  const handleClearHeadToHead = React.useCallback(() => {
    setSelectedOpponent(null)
    setHeadToHead(null)
    setHeadToHeadError("")
  }, [])

  const h2hLeader = React.useMemo(() => {
    if (!headToHead) return null
    if (headToHead.summary.playerAWins > headToHead.summary.playerBWins) return "A"
    if (headToHead.summary.playerBWins > headToHead.summary.playerAWins) return "B"
    return null
  }, [headToHead])

  const topOpponentsByWinRate = React.useMemo(() => {
    return [...topOpponents]
      .map((entry) => {
        const total = Math.max(entry.matchesPlayed || 0, 1)
        const winRate = Math.round((entry.wins / total) * 100)
        return { ...entry, winRate }
      })
      .sort((a, b) => {
        if ((b.winRate || 0) !== (a.winRate || 0)) return (b.winRate || 0) - (a.winRate || 0)
        if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed
        return (new Date(b.lastPlayedAt || 0).getTime() || 0) - (new Date(a.lastPlayedAt || 0).getTime() || 0)
      })
  }, [topOpponents])

  const mostPlayedTop5 = React.useMemo(() => {
    return [...topOpponents]
      .sort((a, b) => b.matchesPlayed - a.matchesPlayed)
      .slice(0, 5)
  }, [topOpponents])

  const tournamentAveragesAll = React.useMemo(() => {
    return activeHistory
      .map((entry: any) => {
        const avg = Number(entry?.stats?.average || entry?.stats?.avg || entry?.average || 0)
        return {
          id: `${entry?.tournamentId || entry?._id || entry?.name || "tournament"}-${entry?.startDate || entry?.date || ""}`,
          tournamentId: entry?.tournamentId || undefined,
          name: entry?.tournamentName || entry?.name || "Ismeretlen torna",
          date: entry?.startDate || entry?.date,
          finalPosition: entry?.finalPosition || entry?.position,
          mmrChange: entry?.mmrChange,
          oacMmrChange: entry?.oacMmrChange,
          matchesWon: Number(entry?.stats?.matchesWon || 0),
          matchesLost: Number(entry?.stats?.matchesLost || 0),
          legsWon: Number(entry?.stats?.legsWon || 0),
          legsLost: Number(entry?.stats?.legsLost || 0),
          oneEightiesCount: Number(entry?.stats?.oneEightiesCount || 0),
          highestCheckout: Number(entry?.stats?.highestCheckout || 0),
          avg,
        }
      })
      .filter((entry: { avg: number }) => entry.avg > 0)
      .sort((a: { avg: number }, b: { avg: number }) => b.avg - a.avg)
  }, [activeHistory])

  const topThreeAverages = React.useMemo(() => {
    return tournamentAveragesAll.slice(0, topTournamentLimit)
  }, [tournamentAveragesAll, topTournamentLimit])

  const matchAveragesAll = React.useMemo(() => {
    return (playerStats.matchHistory || [])
      .map((match: any) => ({
        ...match,
        average: Number(match?.average || 0),
        firstNineAvg: Number(match?.firstNineAvg || 0),
      }))
      .filter((match: any) => match.average > 0)
      .sort((a: any, b: any) => b.average - a.average)
  }, [playerStats.matchHistory])

  const topThreeMatchAverages = React.useMemo(() => {
    return matchAveragesAll.slice(0, topMatchLimit)
  }, [matchAveragesAll, topMatchLimit])

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
            <span>Játékos statisztikák</span>
            <CountryFlag countryCode={playerStats.player.country} className="text-base" />
            </CardTitle>
            <div className="flex flex-wrap gap-2 pt-1">
              <HonorAverageBadge
                average={honorAverage}
                tooltip={honorAverage ? t.honorAvgTooltip.replace("{avg}", honorAverage.toFixed(2)) : undefined}
              />
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
        <HonorsSection
          honors={honors}
          text={{
            honorsSectionTitle: t.honorsSectionTitle,
            honorsCategorySpecial: t.honorsCategorySpecial,
            honorsCategoryRank: t.honorsCategoryRank,
            honorsCategoryTournament: t.honorsCategoryTournament,
            honorsEmptyTitle: t.honorsEmptyTitle,
            honorsEmptySubtitle: t.honorsEmptySubtitle,
          }}
        />

        {/* Head-to-Head Section */}
        <div className="space-y-8">
          {/* Search Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1 w-full max-w-xl">
              <PlayerSearch
                onPlayerSelected={(player) => {
                  setSelectedOpponent(player)
                  void fetchHeadToHead(player._id)
                }}
                placeholder={t.headToHeadSearchPlaceholder || "Ellenfél keresése..."}
                excludePlayerIds={[playerStats.player._id]}
                showAddGuest={false}
                isForTournament
              />
              {!topOpponentsLoading && mostPlayedTop5.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-label text-muted-foreground mr-2 font-bold uppercase tracking-widest text-[10px]">Legutóbbiak:</span>
                  {mostPlayedTop5.map((entry) => (
                    <button
                      key={`quick-${entry.opponent._id}`}
                      className="px-3 py-1 bg-card text-[10px] font-bold uppercase tracking-widest rounded-full border border-border/50 hover:bg-muted/50 transition-colors text-primary"
                      onClick={() => {
                        setSelectedOpponent(entry.opponent)
                        void fetchHeadToHead(entry.opponent._id)
                      }}
                    >
                      {entry.opponent.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {headToHead && (
              <button onClick={handleClearHeadToHead} className="flex items-center gap-2 px-6 py-3 bg-destructive/10 text-destructive rounded-lg font-bold hover:bg-destructive/20 transition-all active:scale-95 group">
                <IconSword size={18} className="group-hover:rotate-12 transition-transform" />
                <span>{t.headToHeadClear || "Törlés"}</span>
              </button>
            )}
          </div>

          {headToHeadLoading ? (
             <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border/50 shadow-sm">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t.headToHeadLoading || "Betöltés..."}</p>
             </div>
          ) : headToHeadError ? (
             <div className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm">
                <p className="text-sm font-medium text-destructive">{headToHeadError}</p>
                <Button variant="outline" size="sm" onClick={() => selectedOpponent?._id && void fetchHeadToHead(selectedOpponent._id)}>
                  {t.retry || "Újra"}
                </Button>
             </div>
          ) : !headToHead ? (
             <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden line-clamp-2">
                <div className="p-6 border-b border-border/50 bg-muted/20">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <IconUsers size={16} /> Összes ellenfél (győzelmi ráta szerint)
                    </p>
                </div>
                {topOpponentsLoading ? (
                  <div className="p-8 text-center"><p className="text-xs text-muted-foreground">{t.headToHeadLoading || "Betöltés..."}</p></div>
                ) : topOpponentsByWinRate.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground/50 border-dashed border border-muted/20 m-6 rounded-xl"><p className="text-xs">{t.headToHeadNoTopOpponents || "Nincsenek elérhető ellenfelek"}</p></div>
                ) : (
                  <div className="max-h-[min(480px,72dvh)] md:max-h-[360px] overflow-y-auto pr-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-3 custom-scrollbar">
                    {topOpponentsByWinRate.map((entry) => (
                      <button
                        key={entry.opponent._id}
                        className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border/50 bg-background p-4 text-left hover:border-primary/50 hover:bg-muted/30 transition-all group shadow-sm"
                        onClick={() => {
                          setSelectedOpponent(entry.opponent)
                          void fetchHeadToHead(entry.opponent._id)
                        }}
                      >
                        <div className="min-w-0 pr-4">
                          <p className="truncate text-sm font-headline font-bold mb-1 group-hover:text-primary transition-colors">{entry.opponent.name}</p>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex gap-2">
                            <span>{entry.matchesPlayed} {t.headToHeadMatches?.toLowerCase() || "meccs"}</span> • 
                            <span className="text-emerald-500/80">{entry.wins}W</span> • 
                            <span className="text-primary">{Math.round(entry.winRate || 0)}% WR</span>
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 group-hover:bg-primary/20 transition-colors">
                           <IconSword size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
             </div>
          ) : (
            <div className="space-y-8">
              {/* Head-to-Head Hero Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
                
                {/* Player 1 Card */}
                <div className="lg:col-span-4 bg-card rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden shadow-lg border border-border/50">
                  <div className="w-28 h-28 rounded-full overflow-hidden mb-5 ring-4 ring-muted flex items-center justify-center bg-background border border-border/50 shadow-inner">
                    <SmartAvatar playerId={playerStats.player._id} name={playerStats.player.name} className="w-full h-full text-4xl" />
                  </div>
                  <h2 className="font-headline text-2xl sm:text-3xl font-bold mb-1 line-clamp-1">{playerStats.player.name}</h2>
                  <p className="text-primary font-medium tracking-widest text-[10px] uppercase font-bold mb-5 flex items-center gap-1">
                     <IconTrophy size={12} /> {playerStats.player.stats?.mmr || 800} MMR
                  </p>
                  <div className="w-full h-px bg-border/50 mb-5"></div>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="text-left bg-muted/20 p-3 rounded-lg border border-border/30">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Avg</span>
                      <span className="text-lg font-headline font-black text-foreground">{headToHead.summary.playerAAverage ? headToHead.summary.playerAAverage.toFixed(1) : "—"}</span>
                    </div>
                    <div className="text-right bg-muted/20 p-3 rounded-lg border border-border/30">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">180s</span>
                      <span className="text-lg font-headline font-black text-primary">{headToHead.summary.playerAOneEighties || 0}</span>
                    </div>
                  </div>
                </div>

                {/* VS Gauge Center */}
                <div className="lg:col-span-4 flex flex-col justify-center items-center gap-6 py-8 lg:py-0">
                  <div className="relative w-44 h-44 flex items-center justify-center group">
                    <svg className="absolute w-full h-full -rotate-90 transform drop-shadow-xl" viewBox="0 0 100 100">
                      <circle className="text-muted/30" cx="50" cy="50" fill="none" r="45" stroke="currentColor" strokeWidth="6"></circle>
                      <circle 
                        className="text-primary transition-all duration-1000 ease-out drop-shadow-sm" 
                        cx="50" cy="50" fill="none" r="45" 
                        stroke="currentColor" 
                        strokeDasharray="282.7" 
                        strokeDashoffset={282.7 - (282.7 * ((headToHead.summary.playerAWins / (headToHead.summary.matchesPlayed || 1))))} 
                        strokeLinecap="round" strokeWidth="8">
                      </circle>
                    </svg>
                    <div className="text-center z-10 transition-transform group-hover:scale-110">
                      <span className="block text-4xl sm:text-5xl font-headline font-black text-primary drop-shadow-sm">
                        {((headToHead.summary.playerAWins / (headToHead.summary.matchesPlayed || 1)) * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Win Rate</span>
                    </div>
                    {/* VS Text */}
                    <div className="absolute -top-6 font-headline italic font-black text-5xl sm:text-6xl text-muted/20 select-none">VS</div>
                  </div>
                  <div className="flex gap-4 w-full">
                    <div className="flex-1 bg-primary/5 p-4 rounded-xl text-center border border-primary/20 shadow-sm">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-primary mb-1">{t.wins || "Győzelem"}</span>
                      <span className="text-3xl font-headline font-black text-primary">{headToHead.summary.playerAWins}</span>
                    </div>
                    <div className="flex-1 bg-destructive/5 p-4 rounded-xl text-center border border-destructive/20 shadow-sm">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-destructive mb-1">{t.losses || "Vereség"}</span>
                      <span className="text-3xl font-headline font-black text-destructive">{headToHead.summary.playerBWins}</span>
                    </div>
                  </div>
                </div>

                {/* Player 2 Card */}
                <div className="lg:col-span-4 bg-card rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden shadow-lg border border-border/50">
                  <div className="w-28 h-28 rounded-full overflow-hidden mb-5 ring-4 ring-muted flex items-center justify-center bg-background border border-border/50 shadow-inner">
                    <SmartAvatar playerId={headToHead.playerB._id} name={headToHead.playerB.name} className="w-full h-full text-4xl" />
                  </div>
                  <h2 className="font-headline text-2xl sm:text-3xl font-bold mb-1 line-clamp-1">{headToHead.playerB.name}</h2>
                  <p className="text-muted-foreground font-medium tracking-widest text-[10px] uppercase font-bold mb-5 flex items-center gap-1">
                     Ellenfél {h2hLeader === "B" && <IconTrophy size={11} className="text-amber-500" />}
                  </p>
                  <div className="w-full h-px bg-border/50 mb-5"></div>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="text-left bg-muted/20 p-3 rounded-lg border border-border/30">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Avg</span>
                      <span className="text-lg font-headline font-black text-foreground">{headToHead.summary.playerBAverage ? headToHead.summary.playerBAverage.toFixed(1) : "—"}</span>
                    </div>
                    <div className="text-right bg-muted/20 p-3 rounded-lg border border-border/30">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">180s</span>
                      <span className="text-lg font-headline font-black text-foreground">{headToHead.summary.playerBOneEighties || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Comparison Grids */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* All-time összehasonlítás Table */}
                <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50 flex flex-col">
                  <div className="px-6 py-5 flex items-center justify-between border-b border-border/50 bg-muted/10">
                    <h3 className="font-headline font-bold text-lg">All-time összehasonlítás</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={h2hComparisonMode === "tournament" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 px-2 text-[10px] uppercase tracking-widest"
                        onClick={() => setH2hComparisonMode("tournament")}
                      >
                        {t.headToHeadScopeTournament || "Tournament"}
                      </Button>
                      <Button
                        variant={h2hComparisonMode === "all-time" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 px-2 text-[10px] uppercase tracking-widest"
                        onClick={() => setH2hComparisonMode("all-time")}
                      >
                        {t.headToHeadScopeAllTime || "All-time"}
                      </Button>
                      <IconChartBar size={16} className="text-primary" />
                    </div>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full table-fixed text-sm border-collapse min-w-[420px]">
                      <colgroup>
                        <col className="w-[42%]" />
                        <col className="w-[29%]" />
                        <col className="w-[29%]" />
                      </colgroup>
                      <thead>
                        <tr className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold bg-muted/5 border-b border-border/30">
                          <th className="text-left py-4 px-6">{t.headToHeadStatsMetric || "Kategória"}</th>
                          <th className="text-right py-4 px-4 truncate">{headToHead.playerA.name}</th>
                          <th className="text-right py-4 px-6 truncate">{headToHead.playerB.name}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadAverage || "Összesített Átlag"}</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-primary">
                            {h2hComparisonMode === "all-time"
                              ? (headToHead.allTimeComparison.playerA.avg ? headToHead.allTimeComparison.playerA.avg.toFixed(1) : "—")
                              : (headToHead.summary.playerAAverage ? headToHead.summary.playerAAverage.toFixed(1) : "—")}
                          </td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">
                            {h2hComparisonMode === "all-time"
                              ? (headToHead.allTimeComparison.playerB.avg ? headToHead.allTimeComparison.playerB.avg.toFixed(1) : "—")
                              : (headToHead.summary.playerBAverage ? headToHead.summary.playerBAverage.toFixed(1) : "—")}
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadFirstNineAvg || "First 9 Average"}</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-foreground">
                            {h2hComparisonMode === "all-time"
                              ? (typeof headToHead.allTimeComparison.playerA.firstNineAvg === "number" ? headToHead.allTimeComparison.playerA.firstNineAvg.toFixed(1) : "—")
                              : (typeof headToHead.summary.playerAFirstNineAvg === "number" ? headToHead.summary.playerAFirstNineAvg.toFixed(1) : "—")}
                          </td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">
                            {h2hComparisonMode === "all-time"
                              ? (typeof headToHead.allTimeComparison.playerB.firstNineAvg === "number" ? headToHead.allTimeComparison.playerB.firstNineAvg.toFixed(1) : "—")
                              : (typeof headToHead.summary.playerBFirstNineAvg === "number" ? headToHead.summary.playerBFirstNineAvg.toFixed(1) : "—")}
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadWinrate || "Winrate"}</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-primary">
                            {h2hComparisonMode === "all-time"
                              ? `${headToHead.allTimeComparison.playerA.winRate.toFixed(0)}%`
                              : `${((headToHead.summary.playerAWins / Math.max(1, headToHead.summary.matchesPlayed)) * 100).toFixed(0)}%`}
                          </td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">
                            {h2hComparisonMode === "all-time"
                              ? `${headToHead.allTimeComparison.playerB.winRate.toFixed(0)}%`
                              : `${((headToHead.summary.playerBWins / Math.max(1, headToHead.summary.matchesPlayed)) * 100).toFixed(0)}%`}
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadOneEighties || "180-as dobások"}</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-foreground">
                            {h2hComparisonMode === "all-time" ? (headToHead.allTimeComparison.playerA.oneEightiesCount || 0) : (headToHead.summary.playerAOneEighties || 0)}
                          </td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">
                            {h2hComparisonMode === "all-time" ? (headToHead.allTimeComparison.playerB.oneEightiesCount || 0) : (headToHead.summary.playerBOneEighties || 0)}
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadHighestCheckout || "Legmagasabb Koszálló"}</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-foreground">
                            {h2hComparisonMode === "all-time" ? (headToHead.allTimeComparison.playerA.highestCheckout || "—") : (headToHead.summary.playerAHighestCheckout || "—")}
                          </td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">
                            {h2hComparisonMode === "all-time" ? (headToHead.allTimeComparison.playerB.highestCheckout || "—") : (headToHead.summary.playerBHighestCheckout || "—")}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Match History equivalence Grid */}
                <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50 flex flex-col">
                  <div className="px-6 py-5 flex items-center justify-between border-b border-border/50 bg-muted/10">
                    <h3 className="font-headline font-bold text-lg">{t.headToHeadMatches || "Közös Meccsek"} ({headToHead.summary.matchesPlayed})</h3>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    </div>
                  </div>
                  <div className="p-0 overflow-hidden flex-1 flex flex-col">
                    {headToHead.matches.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center p-8 text-center text-sm font-bold uppercase tracking-widest text-muted-foreground/50">
                        {t.headToHeadNoMatches || "Nincsenek közös meccsek"}
                      </div>
                    ) : (
                      <div className="max-h-[min(560px,75dvh)] md:max-h-[385px] overflow-y-auto w-full custom-scrollbar">
                        {headToHead.matches.map((match) => {
                          const isWin = match.playerA.legsWon > match.playerB.legsWon;
                          const isDraw = match.playerA.legsWon === match.playerB.legsWon;
                          return (
                            <div key={match._id} className="group relative bg-card border-b border-border/30 hover:bg-muted/30 transition-all p-1">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-primary/0 to-transparent group-hover:via-primary/50 transition-colors"></div>
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
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => onViewLegs({ _id: match._id })}>
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
          )}
        </div>

        {/* Top Averages Section - Modern Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pt-4">
          
          {/* Left Column: Elite Tournaments equivalent */}
          <div className="xl:col-span-5 space-y-6">
            <div className="flex justify-between items-end mb-2">
              <h2 className="font-headline text-2xl font-bold flex items-center gap-3">
                 <IconMedal className="text-primary" size={28} />
                 {t.topTournamentAverages || "Top Torna Átlagok"}
              </h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10 h-7" onClick={() => setTopTournamentLimit((prev) => Math.min(prev + 5, tournamentAveragesAll.length || 5))}>{t.loadMore || "Több"}</Button>
                {topTournamentLimit > 3 && <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-7" onClick={() => setTopTournamentLimit(3)}>{t.reset || "Reset"}</Button>}
              </div>
            </div>

            <div className="space-y-4">
              {topThreeAverages.length === 0 ? (
                <div className="bg-card p-6 rounded-2xl border border-border/50 text-center border-dashed">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t.notEnoughData || "Nincs elég adat"}</p>
                </div>
              ) : (
                topThreeAverages.map((entry: any, index: number) => (
                  <div key={entry.id} className="bg-card rounded-2xl p-5 sm:p-6 border border-border/50 hover:border-primary/50 transition-colors group shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                      <IconTrendingUp size={80} />
                    </div>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-headline font-black text-primary shrink-0 relative z-10">
                        #{index + 1}
                      </div>
                      <div className="min-w-0 flex-1 relative z-10">
                        <h4 className="font-headline font-bold text-base sm:text-lg leading-tight truncate">{entry.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                             {entry.date ? new Date(entry.date).toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                           </span>
                           {entry.finalPosition ? (
                              <Badge variant="outline" className="text-[9px] h-4 py-0 px-1.5 font-bold uppercase tracking-widest border-primary/30 text-primary bg-primary/5">P#{entry.finalPosition}</Badge>
                           ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 relative z-10">
                       <div className="bg-muted/30 rounded-lg p-2.5 sm:p-3 border border-border/50">
                         <span className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{t.topTournamentAvg || "Átlag"}</span>
                         <span className="font-headline font-black text-lg text-foreground">{entry.avg.toFixed(1)}</span>
                       </div>
                       <div className="bg-muted/30 rounded-lg p-2.5 sm:p-3 border border-border/50">
                         <span className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{t.topTournamentMatches || "Meccsek"}</span>
                         <span className="font-headline font-black text-[13px] sm:text-sm md:text-md text-foreground">{entry.matchesWon}W - {entry.matchesLost}L</span>
                       </div>
                       <div className="bg-muted/30 rounded-lg p-2.5 sm:p-3 border border-border/50 text-right">
                         <span className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">180s/CHK</span>
                         <span className="font-headline font-black text-sm sm:text-md text-foreground">{entry.oneEightiesCount} / {entry.highestCheckout || "—"}</span>
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Top Match Averages Table equivalent */}
          <div className="xl:col-span-7 space-y-6">
            <div className="bg-card rounded-2xl overflow-hidden shadow-lg border border-border/50 h-full flex flex-col">
              <div className="p-6 sm:p-8 bg-muted/10 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="font-headline text-xl sm:text-2xl font-bold flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                  {t.topMatchAverages || "Top Meccs Átlagok"}
                </h2>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="text-[10px] font-bold uppercase tracking-widest h-8 bg-muted hover:bg-muted/80 text-foreground" onClick={() => setTopMatchLimit((prev) => Math.min(prev + 5, matchAveragesAll.length || 5))}>{t.loadMore || "Több"}</Button>
                  {topMatchLimit > 5 && <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-8" onClick={() => setTopMatchLimit(5)}>{t.reset || "Reset"}</Button>}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="md:hidden">
                  {topThreeMatchAverages.length === 0 ? (
                    <div className="py-12 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-dashed border-border/50 rounded-xl px-6 py-4">{t.noData || "No data"}</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {topThreeMatchAverages.map((match: any, index: number) => {
                        const currentPlayerId = playerStats?.player?._id?.toString()
                        const winnerId = match.winnerId?.toString?.() || match.winnerId
                        const isWinnerById = Boolean(currentPlayerId) && Boolean(winnerId) && currentPlayerId === winnerId
                        const userScore = Number(match.userScore ?? match.player1Score ?? 0)
                        const oppScore = Number(match.opponentScore ?? match.player2Score ?? 0)
                        const isWinnerByScore = Number.isFinite(userScore) && Number.isFinite(oppScore) && userScore > oppScore
                        const didWin = match.winner === "user" || isWinnerById || isWinnerByScore
                        return (
                          <div
                            key={`top-match-mobile-${match._id}`}
                            className="p-4 cursor-pointer hover:bg-muted/10 transition-colors"
                            onClick={() => onViewLegs(match)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-headline font-bold text-sm flex items-center gap-1.5">
                                  <span className="text-muted-foreground">#{index + 1}</span>
                                  <span className="truncate">{match.opponent}</span>
                                  {didWin ? <IconTrophy size={13} className="text-amber-500 shrink-0" /> : null}
                                </p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                  {match.userScore ?? match.player1Score} - {match.opponentScore ?? match.player2Score}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onViewLegs(match)
                                }}
                              >
                                <IconChartBar size={15} />
                                <span className="text-[10px] uppercase tracking-widest">{t.openDetails || "Open"}</span>
                              </Button>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-md border border-border/40 bg-muted/20 px-2 py-1.5 text-center">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{t.topTournamentAvg || "Avg"}</p>
                                <p className="font-headline text-sm font-black text-primary">{Number(match.average).toFixed(1)}</p>
                              </div>
                              <div className="rounded-md border border-border/40 bg-muted/20 px-2 py-1.5 text-center">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{t.f9Avg || "F9"}</p>
                                <p className="font-headline text-sm font-black text-foreground">{typeof match.firstNineAvg === "number" ? Number(match.firstNineAvg).toFixed(1) : "—"}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <table className="hidden md:table w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/5 border-b border-border/50">
                      <th className="px-3 lg:px-6 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.headToHeadStatsOpponent || "Opponent"}</th>
                      <th className="px-2 lg:px-4 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">{t.opponentResult || "Result"}</th>
                      <th className="px-2 lg:px-4 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right border-l border-border/30">{t.topTournamentAvg || "Átlag"}</th>
                      <th className="px-2 lg:px-4 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">{t.f9Avg || "F9 Átlag"}</th>
                      <th className="px-3 lg:px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {topThreeMatchAverages.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-dashed border-border/50 rounded-xl px-6 py-4">{t.noData || "No data"}</span>
                        </td>
                      </tr>
                    ) : (
                      topThreeMatchAverages.map((match: any, index: number) => {
                        const currentPlayerId = playerStats?.player?._id?.toString()
                        const winnerId = match.winnerId?.toString?.() || match.winnerId
                        const isWinnerById =
                          Boolean(currentPlayerId) &&
                          Boolean(winnerId) &&
                          currentPlayerId === winnerId
                        const userScore = Number(match.userScore ?? match.player1Score ?? 0)
                        const oppScore = Number(match.opponentScore ?? match.player2Score ?? 0)
                        const isWinnerByScore = Number.isFinite(userScore) && Number.isFinite(oppScore) && userScore > oppScore
                        const didWin = match.winner === "user" || isWinnerById || isWinnerByScore
                        return (
                        <tr
                          key={`top-match-${match._id}`}
                          className="hover:bg-muted/10 transition-colors group cursor-pointer"
                          onClick={() => onViewLegs(match)}
                        >
                          <td className="px-3 lg:px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-headline font-bold text-xs shrink-0 text-muted-foreground border border-border">
                                #{index + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="font-headline font-bold text-sm lg:text-base capitalize flex items-center gap-1.5">
                                  <span className="truncate">{match.opponent}</span>
                                  {didWin && <IconTrophy size={13} className="text-amber-500 shrink-0" />}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 lg:px-4 py-5 text-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {match.userScore ?? match.player1Score} - {match.opponentScore ?? match.player2Score}
                            </span>
                          </td>
                          <td className="px-2 lg:px-4 py-5 text-right border-l border-border/30">
                            <span className="font-headline text-lg sm:text-xl font-black text-primary">{Number(match.average).toFixed(1)}</span>
                          </td>
                          <td className="px-2 lg:px-4 py-5 text-center">
                            <span className="font-headline text-base font-bold text-foreground">
                              {typeof match.firstNineAvg === "number" ? Number(match.firstNineAvg).toFixed(1) : "—"}
                            </span>
                          </td>
                          <td className="px-3 lg:px-6 py-5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              onClick={(event) => {
                                event.stopPropagation()
                                onViewLegs(match)
                              }}
                            >
                              <IconChartBar size={16} />
                              <span className="text-[10px] uppercase tracking-widest">{t.openDetails || "Open"}</span>
                            </Button>
                          </td>
                        </tr>
                      )})
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <Card className="bg-card border-muted/20 shadow-sm mt-8">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">
              <IconMail size={16} className="text-primary" />
              {t.pendingInvitesTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvitesLoading ? (
              <p className="text-xs text-muted-foreground">{t.pendingInvitesLoading}</p>
            ) : pendingInvites.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t.pendingInvitesEmpty}</p>
            ) : (
              pendingInvites.map((invite) => (
                <div key={invite._id} className="flex items-center justify-between rounded-lg border border-muted/20 bg-muted/5 px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold">{invite.tournament.name}</p>
                      <Badge variant="outline" className="text-[9px]">
                        {invite.inviteType === "email" ? t.pendingInvitesTypeEmail : t.pendingInvitesTypeAccount}
                      </Badge>
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">{invite.team.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {t.pendingInvitesFrom} {invite.inviter.name}
                    </p>
                    {invite.invitee?.email && (
                      <p className="truncate text-[10px] text-muted-foreground">
                        {t.pendingInvitesRecipient} {invite.invitee.email}
                      </p>
                    )}
                  </div>
                  <Link href={`/invitations/${invite.token}`}>
                    <Button variant="outline" size="sm">
                      {t.pendingInvitesOpen}
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Summary Stats - Flatter Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={cn("p-5 rounded-xl border transition-all hover:bg-opacity-10", "border-primary/20 bg-primary/5 text-primary")}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                {selectedSeason === 'current' || selectedSeason === 'all-time' ? (t.currentMmr || 'Aktuális MMR') : (t.endOfSeasonMmr || 'Szezon végi MMR')}
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
              {selectedSeason === 'current' || selectedSeason === 'all-time' ? playerStats.player.mmrTier.name : (t.archived || 'Archivált')}
            </div>
          </div>
          <StatCard 
            label={selectedSeason === 'current' || selectedSeason === 'all-time' ? (t.rank || 'Rangsor') : (t.finishedPlace || 'Végezte')}
            value={selectedSeason === 'current' || selectedSeason === 'all-time' ? `#${playerStats.player.globalRank || '—'}` : '—'}
            subtext={t.globalList || "Globális lista"}
            icon={<IconTrendingUp className="w-4 h-4" />}
            variant="blue"
          />
          <StatCard 
            label={t.tournaments || "Tornák"}
            value={activeSummary.totalTournaments}
            subtext={selectedSeason === 'all-time' ? (t.career || 'Pályafutás') : (t.period || 'Időszak')}
            icon={<IconCalendar className="w-4 h-4" />}
            variant="amber"
          />
          <StatCard 
            label={t.winRate || "Győzelmi ráta"}
            value={`${Math.round(Number(activeSummary.winRate || 0))}%`}
            subtext={`${activeSummary.wins} ${t.winCount || 'Győzelem'}`}
            icon={<IconSword className="w-4 h-4" />}
            variant="emerald"
          />
        </div>

        {/* GRAPHS SECTION - Flatter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-muted/20 shadow-sm">
                <CardHeader className="py-4 border-b border-muted/10">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                        {t.formAverage || "Forma (Átlag)"}
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
                            <span className="text-xs font-bold uppercase tracking-widest">{t.noData || "Nincs adat"}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-card border-muted/20 shadow-sm">
                <CardHeader className="py-4 border-b border-muted/10">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                        {t.mmrProgression || "MMR Alakulás"}
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
                            <span className="text-xs font-bold uppercase tracking-widest">{t.noMmrHistory || "Nincs MMR történet"}</span>
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
              {t.seasonalStats || "Szezonális Mutatók"}
            </h3>
            <div className="bg-card border border-muted/20 rounded-xl overflow-hidden divide-y divide-muted/10">
                <SimpleStatRow label={t.average || "Átlag"} value={activeStats.avg?.toFixed(1) || '—'} />
                <SimpleStatRow label={t.firstNine || "First 9 Átlag"} value={activeStats.firstNineAvg?.toFixed(1) || '—'} />
                <SimpleStatRow label={t.oneEighties || "180-as Dobások"} value={activeStats.total180s || activeStats.oneEightiesCount || 0} />
                <SimpleStatRow label={t.bestPosition || "Legjobb Helyezés"} value={activeStats.bestPosition !== 999 ? `#${activeStats.bestPosition}` : '—'} />
                <SimpleStatRow label={t.avgPosition || "Átlagos Helyezés"} value={activeStats.averagePosition ? `#${activeStats.averagePosition.toFixed(1)}` : '—'} />
                <SimpleStatRow label={t.maxCheckout || "Max Kiszálló"} value={activeStats.highestCheckout || '—'} />
            </div>

            {/* Recent Matches Restoration */}
            {playerStats.matchHistory && playerStats.matchHistory.length > 0 && (
                <>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 pt-4">
                        <IconSword size={16} className="text-primary" />
                        {t.recentMatches || "Legutóbbi Meccsek"}
                    </h3>
                    <div className="max-h-[500px] space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                        {(playerStats.matchHistory as any[]).slice(0, 10).map((match: any) => (
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
                        {t.myTeams || "Párosaim / Csapataim"}
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
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold">{team.name}</span>
                                          <CountryFlag countryCode={team.country} />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground uppercase opacity-60">
                                            {team.type === 'pair' ? (t.pair || "Páros") : (t.team || "Csapat")} • {team.stats?.mmr || 800} MMR
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
                {t.eventLog || "Esemény Napló"}
              </div>
              <span className="text-[10px] opacity-40">{activeHistory.length} {t.tournaments || "Torna"}</span>
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
                         {t.openDetails || "Megnyitás"}
                       </Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mt-3 pt-3 border-t border-muted/5">
                      <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase opacity-60">{t.matches || "Meccsek"}</span>
                          <span className="text-[11px] font-bold">{tournament.stats?.matchesWon || 0}W - {tournament.stats?.matchesLost || 0}L</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase opacity-60">{t.legs || "Legek"}</span>
                          <span className="text-[11px] font-bold text-muted-foreground">{tournament.stats?.legsWon || 0}W - {tournament.stats?.legsLost || 0}L</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase opacity-60">{t.average || "Átlag"}</span>
                          <span className="text-[11px] font-bold">{tournament.stats?.average?.toFixed(1) || tournament.stats?.avg?.toFixed(1) || '—'}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase opacity-60">180s</span>
                          <span className="text-[11px] font-bold">{tournament.stats?.oneEightiesCount || 0}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase opacity-60">Checkout</span>
                          <span className="text-[11px] font-bold">{tournament.stats?.highestCheckout || '—'}</span>
                      </div>
                      <div className="flex flex-col text-right">
                          <span className="text-[9px] text-muted-foreground uppercase opacity-60">{t.date || "Dátum"}</span>
                          <span className="text-[11px] font-bold opacity-60">{new Date(tournament.startDate || tournament.date).toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' })}</span>
                      </div>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center text-muted-foreground/30 border border-dashed border-muted/10 rounded-xl">
                    <span className="text-xs font-bold uppercase tracking-widest">{t.emptyList || "Üres lista"}</span>
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

function CircularStatCard({ label, value, total, color }: { label: string; value: number | string; total: number; color: string }) {
  const numericValue = typeof value === "number" ? value : Number(value) || 0
  const safeTotal = Math.max(total || 0, 1)
  const normalizedValue = Math.max(Math.min(numericValue, safeTotal), 0)
  const ringData = [
    { name: "value", value: normalizedValue },
    { name: "rest", value: Math.max(safeTotal - normalizedValue, 0) },
  ]

  return (
    <div className="rounded-xl border border-muted/20 bg-card p-3">
      <div className="mx-auto h-[90px] w-[90px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={ringData} dataKey="value" innerRadius={28} outerRadius={40} startAngle={90} endAngle={-270}>
              <Cell fill={color} />
              <Cell fill="hsl(var(--muted))" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-xl font-black">{value}</p>
      <p className="text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}

export default PlayerStatisticsSection
