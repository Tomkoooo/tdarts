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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">MMR</p>
                  <p className="text-3xl font-bold text-primary">
                    {playerStats.player.mmr}
                  </p>
                  <p className={`text-xs mt-1 ${playerStats.player.mmrTier.color}`}>
                    {playerStats.player.mmrTier.name}
                  </p>
                </div>
                <IconTarget className="w-10 h-10 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          {/* Global Rank */}
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Globális rang</p>
                  <p className="text-3xl font-bold text-blue-500">
                    #{playerStats.player.globalRank}
                  </p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Összes játékosból
                  </p>
                </div>
                <IconTrendingUp className="w-10 h-10 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>

          {/* Tournaments */}
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tornák</p>
                  <p className="text-3xl font-bold text-accent">
                    {playerStats.summary.totalTournaments}
                  </p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Összesen
                  </p>
                </div>
                <IconCalendar className="w-10 h-10 text-accent/20" />
              </div>
            </CardContent>
          </Card>

          {/* Win Rate */}
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Győzelem %</p>
                  <p className="text-3xl font-bold text-green-500">
                    {playerStats.summary.winRate}%
                  </p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    {playerStats.summary.wins}W/{playerStats.summary.losses}L
                  </p>
                </div>
                <IconSword className="w-10 h-10 text-green-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats & Tournament History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Detailed Stats */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <IconChartBar className="w-5 h-5" />
              Részletes statisztikák
            </h3>
            <Card className="bg-muted/50">
              <CardContent className="pt-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Átlag:</span>
                  <span className="font-semibold">
                    {playerStats.player.stats.avg?.toFixed(1) || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">180s:</span>
                  <span className="font-semibold">
                    {playerStats.player.stats.total180s || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Legjobb helyezés:</span>
                  <span className="font-semibold">
                    {playerStats.player.stats.bestPosition || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Átlagos helyezés:</span>
                  <span className="font-semibold">
                    {playerStats.player.stats.averagePosition?.toFixed(1) || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Max kiszálló:</span>
                  <span className="font-semibold">
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
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {playerStats.tournamentHistory.map((tournament: any, index: number) => (
                <Card key={index} className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-sm line-clamp-1 flex-1">
                        {tournament.name}
                      </span>
                      <Link
                        href={`/tournaments/${tournament.tournamentId}`}
                        className="ml-2"
                      >
                        <Button size="sm" variant="outline">
                          Megnyitás
                        </Button>
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 mb-1">
                        <span>
                          {new Date(tournament.startDate).toLocaleDateString('hu-HU')}
                        </span>
                        <span className={`font-semibold ${
                          tournament.status === 'finished' ? 'text-primary' : 'text-amber-500'
                        }`}>
                          {tournament.status === 'finished' ? 'Befejezve' : 'Folyamatban'}
                        </span>
                        {tournament.finalPosition && (
                          <span className="text-primary font-semibold">
                            #{tournament.finalPosition}
                          </span>
                        )}
                      </div>
                      {tournament.status === 'finished' && tournament.stats && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 pt-2 border-t border-border">
                          <div className="flex justify-between">
                            <span>Meccsek:</span>
                            <span className="font-semibold">
                              {tournament.stats.matchesWon || 0}W/{tournament.stats.matchesLost || 0}L
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Legek:</span>
                            <span className="font-semibold">
                              {tournament.stats.legsWon || 0}W/{tournament.stats.legsLost || 0}L
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Átlag:</span>
                            <span className="font-semibold">
                              {tournament.stats.average?.toFixed(1) || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>180-ak:</span>
                            <span className="font-semibold">
                              {tournament.stats.oneEightiesCount || 0}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
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
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {playerStats.matchHistory.map((match: any, index: number) => (
                <Card
                  key={index}
                  className={`${
                    match.won
                      ? 'border-green-500/20 bg-green-500/5'
                      : 'border-red-500/20 bg-red-500/5'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-medium">vs {match.opponent}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(match.date).toLocaleDateString('hu-HU')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {match.legs} legek
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className={`text-lg font-bold ${
                          match.won ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {match.player1Score} - {match.player2Score}
                        </div>
                        <div className="text-sm">
                          {match.won ? 'Győzelem' : 'Vereség'}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewLegs(match)}
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

