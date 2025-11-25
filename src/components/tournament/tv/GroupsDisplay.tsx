import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { IconTarget, IconTrophy, IconClock } from "@tabler/icons-react"

interface GroupsDisplayProps {
  tournament: any
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'finished':
      return 'bg-success/20 border-l-4 border-l-success'
    case 'ongoing':
      return 'bg-primary/20 border-l-4 border-l-primary'
    case 'pending':
      return 'bg-warning/20 border-l-4 border-l-warning'
    default:
      return 'bg-muted/10'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'finished':
      return <IconTrophy className="h-3 w-3" />
    case 'ongoing':
      return <IconTarget className="h-3 w-3" />
    case 'pending':
      return <IconClock className="h-3 w-3" />
    default:
      return null
  }
}

export default function GroupsDisplay({ tournament }: GroupsDisplayProps) {
  const groups = tournament.groups || []
  const knockout = tournament.knockout || []
  const tournamentStatus = tournament.tournamentSettings?.status || tournament.status
  const isKnockoutPhase = tournamentStatus === 'knockout'

  console.log('GroupsDisplay - Status:', tournamentStatus, 'Knockout length:', knockout.length, 'Groups length:', groups.length)


  if (isKnockoutPhase && knockout.length > 0) {
    // Display only the latest round matches
    const latestRound = knockout[knockout.length - 1]
    
    return (
      <Card className="h-full bg-card/80 overflow-hidden shadow-none">
        <CardHeader className="pb-3 bg-muted/5">
          <CardTitle className="text-2xl font-bold text-foreground">
            {latestRound.roundName || `Round ${latestRound.round || knockout.length}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-y-auto h-[calc(100%-4.5rem)] p-4">
          <div className="flex flex-wrap gap-2 justify-around">{/* Changed from justify-between to justify-around */}
            {latestRound.matches?.map((match: any, matchIndex: number) => {
              const player1 = match.player1?.playerId || match.player1
              const player2 = match.player2?.playerId || match.player2
              const player1Name = player1?.name || match.player1Name || 'TBD'
              const player2Name = player2?.name || match.player2Name || 'TBD'
              const matchStatus = match.status || match.matchReference?.status || 'pending'
              const isFinished = matchStatus === 'finished'
              const winnerId = match.winnerId || match.matchReference?.winnerId
              const player1Id = player1?._id || player1
              const player2Id = player2?._id || player2
              const player1Won = winnerId && (winnerId.toString() === player1Id?.toString())
              const player2Won = winnerId && (winnerId.toString() === player2Id?.toString())
              
              // Get match details
              const boardNumber = match.matchReference?.boardReference
              const scorer = match.matchReference?.scorer?.name || match.scorer?.name
              const player1Legs = match.matchReference?.player1?.legsWon || match.player1?.legsWon || 0
              const player2Legs = match.matchReference?.player2?.legsWon || match.player2?.legsWon || 0

              return (
                <div
                  key={matchIndex}
                  className={`p-2 rounded-lg ${getStatusColor(matchStatus)} min-w-[10rem] max-w-[12rem] transition-all`}
                >
                  {/* Status badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      {getStatusIcon(matchStatus)}
                    </span>
                    {boardNumber && (
                      <span className="text-xs font-bold text-foreground bg-muted/20 px-2 py-0.5 rounded">
                        Board {boardNumber}
                      </span>
                    )}
                  </div>

                  {/* Players */}
                  <div className="space-y-1 mb-2">
                    <div className={`flex items-center text-base font-semibold ${
                      isFinished && player1Won ? 'text-success' : 'text-foreground'
                    }`}>
                      <span>{player1Name}</span>
                      <span className="ml-1 text-sm font-medium text-muted-foreground">{matchStatus !== 'pending' ? `(${player1Legs})` : ``}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">VS</div>
                    <div className={`flex items-center text-base font-semibold ${
                      isFinished && player2Won ? 'text-success' : 'text-foreground'
                    }`}>
                      <span>{player2Name}</span>
                      <span className="ml-1 text-sm font-medium text-muted-foreground">{matchStatus !== 'pending' ? `(${player2Legs})` : ``}</span>
                    </div>
                  </div>



                  {/* Scorer */}
                  {scorer && (
                      <div className="text-xs text-muted-foreground text-center truncate">
                        Scorer: {scorer}
                      </div>
                    )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Display groups - clean, non-interactive design with better spacing
  return (
    <Card className="h-full bg-card/80 overflow-hidden shadow-none">
      <CardHeader className="pb-3 bg-muted/5">
        <CardTitle className="text-2xl font-bold text-foreground">Group Standings</CardTitle>
      </CardHeader>
      <CardContent className="overflow-y-auto h-[calc(100%-4.5rem)] p-4">
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-xl">No groups created yet</p>
        ) : (
          <div className="flex flex-wrap gap-4 justify-around">{/* Added justify-around for better spacing */}
            {groups.map((group: any, groupIndex: number) => {
              const groupPlayers = tournament.tournamentPlayers
                ?.filter((player: any) => player.groupId === group._id)
                .sort((a: any, b: any) => (a.groupStanding || 0) - (b.groupStanding || 0)) || []

              return (
                <div
                  key={group._id}
                  className="p-3 rounded-lg bg-muted/10 border border-muted/20 min-w-[14rem] max-w-[16rem] flex flex-col shadow-sm"
                >
                  {/* Header - simplified, no buttons */}
                  <div className="mb-3 pb-2 border-b border-muted/30">
                    <h3 className="text-lg font-bold text-primary">
                      Csoport {groupIndex + 1}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Tábla {group.board || groupIndex + 1}
                    </span>
                  </div>

                  {/* Players - always visible, better spacing */}
                  <div className="flex-1 space-y-2">{/* Increased spacing from mb-1 to space-y-2 */}
                    {groupPlayers.map((player: any, index: number) => {
                      const stats = player.stats || {}
                      const points = (stats.matchesWon || 0) * 2
                      const legs = stats.legsWon || 0
                      return (
                        <div 
                          key={player._id} 
                          className="flex items-center justify-between text-sm py-1.5 border-b border-muted/10 last:border-0"
                        >{/* Added border-b for better row separation */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold text-sm min-w-[1.5rem] ${
                                index === 0
                                  ? "text-primary"
                                  : index === 1
                                  ? "text-muted-foreground"
                                  : "text-muted-foreground/60"
                              }`}
                            >
                              {player.groupStanding || index + 1}.
                            </span>
                            <span className="text-foreground font-medium truncate">
                              {player.playerReference?.name || "Unknown"}
                            </span>
                            {legs > 0 && (
                              <span className="text-xs text-muted-foreground">({legs})</span>
                            )}
                          </div>
                          <span className="text-muted-foreground font-semibold text-xs">{points}p</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
