"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/Button"
import { IconDeviceDesktop } from "@tabler/icons-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface TournamentBoardsViewProps {
  tournament: any
  userClubRole?: 'admin' | 'moderator' | 'member' | 'none'
}

const statusMap: Record<
  string,
  {
    label: string
    badgeClass: string
    description: string
    cardClass: string
    accentClass: string
    scoreClass: string
  }
> = {
  idle: {
    label: "Üres",
    badgeClass: "bg-muted/50 text-muted-foreground",
    description: "Tábla készen áll a következő meccsre.",
    cardClass: "bg-card/90",
    accentClass: "text-muted-foreground",
    scoreClass: "text-muted-foreground",
  },
  waiting: {
    label: "Várakozik",
    badgeClass: "bg-warning/15 text-warning",
    description: "A következő mérkőzés előkészítés alatt.",
    cardClass: "bg-gradient-to-br from-warning/10 via-card/90 to-card/95 ring-1 ring-warning/20",
    accentClass: "text-warning",
    scoreClass: "text-warning font-semibold",
  },
  playing: {
    label: "Játékban",
    badgeClass: "bg-success/15 text-success",
    description: "Aktív mérkőzés folyik ezen a táblán.",
    cardClass: "bg-gradient-to-br from-success/10 via-card/92 to-card ring-1 ring-success/25",
    accentClass: "text-success",
    scoreClass: "text-success font-bold",
  },
}

const getPlayerName = (player: any) => player?.playerId?.name || player?.name || "N/A"

export function TournamentBoardsView({ tournament }: TournamentBoardsViewProps) {
  const boards = tournament?.boards || []
  const tournamentId = tournament?.tournamentId
  const tournamentPassword = tournament?.tournamentSettings?.password

  if (boards.length === 0) {
    return (
      <Card className="bg-card/90 text-muted-foreground shadow-lg shadow-black/30">
        <CardContent className="py-12 text-center text-sm">
          Ehhez a tornához még nem hoztak létre táblákat.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {boards.map((board: any, idx: number) => {
        const statusKey = board.status || "idle"
        const statusInfo = statusMap[statusKey] || statusMap.idle

        const currentMatch = board.currentMatch
        const nextMatch = board.nextMatch

        return (
          <Card
            key={board.boardNumber || idx}
            className={cn("shadow-md shadow-black/25", statusInfo.cardClass)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg font-semibold text-foreground">
                  {board.name && board.name !== `Tábla ${board.boardNumber}`
                    ? board.name
                    : `Tábla ${board.boardNumber}`}
                </CardTitle>
                <Badge variant="outline" className={statusInfo.badgeClass}>
                  {statusInfo.label}
                </Badge>
              </div>
              <p className={cn("text-xs", statusInfo.accentClass)}>{statusInfo.description}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {statusKey === "playing" && currentMatch ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className={cn("text-xs font-semibold uppercase tracking-wide", statusInfo.accentClass)}>
                      Jelenlegi mérkőzés
                    </p>
                    {typeof board.boardNumber === 'number' && (
                      <span className="font-mono text-xs text-muted-foreground">#{board.boardNumber}</span>
                    )}
                  </div>
                  <p className="text-base font-semibold text-foreground">
                    <span className="font-semibold">{getPlayerName(currentMatch.player1)}</span>
                    <span className="mx-1 text-muted-foreground">vs</span>
                    <span className="font-semibold">{getPlayerName(currentMatch.player2)}</span>
                  </p>
                  <p className={cn("font-mono text-sm", statusInfo.scoreClass)}>
                    Állás: {currentMatch.player1?.legsWon ?? 0} - {currentMatch.player2?.legsWon ?? 0}
                  </p>
                  {currentMatch.scorer?.name && (
                    <p className="text-xs text-muted-foreground">
                      Eredményíró: {currentMatch.scorer.name}
                    </p>
                  )}
                </div>
              ) : statusKey === "waiting" && nextMatch ? (
                <div className="space-y-2">
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", statusInfo.accentClass)}>
                    Következő mérkőzés
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    <span>{getPlayerName(nextMatch.player1)}</span>
                    <span className="mx-1 text-muted-foreground">vs</span>
                    <span>{getPlayerName(nextMatch.player2)}</span>
                  </p>
                  {nextMatch.scorer?.name && (
                    <p className="text-xs text-muted-foreground">
                      Eredményíró: {nextMatch.scorer.name}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Nincs aktív mérkőzés információ.</p>
              )}

              <Separator className="my-2" />

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Utolsó frissítés</p>
                  <p>
                    {board.updatedAt
                      ? new Date(board.updatedAt).toLocaleTimeString('hu-HU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '–'}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Aktív mérkőzések száma</p>
                  <p>{board.matchesInQueue ?? 0}</p>
                </div>
              </div>

              {tournamentId && board.boardNumber && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    asChild
                  >
                    <Link
                      href={`/board/${tournamentId}?board=${board.boardNumber}${tournamentPassword ? `&password=${encodeURIComponent(tournamentPassword)}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <IconDeviceDesktop className="h-4 w-4" />
                      Tábla megnyitása
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default TournamentBoardsView 