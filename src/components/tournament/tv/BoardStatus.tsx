import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { IconClock } from "@tabler/icons-react"

interface BoardStatusProps {
  tournament: any
}

const getPlayerName = (player: any) => {
  if (!player) return 'TBD'
  // Handle different player data structures
  if (player.playerId?.name) return player.playerId.name
  if (player.name) return player.name
  return 'TBD'
}

export default function BoardStatus({ tournament }: BoardStatusProps) {
  const boards = tournament?.boards || []

  // Only show waiting boards
  const waitingBoards = boards.filter((board: any) => board.status === 'waiting')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-warning/10 text-warning'
      default:
        return 'bg-muted/10 text-muted-foreground'
    }
  }

  return (
    <Card className="h-full bg-card/80 overflow-hidden shadow-none">
      <CardHeader className="pb-3 bg-muted/5">
        <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
          <IconClock className="h-6 w-6 text-warning" />
          Waiting Boards
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-y-auto h-[calc(100%-4rem)] p-3">
        {waitingBoards.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 text-lg">No boards waiting</p>
        ) : (
          <div className="space-y-2">
            {waitingBoards.map((board: any) => {
              const nextMatch = board.nextMatch
              const player1Name = getPlayerName(nextMatch?.player1)
              const player2Name = getPlayerName(nextMatch?.player2)

              return (
                <div
                  key={board.boardNumber}
                  className={`p-3 rounded-lg ${getStatusColor(board.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-foreground">Board {board.boardNumber}</span>
                  </div>
                  {nextMatch ? (
                    <div className="text-base font-medium text-foreground">
                      Waiting for: {player1Name} vs {player2Name}
                      {nextMatch.scorer?.name && (
                        <span className="text-muted-foreground ml-2">({nextMatch.scorer.name})</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No match assigned</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
