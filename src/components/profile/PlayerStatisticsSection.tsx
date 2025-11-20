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
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Skeleton } from "@/components/ui/skeleton"

interface PlayerStatisticsSectionProps {
  playerStats: any
  isLoading: boolean
  onViewLegs: (match: any) => void
}

export function PlayerStatisticsSection({
  playerStats,
  isLoading,
  onViewLegs,
}: PlayerStatisticsSectionProps) {
  if (!playerStats || !playerStats.hasPlayer) {
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconTrophy className="w-5 h-5" />
            Játékos statisztikák
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconTrophy className="w-5 h-5" />
          Játékos statisztikák
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* MMR */}
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <IconTarget className="w-5 h-5 text-primary-foreground/80" />
              <p className="text-xs text-primary-foreground/80">MMR</p>
            </div>
           
            <p className="text-3xl font-bold text-primary-foreground">
              {playerStats.player.mmr}
            </p>
            <p className={`text-xs mt-1 text-primary-foreground/90 font-medium`}>
              {playerStats.player.mmrTier.name}
            </p>
          </div>

          {/* Global Rank */}
          <div className="bg-gradient-to-br from-info to-info/80 rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <IconTrendingUp className="w-5 h-5 text-info-foreground/80" />
              <p className="text-xs text-info-foreground/80">Globális rang</p>
            </div>
            
            <p className="text-3xl font-bold text-info-foreground">
              #{playerStats.player.globalRank}
            </p>
            <p className="text-xs mt-1 text-info-foreground/90">
              Összes játékosból
            </p>
          </div>

          {/* Tournaments */}
          <div className="bg-gradient-to-br from-accent to-accent/80 rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <IconCalendar className="w-5 h-5 text-accent-foreground/80" />
              <p className="text-xs text-accent-foreground/80">Tornák</p>
            </div>
            
            <p className="text-3xl font-bold text-accent-foreground">
              {playerStats.summary.totalTournaments}
            </p>
            <p className="text-xs mt-1 text-accent-foreground/90">
              Összesen
            </p>
          </div>

          {/* Win Rate */}
          <div className="bg-gradient-to-br from-success to-success/80 rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <IconSword className="w-5 h-5 text-success-foreground/80" />
              <p className="text-xs text-success-foreground/80">Győzelem %</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-success-foreground/80 mb-1">Meccs</p>
                <p className="text-2xl font-bold text-success-foreground">
                  {playerStats.summary.winRate}%
                </p>
                <p className="text-xs mt-1 text-success-foreground/90">
                  {playerStats.summary.wins}W/{playerStats.summary.losses}L
                </p>
              </div>
              <div>
                <p className="text-xs text-success-foreground/80 mb-1">Leg</p>
                <p className="text-2xl font-bold text-success-foreground">
                  {playerStats.summary.legWinRate}%
                </p>
                <p className="text-xs mt-1 text-success-foreground/90">
                  {playerStats.summary.totalLegsWon}W/{playerStats.summary.totalLegsLost}L
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats & Tournament History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Detailed Stats */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <IconChartBar className="w-5 h-5" />
              Részletes statisztikák
            </h3>
            <Card className="bg-card">
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Átlag:</span>
                  <span className="font-semibold text-foreground">
                    {playerStats.player.stats.avg?.toFixed(1) || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">180s:</span>
                  <span className="font-semibold text-foreground">
                    {playerStats.player.stats.total180s || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Legjobb helyezés:</span>
                  <span className="font-semibold text-foreground">
                    {playerStats.player.stats.bestPosition !== 999 ? `#${playerStats.player.stats.bestPosition}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Átlagos helyezés:</span>
                  <span className="font-semibold text-foreground">
                    {playerStats.player.stats.averagePosition ? `#${playerStats.player.stats.averagePosition.toFixed(1)}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Max kiszálló:</span>
                  <span className="font-semibold text-foreground">
                    {playerStats.player.stats.highestCheckout || 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tournament History */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <IconCalendar className="w-5 h-5" />
              Legutóbbi tornák
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {[...playerStats.tournamentHistory].reverse().map((tournament: any, index: number) => (
                <Card key={index} className="bg-card hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm block truncate">
                          {tournament.name}
                        </span>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {new Date(tournament.startDate).toLocaleDateString('hu-HU')}
                          </span>
                          {tournament.finalPosition && (
                            <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded">
                              #{tournament.finalPosition}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/tournaments/${tournament.tournamentId}`}
                        className="ml-2 flex-shrink-0"
                      >
                        <Button size="sm" variant="outline">
                          Megnyitás
                        </Button>
                      </Link>
                    </div>
                    {tournament.status === 'finished' && tournament.stats && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-border/50">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Meccsek:</span>
                          <span className="text-xs font-semibold text-foreground">
                            {tournament.stats.matchesWon || 0}W/{tournament.stats.matchesLost || 0}L
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Legek:</span>
                          <span className="text-xs font-semibold text-foreground">
                            {tournament.stats.legsWon || 0}W/{tournament.stats.legsLost || 0}L
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Átlag:</span>
                          <span className="text-xs font-semibold text-foreground">
                            {tournament.stats.average?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">180-ak:</span>
                          <span className="text-xs font-semibold text-foreground">
                            {tournament.stats.oneEightiesCount || 0}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Matches */}
        {playerStats.matchHistory.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <IconSword className="w-5 h-5" />
              Legutóbbi meccsek
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {playerStats.matchHistory.map((match: any, index: number) => (
                <Card
                  key={index}
                  className={`${
                    match.won
                      ? 'bg-success/10 border-success/30'
                      : 'bg-error/15 '
                  } hover:opacity-90 transition-opacity`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground mb-1">vs {match.opponent}</div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {new Date(match.date).toLocaleDateString('hu-HU')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {match.legs} legek
                        </div>
                      </div>
                      <div className="text-right space-y-2 flex-shrink-0">
                        <div className={`text-xl font-bold ${
                          match.won ? 'text-success' : 'text-destructive'
                        }`}>
                          {match.player1Score} - {match.player2Score}
                        </div>
                        <div className={`text-xs font-medium ${
                          match.won ? 'text-success' : 'text-destructive'
                        }`}>
                          {match.won ? 'Győzelem' : 'Vereség'}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewLegs(match)}
                          className="w-full"
                        >
                          Legek
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PlayerStatisticsSection

