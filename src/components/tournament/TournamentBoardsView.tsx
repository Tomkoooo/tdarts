"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface TournamentBoardsViewProps {
  tournament: any
}

const statusMap: Record<
  string,
  {
    label: string
    badgeClass: string
    description: string
  }
> = {
  idle: {
    label: "Üres",
    badgeClass: "bg-muted text-muted-foreground",
    description: "Tábla készen áll a következő meccsre.",
  },
  waiting: {
    label: "Várakozik",
    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    description: "A következő mérkőzés előkészítés alatt.",
  },
  playing: {
    label: "Játékban",
    badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    description: "Aktív mérkőzés folyik ezen a táblán.",
  },
}

const getPlayerName = (player: any) => player?.playerId?.name || player?.name || "N/A"

export function TournamentBoardsView({ tournament }: TournamentBoardsViewProps) {
  const boards = tournament?.boards || []

  if (boards.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
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
          <Card key={board.boardNumber || idx} className="border-border bg-card/60">
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
              <p className="text-xs text-muted-foreground">{statusInfo.description}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {statusKey === "playing" && currentMatch ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Jelenlegi mérkőzés
                    </p>
                    {typeof board.boardNumber === 'number' && (
                      <span className="font-mono text-xs text-muted-foreground">#{board.boardNumber}</span>
                    )}
                  </div>
                  <p className="text-base font-semibold text-foreground">
                    {getPlayerName(currentMatch.player1)} vs {getPlayerName(currentMatch.player2)}
                  </p>
                  <p className="font-mono text-sm text-primary">
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
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Következő mérkőzés
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    {getPlayerName(nextMatch.player1)} vs {getPlayerName(nextMatch.player2)}
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
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default TournamentBoardsView 