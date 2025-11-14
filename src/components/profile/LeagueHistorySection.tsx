"use client"

import * as React from "react"
import Link from "next/link"
import { IconUsers, IconTrophy } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Skeleton } from "@/components/ui/skeleton"

interface LeagueHistorySectionProps {
  leagueHistory: any[]
  isLoading: boolean
  hasPlayer: boolean
}

export function LeagueHistorySection({
  leagueHistory,
  isLoading,
  hasPlayer,
}: LeagueHistorySectionProps) {
  if (!hasPlayer || leagueHistory.length === 0) {
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUsers className="w-5 h-5" />
            Liga részvétel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconUsers className="w-5 h-5" />
          Liga részvétel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {leagueHistory.map((league: any, index: number) => (
            <Link
              key={index}
              href={`/clubs/${league.clubId}?page=leagues&league=${league.leagueId}`}
              className="block"
            >
              <Card className="transition-all hover:shadow-lg hover:-translate-y-0.5 border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <IconTrophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="font-semibold text-sm truncate">
                          {league.leagueName}
                        </span>
                        <Badge variant="default" className="text-xs">
                          {league.clubName}
                        </Badge>
                      </div>

                      {league.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {league.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>
                          Pontszám:{' '}
                          <strong className="text-primary">
                            {league.totalPoints}
                          </strong>
                        </span>
                        <span>
                          Versenyek:{' '}
                          <strong>{league.tournamentsPlayed}</strong>
                        </span>
                        <span>
                          Pozíció:{' '}
                          <strong className="text-amber-500">
                            #{league.position}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                      <div>
                        {new Date(league.joinedAt).toLocaleDateString('hu-HU')}
                      </div>
                      {league.lastActivity && (
                        <div className="text-muted-foreground/60">
                          Utolsó: {new Date(league.lastActivity).toLocaleDateString('hu-HU')}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default LeagueHistorySection

