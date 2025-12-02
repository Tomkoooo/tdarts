import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { IconTarget } from "@tabler/icons-react"

interface GroupsDisplayProps {
  tournament: any
}



export default function GroupsDisplay({ tournament }: GroupsDisplayProps) {
  const groups = tournament.groups || []
  const knockout = tournament.knockout || []
  const tournamentStatus = tournament.tournamentSettings?.status || tournament.status
  const isKnockoutPhase = tournamentStatus === 'knockout'

  console.log('GroupsDisplay - Status:', tournamentStatus, 'Knockout length:', knockout.length, 'Groups length:', groups.length)


  if (isKnockoutPhase && knockout.length > 0) {
    const knockout = tournament.knockout || []
    if (!knockout.length) return null

    const totalRounds = knockout.length
    const finalRoundIndex = totalRounds - 1
    const finalRound = knockout[finalRoundIndex]
    const preliminaryRounds = knockout.slice(0, finalRoundIndex)

    console.log(knockout)

    // Helper component for compact match cards
    const CompactMatchCard = ({ match: matchWrapper, isFinal = false }: { match: any, isFinal?: boolean }) => {
      // Use matchReference if available (populated match doc), otherwise fall back to wrapper
      const match = matchWrapper.matchReference || matchWrapper
      
      if (!match) return <div className={`invisible ${isFinal ? 'w-72 h-36' : 'w-56 h-24'}`} />

      // Access player data from the match document structure
      // match.player1 is { playerId: PlayerDoc, legsWon: number }
      const p1Obj = match.player1
      const p2Obj = match.player2
      
      const player1 = p1Obj?.playerId
      const player2 = p2Obj?.playerId
      
      const player1Name = player1?.name || matchWrapper.player1?.name || 'TBD'
      const player2Name = player2?.name || matchWrapper.player2?.name || 'TBD'
      
      const p1Score = p1Obj?.legsWon ?? 0
      const p2Score = p2Obj?.legsWon ?? 0
      
      const scorerName = match.scorer?.name || (match.scorerSource?.type === 'match_loser' ? 'Előző vesztes' : 'TBD')
      
      // Status styling
      let statusClass = "border-l-4 border-muted"
      let bgClass = "bg-card/40"
      let headerClass = "bg-muted/20 text-muted-foreground"
      let statusText = ""
      
      if (match.status === 'ongoing') {
        statusClass = "border-l-4 border-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.2)]"
        bgClass = "bg-green-500/10"
        headerClass = "bg-green-500/20 text-green-400"
        statusText = "LIVE"
      } else if (match.status === 'finished') {
        // Check if it's a bye/walkover (one player missing and 0 score)
        const isBye = (!player1 || !player2) && (p1Score === 0 && p2Score === 0)
        
        if (isBye) {
           statusClass = "border-l-4 border-muted"
           bgClass = "bg-card/40"
           headerClass = "bg-muted/20 text-muted-foreground"
           statusText = "ELŐNYERŐ"
        } else {
           statusClass = "border-l-4 border-blue-500"
           bgClass = "bg-card/60"
           headerClass = "bg-blue-500/20 text-blue-400"
           statusText = "VÉGE"
        }
      } else {
        // Waiting status
        statusText = "VÁR"
        
        // If both players are present, show as ready/warning
        if (player1 && player2) {
          statusClass = "border-l-4 border-yellow-500"
          bgClass = "bg-yellow-500/5"
          headerClass = "bg-yellow-500/20 text-yellow-400"
        }
      }

      // Winner highlighting
      const p1Won = match.winnerId && (match.winnerId === player1?._id || match.winnerId === player1)
      const p2Won = match.winnerId && (match.winnerId === player2?._id || match.winnerId === player2)

      return (
        <div className={`flex flex-col justify-center ${isFinal ? 'w-72 h-36 text-base' : 'w-56 h-24 text-sm'} ${bgClass} ${statusClass} rounded-md shadow-sm overflow-hidden transition-all hover:scale-105 relative`}>
           {/* Header / Status */}
           <div className={`flex justify-between px-3 py-1 text-[10px] font-bold tracking-wider ${headerClass}`}>
              <span>{match.boardReference ? `TÁBLA ${match.boardReference}` : `#${match.matchNumber || ''}`}</span>
              <span className={match.status === 'ongoing' ? 'animate-pulse' : ''}>{statusText}</span>
           </div>
           
           <div className="flex-1 flex flex-col justify-center gap-1 py-1">
             {/* Player 1 */}
             <div className={`flex justify-between items-center px-3 py-0.5 ${p1Won ? 'font-bold text-green-400 bg-green-500/10' : ''}`}>
                <span className="truncate max-w-[80%]">{player1Name}</span>
                <span className={`font-mono font-bold ${p1Won ? 'text-green-400' : 'text-muted-foreground'}`}>{p1Score}</span>
             </div>
             
             {/* Player 2 */}
             <div className={`flex justify-between items-center px-3 py-0.5 ${p2Won ? 'font-bold text-green-400 bg-green-500/10' : ''}`}>
                <span className="truncate max-w-[80%]">{player2Name}</span>
                <span className={`font-mono font-bold ${p2Won ? 'text-green-400' : 'text-muted-foreground'}`}>{p2Score}</span>
             </div>
           </div>

           {/* Scorer Footer */}
           <div className="px-3 py-1 text-[10px] text-muted-foreground bg-black/10 flex items-center gap-1 truncate border-t border-white/5">
              <IconTarget className="w-3 h-3 opacity-70" />
              <span className="truncate font-medium">Író: {scorerName}</span>
           </div>
        </div>
      )
    }

    return (
      <Card className="h-full bg-card/95 overflow-hidden shadow-none border-none">
        <CardContent className="h-full p-6">
          <div className="flex w-full h-full">
             
             {/* LEFT BRACKET (Upper Half) */}
             <div className="flex-1 flex justify-end items-center">
                {preliminaryRounds.map((round: any, rIndex: number) => {
                   const matches = round.matches || []
                   const half = Math.ceil(matches.length / 2)
                   const leftMatches = matches.slice(0, half)
                   
                   return (
                      <div key={`left-${rIndex}`} className="flex flex-col justify-around h-full px-2">
                         {leftMatches.map((match: any, mIndex: number) => (
                            <CompactMatchCard key={mIndex} match={match} />
                         ))}
                      </div>
                   )
                })}
             </div>

             {/* CENTER (Final) */}
             <div className="flex flex-col justify-center items-center px-6 z-10">
                <div className="mb-2 text-xl font-bold text-yellow-500 tracking-widest uppercase drop-shadow-md">DÖNTŐ</div>
                {finalRound && finalRound.matches && (
                   <CompactMatchCard match={finalRound.matches[0]} isFinal={true} />
                )}
                <div className="mt-4 text-xs text-muted-foreground">
                   {tournament.name}
                </div>
             </div>

             {/* RIGHT BRACKET (Lower Half) */}
             <div className="flex-1 flex justify-start items-center">
                 {/* We reverse the rounds so the ones closest to Final are on the left (center of screen) */}
                 {[...preliminaryRounds].reverse().map((round: any, rIndex: number) => {
                    const matches = round.matches || []
                    const half = Math.ceil(matches.length / 2)
                    const rightMatches = matches.slice(half)
                    
                    return (
                       <div key={`right-${rIndex}`} className="flex flex-col justify-around h-full px-2">
                          {rightMatches.map((match: any, mIndex: number) => (
                             <CompactMatchCard key={mIndex} match={match} />
                          ))}
                       </div>
                    )
                 })}
             </div>

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
